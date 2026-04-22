'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

interface Props {
  modelUrl: string
  jobId: string
  onSvgReady: (svg: string) => void
}

// Generates a silhouette SVG from a Three.js scene using edge detection on a render
export default function VectorPreview({ modelUrl, jobId, onSvgReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'loading' | 'generating' | 'done' | 'error'>('loading')
  const [svgData, setSvgData] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    generateSVG()
    return () => { cancelled = true }

    async function generateSVG() {
      try {
        setStatus('generating')

        // Load model into an offscreen Three.js scene
        const width = 800
        const height = 800

        const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current!, antialias: true, preserveDrawingBuffer: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(1)

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xffffff)

        const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100)
        camera.position.set(0, 0.3, 3)
        camera.lookAt(0, 0, 0)

        scene.add(new THREE.AmbientLight(0xffffff, 1))
        const dir = new THREE.DirectionalLight(0x000000, 0)
        scene.add(dir)

        const loader = new GLTFLoader()
        await new Promise<void>((resolve, reject) => {
          loader.load(modelUrl, (gltf) => {
            const model = gltf.scene
            const box = new THREE.Box3().setFromObject(model)
            const center = box.getCenter(new THREE.Vector3())
            const size = box.getSize(new THREE.Vector3())
            const maxDim = Math.max(size.x, size.y, size.z)
            const scale = 2 / maxDim
            model.position.sub(center.multiplyScalar(scale))
            model.scale.setScalar(scale)

            // Make everything black for silhouette
            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0x000000 })
              }
            })

            scene.add(model)
            resolve()
          }, undefined, reject)
        })

        if (cancelled) { renderer.dispose(); return }

        // Render silhouette
        renderer.render(scene, camera)

        // Get pixel data
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        const imageData = ctx.getImageData(0, 0, width, height)

        // Simple edge detection: find boundary pixels (black pixels adjacent to white)
        const edges = detectEdges(imageData.data, width, height)

        // Convert edge pixels to SVG paths using potrace-style tracing
        const svg = edgesToSVG(edges, width, height)

        if (cancelled) { renderer.dispose(); return }

        setSvgData(svg)
        setStatus('done')
        onSvgReady(svg)

        // Save SVG to job record
        await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, svgData: svg }),
        })

        renderer.dispose()
      } catch (err) {
        console.error('SVG generation error:', err)
        setStatus('error')
      }
    }
  }, [modelUrl, jobId, onSvgReady])

  return (
    <div className="w-full">
      {/* Hidden canvas used for rendering */}
      <canvas ref={canvasRef} width={800} height={800} className="hidden" />

      {status === 'generating' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-amber-700">Generating SVG outline…</p>
        </div>
      )}

      {status === 'done' && svgData && (
        <div className="relative bg-white rounded-2xl p-4 border-2 border-amber-200">
          <div
            className="w-full"
            style={{ aspectRatio: '1' }}
            dangerouslySetInnerHTML={{ __html: svgData }}
          />
          <p className="text-xs text-center text-amber-600 mt-2">
            Laser-cutter ready SVG — tap Download below
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center text-red-600 py-8">
          <p>SVG generation failed.</p>
          <p className="text-sm text-red-400 mt-1">Try reloading the page.</p>
        </div>
      )}
    </div>
  )
}

// --- Helpers ---

function detectEdges(pixels: Uint8ClampedArray, w: number, h: number): boolean[] {
  const edges = new Array(w * h).fill(false)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      const isSolid = pixels[i] < 128 // black pixel
      if (!isSolid) continue
      // Check if any 4-connected neighbour is white
      const top = (((y - 1) * w + x) * 4)
      const bot = (((y + 1) * w + x) * 4)
      const lft = ((y * w + (x - 1)) * 4)
      const rgt = ((y * w + (x + 1)) * 4)
      if (pixels[top] > 128 || pixels[bot] > 128 || pixels[lft] > 128 || pixels[rgt] > 128) {
        edges[y * w + x] = true
      }
    }
  }
  return edges
}

function edgesToSVG(edges: boolean[], w: number, h: number): string {
  // Convert edge pixel map to SVG polyline paths
  // Scale to a 200×200 viewport for laser cutting
  const scale = 200 / w
  const points: string[] = []

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edges[y * w + x]) {
        points.push(`${(x * scale).toFixed(2)},${(y * scale).toFixed(2)}`)
      }
    }
  }

  // Group consecutive edge pixels into short polylines
  const paths: string[] = []
  let current: string[] = []

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edges[y * w + x]) {
        current.push(`${(x * scale).toFixed(2)},${(y * scale).toFixed(2)}`)
      } else if (current.length > 1) {
        paths.push(`<polyline points="${current.join(' ')}" />`)
        current = []
      } else {
        current = []
      }
    }
  }

  if (current.length > 1) paths.push(`<polyline points="${current.join(' ')}" />`)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <g fill="none" stroke="#000" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round">
    ${paths.join('\n    ')}
  </g>
</svg>`
}

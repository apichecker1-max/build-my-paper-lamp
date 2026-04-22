'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

interface Props {
  modelUrl: string
  jobId: string
  onSvgReady: (svg: string) => void
}

export default function VectorPreview({ modelUrl, jobId, onSvgReady }: Props) {
  const [status, setStatus] = useState<'loading' | 'generating' | 'done' | 'error'>('loading')
  const [svgData, setSvgData] = useState<string | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    generateSVG()

    async function generateSVG() {
      try {
        setStatus('generating')

        const W = 512
        const H = 512

        // Offscreen WebGL canvas — Three.js owns this
        const glCanvas = document.createElement('canvas')
        glCanvas.width = W
        glCanvas.height = H

        const renderer = new THREE.WebGLRenderer({
          canvas: glCanvas,
          antialias: true,
          preserveDrawingBuffer: true,
        })
        renderer.setSize(W, H)
        renderer.setPixelRatio(1)

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xffffff)
        scene.add(new THREE.AmbientLight(0xffffff, 1))

        const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100)
        camera.position.set(0, 0.3, 3)
        camera.lookAt(0, 0, 0)

        const loader = new GLTFLoader()
        await new Promise<void>((resolve, reject) => {
          loader.load(
            modelUrl,
            (gltf) => {
              const model = gltf.scene
              const box = new THREE.Box3().setFromObject(model)
              const center = box.getCenter(new THREE.Vector3())
              const size = box.getSize(new THREE.Vector3())
              const scale = 2 / Math.max(size.x, size.y, size.z)
              model.position.sub(center.multiplyScalar(scale))
              model.scale.setScalar(scale)
              model.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  ;(child as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0x111111 })
                }
              })
              scene.add(model)
              resolve()
            },
            undefined,
            reject
          )
        })

        renderer.render(scene, camera)

        // Copy WebGL pixels to a 2D canvas for getImageData
        const read2D = document.createElement('canvas')
        read2D.width = W
        read2D.height = H
        const ctx2d = read2D.getContext('2d')!
        ctx2d.drawImage(glCanvas, 0, 0)
        const imageData = ctx2d.getImageData(0, 0, W, H)

        renderer.dispose()

        const edges = detectEdges(imageData.data, W, H)
        const svg = edgesToSVG(edges, W, H)

        setSvgData(svg)
        setStatus('done')
        onSvgReady(svg)

        // Persist SVG to job record
        await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, svgData: svg }),
        })
      } catch (err) {
        console.error('SVG generation error:', err)
        setStatus('error')
      }
    }
  }, [modelUrl, jobId, onSvgReady])

  return (
    <div className="w-full">
      {status === 'generating' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-amber-700">Generating SVG outline…</p>
        </div>
      )}

      {status === 'done' && svgData && (
        <div className="bg-white rounded-2xl p-4 border-2 border-amber-200">
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

function detectEdges(pixels: Uint8ClampedArray, w: number, h: number): boolean[] {
  const edges = new Array(w * h).fill(false)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      if (pixels[i] > 128) continue // white pixel — skip
      const top = ((y - 1) * w + x) * 4
      const bot = ((y + 1) * w + x) * 4
      const lft = (y * w + (x - 1)) * 4
      const rgt = (y * w + (x + 1)) * 4
      if (pixels[top] > 128 || pixels[bot] > 128 || pixels[lft] > 128 || pixels[rgt] > 128) {
        edges[y * w + x] = true
      }
    }
  }
  return edges
}

function edgesToSVG(edges: boolean[], w: number, h: number): string {
  const scale = 200 / w
  const paths: string[] = []
  let run: string[] = []

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edges[y * w + x]) {
        run.push(`${(x * scale).toFixed(1)},${(y * scale).toFixed(1)}`)
      } else {
        if (run.length > 1) paths.push(`<polyline points="${run.join(' ')}" />`)
        run = []
      }
    }
    if (run.length > 1) paths.push(`<polyline points="${run.join(' ')}" />`)
    run = []
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <g fill="none" stroke="#000" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round">
    ${paths.join('\n    ')}
  </g>
</svg>`
}

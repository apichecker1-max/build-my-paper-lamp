'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

interface Props {
  modelUrl: string
  className?: string
}

export default function ModelViewer({ modelUrl, className = '' }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const width = el.clientWidth
    const height = el.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)
    scene.fog = new THREE.FogExp2(0x1a1a2e, 0.15)

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 100)
    camera.position.set(0, 0.5, 3)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    el.appendChild(renderer.domElement)

    // Lights — tuned for flat-shaded facets
    scene.add(new THREE.AmbientLight(0xfff8e7, 0.7))
    const dir = new THREE.DirectionalLight(0xffd580, 1.4)
    dir.position.set(3, 5, 3)
    scene.add(dir)
    const fill = new THREE.DirectionalLight(0xffecd2, 0.4)
    fill.position.set(-3, 2, -2)
    scene.add(fill)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.5
    controls.minDistance = 0.5
    controls.maxDistance = 10

    // Grid
    const grid = new THREE.GridHelper(4, 20, 0x333355, 0x222244)
    grid.position.y = -1
    scene.add(grid)

    // Load model
    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene

        // Center + normalize
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 2 / maxDim
        model.position.sub(center.multiplyScalar(scale))
        model.scale.setScalar(scale)

        // Apply flat-shaded paper material + edge lines to every mesh
        model.traverse((child) => {
          const mesh = child as THREE.Mesh
          if (!mesh.isMesh) return

          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xf5c842,
            flatShading: true,
            roughness: 0.85,
            metalness: 0.0,
          })

          // Edge lines — only show creases ≥ 20° so minor tessellation noise is hidden
          const edges = new THREE.EdgesGeometry(mesh.geometry, 20)
          const edgeMat = new THREE.LineBasicMaterial({ color: 0x7a4a1e })
          mesh.add(new THREE.LineSegments(edges, edgeMat))
        })

        scene.add(model)
      },
      undefined,
      (err) => console.error('Model load error:', err)
    )

    // Resize
    const onResize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // Animate
    let rafId: number
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [modelUrl])

  return (
    <div ref={mountRef} className={`w-full h-64 rounded-2xl overflow-hidden ${className}`} />
  )
}

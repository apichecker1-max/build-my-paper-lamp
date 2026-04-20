import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildWireframe } from '../utils/wireframe.js'

export default function Viewer3D({ lines }) {
  const mountRef = useRef(null)

  useEffect(() => {
    if (!lines?.length || !mountRef.current) return
    const mount = mountRef.current
    let width = mount.clientWidth
    let height = mount.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    scene.fog = new THREE.Fog(0x0a0a0a, 10, 25)

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 100)
    camera.position.set(0, 0.2, 3.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = true
    controls.autoRotateSpeed = 1.2
    controls.minDistance = 1
    controls.maxDistance = 12

    const gridHelper = new THREE.GridHelper(8, 40, 0x1a1a1a, 0x1a1a1a)
    gridHelper.position.y = -1.2
    scene.add(gridHelper)

    const positions = buildWireframe(lines)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.9,
    })
    const mesh = new THREE.LineSegments(geometry, material)
    scene.add(mesh)

    const glow = new THREE.PointLight(0xfbbf24, 0.8, 6)
    glow.position.set(0, 0, 2)
    scene.add(glow)

    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      width = mount.clientWidth
      height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [lines])

  return <div ref={mountRef} className="w-full h-full" />
}

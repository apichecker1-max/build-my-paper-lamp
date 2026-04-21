import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

export default function Viewer3D({ lines, onReset, previews, threshold, onThreshold, templateInfo }) {
  const mountRef = useRef()

  useEffect(() => {
    const el = mountRef.current, w = el.clientWidth, h = el.clientHeight
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x09090b, 0.18)
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.01, 50)
    camera.position.set(0, 0.2, 3.5)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setClearColor(0x09090b)
    el.appendChild(renderer.domElement)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.9

    const pos = new Float32Array(lines.length * 6)
    lines.forEach((s, i) => pos.set(s, i * 6))
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xfbbf24 })))

    const grid = new THREE.GridHelper(6, 20, 0x27272a, 0x18181b)
    grid.position.y = -1.2
    scene.add(grid)

    let raf
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera) }
    animate()
    const onResize = () => { const w = el.clientWidth, h = el.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h) }
    window.addEventListener("resize", onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); geo.dispose(); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement) }
  }, [lines])

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-zinc-950/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2C8 2 5 5 5 9c0 2.4 1 4.5 2.6 6H16.4C18 13.5 19 11.4 19 9c0-4-3-7-7-7z"/></svg>
          </div>
          <span className="text-xs font-semibold text-zinc-300 tracking-wide">
            {templateInfo ? templateInfo.template.toUpperCase() + ' LAMP' : 'LAMP WIREFRAME'}
          </span>
          {templateInfo && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-400/15 border border-amber-400/30 text-amber-400 tracking-wide">AI</span>
          )}
        </div>
        <button onClick={onReset} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors duration-150 backdrop-blur-sm">
          Try another photo
        </button>
      </div>

      {/* Threshold slider */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 items-end">
        <label className="text-[10px] text-zinc-500 tracking-wide">BG THRESHOLD <span className="text-zinc-400 font-medium">{threshold}</span></label>
        <input
          type="range" min="0" max="100" step="1" value={threshold}
          onChange={e => onThreshold(Number(e.target.value))}
          className="w-32 h-1.5 appearance-none rounded-full bg-zinc-700 accent-amber-400 cursor-pointer"
        />
      </div>

      {/* Previews */}
      {previews?.length > 0 && (
        <div className="absolute bottom-5 left-5 flex gap-2">
          {previews.map((url, i) => (
            <div key={i}>
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-700/60 bg-zinc-900 shadow-xl">
                <img src={url} alt={`photo ${i + 1}`} className="w-full h-full object-cover opacity-70" />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="absolute bottom-16 right-5 text-[10px] text-zinc-600 text-right leading-relaxed">drag to rotate<br />scroll to zoom</p>
    </div>
  )
}

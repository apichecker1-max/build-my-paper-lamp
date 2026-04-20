import { useState } from "react"
import DropZone from "./components/DropZone"
import ProcessingView from "./components/ProcessingView"
import Viewer3D from "./components/Viewer3D"
import { processImage } from "./lib/imageProcess"
import { buildWireframe } from "./lib/wireframe"

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = reject
    img.src = url
  })
}

function extractLines(imgs, threshold) {
  const contours = []
  for (const img of imgs) {
    const c = processImage(img, threshold)
    if (c.length) contours.push(...c)
  }
  return contours.length ? buildWireframe(contours) : null
}

export default function App() {
  const [state, setState] = useState("idle")
  const [lines, setLines] = useState(null)
  const [previews, setPreviews] = useState([])
  const [error, setError] = useState(null)
  const [threshold, setThreshold] = useState(30)
  const [loadedImgs, setLoadedImgs] = useState([])

  async function handleFiles(files) {
    setError(null)
    setState("processing")
    try {
      const loaded = await Promise.all(files.map(loadImage))
      const imgs = loaded.map(l => l.img)
      const urls = loaded.map(l => l.url)
      previews.forEach(URL.revokeObjectURL)
      setPreviews(urls)
      setLoadedImgs(imgs)
      const result = extractLines(imgs, threshold)
      if (!result) {
        setError("No clear outline found — try photos with a plain background.")
        setState("idle")
        return
      }
      setLines(result)
      setState("result")
    } catch {
      setError("Could not load image.")
      setState("idle")
    }
  }

  function handleThreshold(t) {
    setThreshold(t)
    if (!loadedImgs.length) return
    const result = extractLines(loadedImgs, t)
    if (result) setLines(result)
  }

  function reset() {
    setState("idle")
    setLines(null)
    previews.forEach(URL.revokeObjectURL)
    setPreviews([])
    setLoadedImgs([])
    setError(null)
  }

  return (
    <div className="h-full flex flex-col">
      {error && state === "idle" && (
        <div className="mx-auto mt-4 w-full max-w-md px-4">
          <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        </div>
      )}
      <div className="flex-1">
        {state === "idle" && <DropZone onFiles={handleFiles} />}
        {state === "processing" && <ProcessingView />}
        {state === "result" && (
          <Viewer3D
            lines={lines}
            onReset={reset}
            previews={previews}
            threshold={threshold}
            onThreshold={handleThreshold}
          />
        )}
      </div>
    </div>
  )
}

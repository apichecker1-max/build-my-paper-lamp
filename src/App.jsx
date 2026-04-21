import { useState } from "react"
import DropZone from "./components/DropZone"
import ProcessingView from "./components/ProcessingView"
import Viewer3D from "./components/Viewer3D"
import { processImage } from "./lib/imageProcess"
import { buildWireframe } from "./lib/wireframe"
import { analyzeWithClaude } from "./lib/claudeApi"

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ img, url })
    img.onerror = reject
    img.src = url
  })
}

function extractLines(imgs, threshold, bboxes = null) {
  const contours = []
  for (let i = 0; i < imgs.length; i++) {
    const c = processImage(imgs[i], threshold, bboxes ? bboxes[i] : null)
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
  const [bboxes, setBboxes] = useState(null)
  const [processingStatus, setProcessingStatus] = useState("")
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("anthropic-api-key") || "")
  const [aiUsed, setAiUsed] = useState(false)

  function handleApiKeyChange(key) {
    setApiKey(key)
    localStorage.setItem("anthropic-api-key", key)
  }

  async function handleSubmit(files, description) {
    setError(null)
    setState("processing")
    setAiUsed(false)

    try {
      setProcessingStatus("Loading images…")
      const loaded = await Promise.all(files.map(loadImage))
      const imgs = loaded.map(l => l.img)
      const urls = loaded.map(l => l.url)
      previews.forEach(URL.revokeObjectURL)
      setPreviews(urls)
      setLoadedImgs(imgs)

      let newBboxes = null
      if (apiKey && description.trim()) {
        try {
          setProcessingStatus("Asking Claude to locate the subject…")
          newBboxes = await Promise.all(files.map(f => analyzeWithClaude(f, description, apiKey)))
          setAiUsed(true)
        } catch (e) {
          console.warn("Claude API failed, falling back:", e.message)
        }
      }

      setBboxes(newBboxes)
      setProcessingStatus("Extracting outline…")
      const result = extractLines(imgs, threshold, newBboxes)
      if (!result) {
        setError("No clear outline found — try adjusting the threshold slider, or add a description with an API key.")
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
    const result = extractLines(loadedImgs, t, bboxes)
    if (result) setLines(result)
  }

  function reset() {
    setState("idle")
    setLines(null)
    previews.forEach(URL.revokeObjectURL)
    setPreviews([])
    setLoadedImgs([])
    setBboxes(null)
    setError(null)
    setAiUsed(false)
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
        {state === "idle" && (
          <DropZone
            onSubmit={handleSubmit}
            apiKey={apiKey}
            onApiKeyChange={handleApiKeyChange}
          />
        )}
        {state === "processing" && <ProcessingView status={processingStatus} />}
        {state === "result" && (
          <Viewer3D
            lines={lines}
            onReset={reset}
            previews={previews}
            threshold={threshold}
            onThreshold={handleThreshold}
            aiUsed={aiUsed}
          />
        )}
      </div>
    </div>
  )
}

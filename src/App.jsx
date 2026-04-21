import { useState } from "react"
import DropZone from "./components/DropZone"
import ProcessingView from "./components/ProcessingView"
import Viewer3D from "./components/Viewer3D"
import { processImage } from "./lib/imageProcess"
import { buildWireframe } from "./lib/wireframe"
import { analyzeWithClaude } from "./lib/claudeApi"
import { buildFromTemplate } from "./lib/templates/index.js"

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
  const [processingStatus, setProcessingStatus] = useState("")
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("anthropic-api-key") || "")
  const [templateInfo, setTemplateInfo] = useState(null)  // { template, params }

  function handleApiKeyChange(key) {
    setApiKey(key)
    localStorage.setItem("anthropic-api-key", key)
  }

  async function handleSubmit(files, description) {
    setError(null)
    setState("processing")
    setTemplateInfo(null)

    try {
      setProcessingStatus("Loading images…")
      const loaded = await Promise.all(files.map(loadImage))
      const imgs = loaded.map(l => l.img)
      const urls = loaded.map(l => l.url)
      previews.forEach(URL.revokeObjectURL)
      setPreviews(urls)
      setLoadedImgs(imgs)

      // Path A: Claude Vision → template + params → wireframe
      if (apiKey) {
        try {
          setProcessingStatus("Asking Claude to identify the subject…")
          const result = await analyzeWithClaude(files[0], description, apiKey)
          setTemplateInfo(result)
          setProcessingStatus(`Building ${result.template} wireframe…`)
          const templateLines = buildFromTemplate(result.template, result.params)
          if (templateLines.length) {
            setLines(templateLines)
            setState("result")
            return
          }
        } catch (e) {
          setError(`Claude API error: ${e.message}`)
          setState("idle")
          return
        }
      }

      // Path B: image edge extraction fallback (no API key or Claude failed)
      setProcessingStatus("Extracting outline from image…")
      const result = extractLines(imgs, threshold)
      if (!result) {
        setError("No clear outline found — add an Anthropic API key and description for best results.")
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
    // Only affects fallback image-extraction path; re-run if no template
    if (!loadedImgs.length || templateInfo) return
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
    setTemplateInfo(null)
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
            templateInfo={templateInfo}
          />
        )}
      </div>
    </div>
  )
}

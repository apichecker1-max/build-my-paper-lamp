import { useRef, useState, useEffect } from "react"

export default function DropZone({ onSubmit, apiKey, onApiKeyChange }) {
  const ref = useRef()
  const [drag, setDrag] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])
  const [description, setDescription] = useState("")
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const urls = pendingFiles.map(f => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [pendingFiles])

  function addFiles(fileList) {
    const valid = Array.from(fileList).filter(f => f.type.startsWith("image/"))
    if (valid.length) setPendingFiles(valid)
  }

  function handleSubmit() {
    if (pendingFiles.length) onSubmit(pendingFiles, description)
  }

  // — Staged view (files selected) —
  if (pendingFiles.length > 0) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">

          {/* Thumbnails row */}
          <div className="flex gap-3 mb-6 flex-wrap">
            {previewUrls.map((url, i) => (
              <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-900 shadow-lg">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <button
              onClick={() => ref.current.click()}
              className="w-20 h-20 rounded-xl border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600 hover:border-amber-400/50 hover:text-amber-400/60 transition-colors"
              title="Add more photos"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>

          {/* Description */}
          <label className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase block mb-2">
            Describe the photo
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={"e.g. \"Golden retriever sitting on grass, photographed from the side, full body visible\""}
            rows={3}
            className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none mb-1.5"
          />
          {apiKey
            ? <p className="text-[10px] text-amber-400/60 mb-5">Claude will use this to find the subject precisely</p>
            : <p className="text-[10px] text-zinc-600 mb-5">Add an Anthropic API key below for AI-guided extraction</p>
          }

          {/* API key settings */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors mb-2"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            {apiKey ? "AI extraction enabled" : "Enable AI extraction (Anthropic API key)"}
            <span className="ml-0.5">{showSettings ? "▲" : "▼"}</span>
          </button>
          {showSettings && (
            <div className="mb-5">
              <input
                type="password"
                value={apiKey}
                onChange={e => onApiKeyChange(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 font-mono"
              />
              <p className="mt-1.5 text-[10px] text-zinc-600">Stored in your browser only — never sent to our servers.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-xl bg-amber-400 text-zinc-900 text-sm font-semibold hover:bg-amber-300 active:bg-amber-500 transition-colors"
            >
              Generate Wireframe
            </button>
            <button
              onClick={() => { setPendingFiles([]); setDescription("") }}
              className="px-4 py-3 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <input ref={ref} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = "" }} />
      </div>
    )
  }

  // — Empty drop zone —
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-16">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2C8 2 5 5 5 9c0 2.4 1 4.5 2.6 6H16.4C18 13.5 19 11.4 19 9c0-4-3-7-7-7z"/></svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Build My Paper Lamp</h1>
          <p className="mt-1 text-sm text-zinc-400">Upload photos — get a 3D printable lamp wireframe</p>
        </div>
      </div>
      <div
        className={"relative w-full max-w-md rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 group " + (drag ? "border-amber-400 bg-amber-400/5 scale-[1.01]" : "border-zinc-700 bg-zinc-900/50 hover:border-amber-400/60 hover:bg-amber-400/[0.03]")}
        onClick={() => ref.current.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
      >
        <div className="px-8 py-14 flex flex-col items-center gap-4 text-center">
          <div className={"w-14 h-14 rounded-full border flex items-center justify-center transition-colors duration-200 " + (drag ? "border-amber-400 bg-amber-400/10" : "border-zinc-700 group-hover:border-amber-400/50")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={drag ? "#fbbf24" : "#71717a"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">{drag ? "Drop them!" : "Drop photos here"}</p>
            <p className="mt-1 text-xs text-zinc-500">or <span className="text-amber-400 underline underline-offset-2">click to browse</span></p>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed max-w-xs">Works best on plain backgrounds. Upload multiple angles for a richer 3D shape.</p>
        </div>
        <input ref={ref} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = "" }} />
      </div>
      <p className="mt-8 text-xs text-zinc-600">Everything runs in your browser — no uploads to any server.</p>
    </div>
  )
}

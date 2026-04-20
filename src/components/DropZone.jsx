import { useRef, useState } from "react"

export default function DropZone({ onFiles }) {
  const ref = useRef()
  const [drag, setDrag] = useState(false)

  function handle(fileList) {
    const valid = Array.from(fileList).filter(f => f.type.startsWith("image/"))
    if (valid.length) onFiles(valid)
  }

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
        onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files) }}
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
        <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={e => { handle(e.target.files); e.target.value = "" }} />
      </div>
      <p className="mt-8 text-xs text-zinc-600">Everything runs in your browser — no uploads to any server.</p>
    </div>
  )
}

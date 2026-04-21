export default function ProcessingView({ status }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-5">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-zinc-800"/>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 animate-spin"/>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-200">{status || "Extracting outline…"}</p>
        <p className="mt-1 text-xs text-zinc-500">Building your 3D lamp wireframe</p>
      </div>
    </div>
  )
}

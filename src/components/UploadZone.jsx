import { useCallback, useState } from 'react'

export default function UploadZone({ onFile }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragging(false), [])

  const handleChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) onFile(file)
  }, [onFile])

  return (
    <label
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative block w-full rounded-2xl border-2 border-dashed cursor-pointer
        transition-all duration-200 py-16 px-8
        ${
          dragging
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-neutral-700 hover:border-neutral-500 bg-neutral-900/50 hover:bg-neutral-800/50'
        }
      `}
    >
      <input type="file" accept="image/*" onChange={handleChange} className="sr-only" />
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
          dragging ? 'bg-amber-500/20' : 'bg-neutral-800'
        }`}>
          <svg
            className={`w-6 h-6 transition-colors ${dragging ? 'text-amber-400' : 'text-neutral-400'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <div>
          <p className="text-white font-medium">
            {dragging ? 'Drop it here' : 'Drop a photo here'}
          </p>
          <p className="text-neutral-500 text-sm mt-1">
            or <span className="text-amber-500 underline">click to browse</span>
          </p>
        </div>
        <p className="text-neutral-600 text-xs">JPG, PNG, WebP</p>
      </div>
    </label>
  )
}

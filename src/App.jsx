import { useState, useCallback } from 'react'
import UploadZone from './components/UploadZone.jsx'
import Viewer3D from './components/Viewer3D.jsx'
import { processImage } from './utils/edgeDetection.js'

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-amber-500">
        <path d="M12 2L6 10h12L12 2z" strokeLinejoin="round" />
        <path d="M9 10v7" />
        <path d="M15 10v7" />
        <path d="M7 17h10" />
        <path d="M12 17v4" />
      </svg>
      <span className="text-white font-medium text-sm tracking-wide">Paper Lamp</span>
    </div>
  )
}

export default function App() {
  const [phase, setPhase] = useState('upload')
  const [lines, setLines] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [error, setError] = useState(null)

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    setError(null)
    setPhase('processing')
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    const img = new Image()
    img.onload = () => {
      try {
        const result = processImage(img)
        if (result.length === 0) {
          setError('No edges detected. Try a photo with a clear subject on a contrasting background.')
          setPhase('upload')
          return
        }
        setLines(result)
        setPhase('viewer')
      } catch {
        setError('Failed to process image. Please try another photo.')
        setPhase('upload')
      }
    }
    img.onerror = () => {
      setError('Could not load image.')
      setPhase('upload')
    }
    img.src = url
  }, [])

  const reset = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setPhase('upload')
    setLines(null)
    setImageUrl(null)
    setError(null)
  }, [imageUrl])

  if (phase === 'viewer' && lines) {
    return (
      <div className="w-screen h-screen bg-neutral-950 relative">
        <Viewer3D lines={lines} />
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <Logo />
          <button
            onClick={reset}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg border border-neutral-700 transition-colors"
          >
            ← Try another photo
          </button>
        </div>
        {imageUrl && (
          <div className="absolute bottom-4 left-4 w-20 h-20 rounded-lg overflow-hidden border border-neutral-700 opacity-50 hover:opacity-90 transition-opacity">
            <img src={imageUrl} alt="Original" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-neutral-600 text-xs pointer-events-none">
          Drag to rotate · Scroll to zoom
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen bg-neutral-950 flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-neutral-800">
        <Logo />
        <span className="text-xs text-neutral-500 font-medium uppercase tracking-widest">MVP</span>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
        <div className="max-w-lg w-full text-center space-y-6 py-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-light text-white tracking-tight">
              Your photo,{' '}
              <span className="text-amber-500">as a lamp</span>
            </h1>
            <p className="text-neutral-400 text-base">
              Upload any photo. We trace its outline and render a 3D wireframe lamp you can hold in your hands.
            </p>
          </div>
          {phase === 'processing' ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-neutral-400 text-sm">Tracing edges…</p>
            </div>
          ) : (
            <UploadZone onFile={handleFile} />
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-neutral-600 text-xs">
            Works best with clear subjects on plain backgrounds — birds, pets, portraits, objects
          </p>
        </div>
      </main>
      <footer className="px-8 py-4 border-t border-neutral-800 flex items-center justify-center">
        <p className="text-neutral-600 text-xs">Build My Paper Lamp · MVP</p>
      </footer>
    </div>
  )
}

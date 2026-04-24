'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Camera from '@/components/Camera'
import PhotoGallery from '@/components/PhotoGallery'
import { CapturedPhoto } from '@/types'

const MIN_PHOTOS = 15

export default function CapturePage() {
  const router = useRouter()
  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }, [])

  async function handleProcess() {
    if (photos.length < MIN_PHOTOS) return
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      photos.forEach((p, i) => formData.append('photos', p.blob, `photo_${i}.jpg`))

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Upload failed')
      }
      const data = await res.json()

      if (data.demo) {
        router.push(`/processing?jobId=${data.jobId}&demo=true`)
      } else {
        router.push(`/processing?jobId=${data.jobId}&projectId=${encodeURIComponent(data.projectId)}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setUploading(false)
    }
  }

  const ready = photos.length >= MIN_PHOTOS

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-6 max-w-sm mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <a href="/" className="text-amber-600 text-2xl leading-none">←</a>
        <div>
          <h1 className="text-lg font-bold text-amber-900">Capture Photos</h1>
          <p className="text-xs text-amber-600">Walk around your object — all angles</p>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex justify-between text-xs text-amber-700 mb-1">
          <span>{photos.length} photos</span>
          <span>Need at least {MIN_PHOTOS}</span>
        </div>
        <div className="w-full bg-amber-100 rounded-full h-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((photos.length / MIN_PHOTOS) * 100, 100)}%` }}
          />
        </div>
      </div>

      <Camera photos={photos} onPhotos={setPhotos} />
      <PhotoGallery photos={photos} onDelete={handleDelete} />

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 pb-8">
        <button
          onClick={handleProcess}
          disabled={!ready || uploading}
          className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-200 disabled:text-amber-400 text-white font-bold text-lg py-4 rounded-2xl transition-colors shadow-lg"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading…
            </span>
          ) : ready ? (
            `Process ${photos.length} Photos →`
          ) : (
            `${MIN_PHOTOS - photos.length} more photos needed`
          )}
        </button>
      </div>
    </main>
  )
}

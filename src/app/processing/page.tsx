'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useJob } from '@/hooks/useJob'
import { Suspense } from 'react'

const STEPS = [
  { label: 'Uploading photos', progress: 10 },
  { label: 'Analysing images', progress: 25 },
  { label: 'Building point cloud', progress: 45 },
  { label: 'Generating 3D mesh', progress: 65 },
  { label: 'Texturing model', progress: 80 },
  { label: 'Finalising', progress: 95 },
  { label: 'Complete!', progress: 100 },
]

function ProcessingContent() {
  const router = useRouter()
  const params = useSearchParams()
  const jobId = params.get('jobId')
  const { job, error } = useJob(jobId)

  useEffect(() => {
    if (job?.status === 'completed') {
      const modelParam = job.modelUrl ? `&modelUrl=${encodeURIComponent(job.modelUrl)}` : ''
      router.push(`/results?jobId=${jobId}${modelParam}`)
    }
  }, [job?.status, job?.modelUrl, jobId, router])

  if (!jobId) {
    return (
      <div className="text-center pt-20 text-amber-700">
        No job ID. <a href="/capture" className="underline">Start over</a>
      </div>
    )
  }

  const progress = job?.progress ?? 0
  const step = job?.step ?? 'Starting…'
  const isFailed = job?.status === 'failed'

  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-6 max-w-sm mx-auto">
      {isFailed ? (
        <div className="text-center">
          <div className="text-5xl mb-4">😞</div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Processing failed</h2>
          <p className="text-sm text-red-500 mb-6">{job?.error ?? 'Unknown error'}</p>
          <a
            href="/capture"
            className="inline-block bg-amber-500 text-white font-bold px-8 py-3 rounded-2xl"
          >
            Try again
          </a>
        </div>
      ) : (
        <>
          {/* Spinner */}
          <div className="relative mb-8">
            <div className="w-28 h-28 rounded-full border-4 border-amber-100 flex items-center justify-center">
              <div className="w-28 h-28 absolute rounded-full border-4 border-t-amber-500 border-r-amber-400 border-b-transparent border-l-transparent animate-spin" />
              <div className="text-4xl">🏮</div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-amber-900 mb-1">Processing your object</h2>
          <p className="text-sm text-amber-600 mb-8 text-center">{step}</p>

          {/* Progress bar */}
          <div className="w-full mb-6">
            <div className="w-full bg-amber-100 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-right text-xs text-amber-500 mt-1">{progress}%</div>
          </div>

          {/* Step indicators */}
          <div className="w-full space-y-2">
            {STEPS.map((s) => {
              const done = progress >= s.progress
              const active = !done && Math.abs(progress - s.progress) < 25
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    done ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-300'
                  }`}>
                    {done ? '✓' : ''}
                  </div>
                  <span className={`text-sm ${done ? 'text-amber-800' : 'text-amber-300'}`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>

          {error && (
            <p className="mt-6 text-xs text-red-400 text-center">
              Connection issue — retrying… ({error})
            </p>
          )}

          <p className="mt-8 text-xs text-amber-400 text-center">
            This usually takes 3–10 minutes. Keep this page open.
          </p>
        </>
      )}
    </main>
  )
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-amber-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>}>
      <ProcessingContent />
    </Suspense>
  )
}

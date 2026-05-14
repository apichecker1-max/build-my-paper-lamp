'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const DEMO_STEPS = [
  { label: 'Analysing photos',      progress: 10, ms: 1500 },
  { label: 'Detecting keypoints',   progress: 22, ms: 2000 },
  { label: 'Building point cloud',  progress: 38, ms: 2500 },
  { label: 'Generating mesh',       progress: 55, ms: 2500 },
  { label: 'Texturing model',       progress: 72, ms: 2000 },
  { label: 'Optimising geometry',   progress: 88, ms: 1500 },
  { label: 'Scan complete!',        progress: 100, ms: 800 },
]

const DEMO_MODEL_URL =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb'

// Real Kiri Engine stages in order
const KIRI_STAGES = [
  { key: 'uploaded',   label: 'Photos uploaded'       },
  { key: 'queued',     label: 'Queued for processing'  },
  { key: 'analysing',  label: 'Analysing photos'       },
  { key: 'building',   label: 'Building 3D model'      },
  { key: 'finalising', label: 'Finalising model'       },
  { key: 'completed',  label: 'Complete!'              },
]

const STAGE_ORDER = KIRI_STAGES.map(s => s.key)

function stageIndex(key: string) {
  const i = STAGE_ORDER.indexOf(key)
  return i === -1 ? 0 : i
}

function useElapsed() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function StageIcon({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') {
    return (
      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }
  if (state === 'active') {
    return (
      <div className="w-6 h-6 shrink-0 relative">
        <div className="w-6 h-6 rounded-full border-2 border-amber-200" />
        <div className="w-6 h-6 rounded-full border-2 border-t-amber-500 border-r-amber-400 border-b-transparent border-l-transparent animate-spin absolute inset-0" />
      </div>
    )
  }
  return (
    <div className="w-6 h-6 rounded-full border-2 border-amber-200 shrink-0" />
  )
}

function ProcessingContent() {
  const router = useRouter()
  const params = useSearchParams()
  const jobId = params.get('jobId') ?? ''
  const projectId = params.get('projectId') ?? ''
  const isDemo = params.get('demo') === 'true'

  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('uploaded')
  const [failed, setFailed] = useState(false)
  const [failMsg, setFailMsg] = useState('')
  const [timedOut, setTimedOut] = useState(false)
  const doneRef = useRef(false)
  const elapsedSecs = useRef(0)
  const elapsed = useElapsed()

  // Timeout counter
  useEffect(() => {
    if (isDemo) return
    const id = setInterval(() => {
      elapsedSecs.current += 1
      if (elapsedSecs.current >= 600 && !doneRef.current) setTimedOut(true)
    }, 1000)
    return () => clearInterval(id)
  }, [isDemo])

  // Demo mode
  useEffect(() => {
    if (!isDemo) return
    let i = 0
    function next() {
      if (doneRef.current) return
      if (i >= DEMO_STEPS.length) return
      const s = DEMO_STEPS[i++]
      setProgress(s.progress)
      if (s.progress === 100) {
        doneRef.current = true
        setTimeout(() => {
          router.push(`/results?jobId=${jobId}&modelUrl=${encodeURIComponent(DEMO_MODEL_URL)}`)
        }, 600)
        return
      }
      setTimeout(next, s.ms)
    }
    setTimeout(next, 800)
  }, [isDemo, jobId, router])

  // Persist so users can close and come back
  useEffect(() => {
    if (!isDemo && projectId) {
      localStorage.setItem('lamp_projectId', projectId)
      localStorage.setItem('lamp_jobId', jobId)
    }
  }, [isDemo, projectId, jobId])

  // Real mode: poll /api/status every 4 seconds
  useEffect(() => {
    if (isDemo || !projectId) return
    setStage('queued')

    const id = setInterval(async () => {
      if (doneRef.current) return
      try {
        const res = await fetch(`/api/status?projectId=${encodeURIComponent(projectId)}`)
        const data = await res.json()

        if (data.status === 'failed') {
          doneRef.current = true
          clearInterval(id)
          setFailed(true)
          setFailMsg(data.error ?? 'Scan failed')
          return
        }
        if (data.status === 'completed') {
          doneRef.current = true
          clearInterval(id)
          setStage('completed')
          setProgress(100)
          setTimeout(() => {
            router.push(`/results?jobId=${jobId}&modelUrl=${encodeURIComponent(data.modelUrl)}`)
          }, 800)
          return
        }
        if (data.stage) setStage(data.stage)
        if (data.progress) setProgress(data.progress)
      } catch {
        // network hiccup — keep polling
      }
    }, 4000)
    return () => clearInterval(id)
  }, [isDemo, projectId, jobId, router])

  if (!jobId) {
    return (
      <div className="text-center pt-20 text-amber-700">
        No job found. <a href="/capture" className="underline">Start over</a>
      </div>
    )
  }

  if (failed) {
    return (
      <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-6">
        <div className="text-5xl mb-4">😞</div>
        <h2 className="text-xl font-bold text-red-700 mb-2">Processing failed</h2>
        <p className="text-sm text-red-500 mb-6 text-center">{failMsg}</p>
        <a href="/capture" className="bg-amber-500 text-white font-bold px-8 py-3 rounded-2xl">
          Try again
        </a>
      </main>
    )
  }

  const currentStageIdx = stageIndex(stage)
  const displayProgress = isDemo ? Math.round(progress) : Math.round((currentStageIdx / (KIRI_STAGES.length - 1)) * 100)

  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-6 max-w-sm mx-auto">
      {/* Spinner */}
      <div className="relative mb-8">
        <div className="w-28 h-28 rounded-full border-4 border-amber-100 flex items-center justify-center">
          <div className="w-28 h-28 absolute rounded-full border-4 border-t-amber-500 border-r-amber-400 border-b-transparent border-l-transparent animate-spin" />
          <div className="text-4xl">🏮</div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-amber-900 mb-1">Generating 3D model</h2>
      <p className="text-xs text-amber-400 mb-6">Elapsed: {elapsed}</p>

      {/* Progress bar */}
      <div className="w-full mb-8">
        <div className="w-full bg-amber-100 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
      </div>

      {/* Real Kiri stages */}
      {!isDemo && (
        <div className="w-full space-y-4">
          {KIRI_STAGES.map((s, i) => {
            const state = i < currentStageIdx ? 'done' : i === currentStageIdx ? 'active' : 'pending'
            return (
              <div key={s.key} className="flex items-center gap-3">
                <StageIcon state={state} />
                <span className={`text-sm font-medium ${
                  state === 'done'    ? 'text-amber-800' :
                  state === 'active'  ? 'text-amber-600' :
                                        'text-amber-300'
                }`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Demo steps */}
      {isDemo && (
        <div className="w-full space-y-2">
          {DEMO_STEPS.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <StageIcon state={progress >= s.progress ? 'done' : progress >= s.progress - 15 ? 'active' : 'pending'} />
              <span className={`text-sm ${progress >= s.progress ? 'text-amber-800' : 'text-amber-300'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isDemo && !timedOut && (
        <div className="mt-8 bg-amber-100 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-amber-600 font-medium">Kiri Engine is processing your photos</p>
          <p className="text-xs text-amber-400 mt-0.5">Usually takes 3–10 minutes — you can close this page and come back</p>
        </div>
      )}

      {!isDemo && timedOut && (
        <div className="mt-8 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
          <p className="text-sm text-red-700 font-medium">Taking longer than expected</p>
          <p className="text-xs text-red-500 mt-1 mb-3">Kiri Engine may be under heavy load. You can close this page and come back later.</p>
          <a href="/capture" className="inline-block bg-amber-500 text-white text-sm font-bold px-5 py-2 rounded-xl">
            Start over
          </a>
        </div>
      )}

      {isDemo && (
        <p className="mt-6 text-xs text-amber-400 text-center bg-amber-100 rounded-xl px-4 py-2">
          Demo mode — add your Kiri Engine API key to process real photos
        </p>
      )}
    </main>
  )
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProcessingContent />
    </Suspense>
  )
}

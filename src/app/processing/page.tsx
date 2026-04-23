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

// Tripo AI generates in roughly 1–3 minutes; these labels give honest feedback
const REAL_STEPS = [
  { label: 'Photos uploaded',        progress: 8  },
  { label: 'Queued on Tripo AI',     progress: 15 },
  { label: 'Analysing images',       progress: 30 },
  { label: 'Building 3D structure',  progress: 55 },
  { label: 'Generating mesh',        progress: 75 },
  { label: 'Finalising model',       progress: 90 },
  { label: 'Complete!',              progress: 100 },
]

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

function ProcessingContent() {
  const router = useRouter()
  const params = useSearchParams()
  const jobId = params.get('jobId') ?? ''
  const taskId = params.get('taskId') ?? ''
  const isDemo = params.get('demo') === 'true'

  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState('Starting…')
  const [failed, setFailed] = useState(false)
  const [failMsg, setFailMsg] = useState('')
  const [lastPoll, setLastPoll] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const doneRef = useRef(false)
  const elapsedSecs = useRef(0)
  const elapsed = useElapsed()

  // Fake progress + 5-min timeout
  useEffect(() => {
    if (isDemo || doneRef.current) return
    const id = setInterval(() => {
      elapsedSecs.current += 1
      if (elapsedSecs.current >= 300 && !doneRef.current) {
        setTimedOut(true)
      }
      setProgress(prev => {
        if (prev >= 88 || doneRef.current) return prev
        const increment = prev < 30 ? 0.8 : prev < 60 ? 0.4 : 0.15
        return Math.min(88, prev + increment)
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isDemo])

  // Demo mode: advance through steps with setTimeout — no server calls
  useEffect(() => {
    if (!isDemo) return
    let i = 0
    function next() {
      if (doneRef.current) return
      if (i >= DEMO_STEPS.length) return
      const s = DEMO_STEPS[i++]
      setProgress(s.progress)
      setStep(s.label)
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

  // Real mode: poll /api/status every 2 seconds
  useEffect(() => {
    if (isDemo || !taskId) return
    setProgress(8)
    setStep('Photos uploaded — waiting for Tripo AI…')

    const id = setInterval(async () => {
      if (doneRef.current) return
      try {
        const res = await fetch(`/api/status?taskId=${encodeURIComponent(taskId)}`)
        const data = await res.json()
        setLastPoll(new Date().toLocaleTimeString())

        if (data.status === 'failed') {
          doneRef.current = true
          clearInterval(id)
          setFailed(true)
          setFailMsg(data.error ?? 'Generation failed')
          return
        }
        if (data.status === 'completed') {
          doneRef.current = true
          clearInterval(id)
          setProgress(100)
          setStep('Complete!')
          setTimeout(() => {
            router.push(`/results?jobId=${jobId}&modelUrl=${encodeURIComponent(data.modelUrl)}`)
          }, 800)
          return
        }
        // Use real progress from Tripo if it's ahead of our fake progress
        if (data.progress > 15) {
          setProgress(prev => Math.max(prev, data.progress))
        }
        setStep(data.step ?? 'Processing…')
      } catch {
        // network hiccup — keep polling
      }
    }, 2000)
    return () => clearInterval(id)
  }, [isDemo, taskId, jobId, router])

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

  const steps = isDemo ? DEMO_STEPS : REAL_STEPS
  const displayProgress = Math.round(progress)

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
      <p className="text-sm text-amber-600 mb-1 text-center">{step}</p>
      {!isDemo && (
        <p className="text-xs text-amber-400 mb-6">Elapsed: {elapsed}</p>
      )}
      {isDemo && <div className="mb-6" />}

      <div className="w-full mb-6">
        <div className="w-full bg-amber-100 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all duration-1000"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-amber-400 mt-1">
          <span>{displayProgress}%</span>
          {lastPoll && <span>Last update: {lastPoll}</span>}
        </div>
      </div>

      <div className="w-full space-y-2">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
              displayProgress >= s.progress ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-300'
            }`}>
              {displayProgress >= s.progress ? '✓' : ''}
            </div>
            <span className={`text-sm ${displayProgress >= s.progress ? 'text-amber-800' : 'text-amber-300'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {isDemo && (
        <p className="mt-6 text-xs text-amber-400 text-center bg-amber-100 rounded-xl px-4 py-2">
          Demo mode — add your Tripo AI key to process real photos
        </p>
      )}

      {!isDemo && !timedOut && (
        <div className="mt-6 bg-amber-100 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-amber-600 font-medium">Tripo AI is building your model</p>
          <p className="text-xs text-amber-400 mt-0.5">Usually takes 1–3 minutes — keep this page open</p>
        </div>
      )}

      {!isDemo && timedOut && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
          <p className="text-sm text-red-700 font-medium">Taking longer than expected</p>
          <p className="text-xs text-red-500 mt-1 mb-3">Tripo AI may be under heavy load or the task got stuck.</p>
          <a href="/capture" className="inline-block bg-amber-500 text-white text-sm font-bold px-5 py-2 rounded-xl">
            Start over
          </a>
        </div>
      )}

      {!isDemo && taskId && (
        <p className="mt-3 text-xs text-amber-300 text-center break-all">Task: {taskId.slice(0, 16)}…</p>
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

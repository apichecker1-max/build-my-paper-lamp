'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [pendingTask, setPendingTask] = useState(false)

  useEffect(() => {
    const taskId = localStorage.getItem('lamp_taskId')
    const jobId = localStorage.getItem('lamp_jobId')
    if (taskId && jobId) setPendingTask(true)
  }, [])

  function resumeTask() {
    const taskId = localStorage.getItem('lamp_taskId')
    const jobId = localStorage.getItem('lamp_jobId')
    if (taskId && jobId) {
      router.push(`/processing?jobId=${jobId}&taskId=${encodeURIComponent(taskId)}`)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Resume banner */}
      {pendingTask && (
        <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">You have a model still processing</span>
          <button onClick={resumeTask} className="text-sm font-bold underline">
            Check status →
          </button>
        </div>
      )}

      {/* Hero */}
      <section className="px-6 pt-16 pb-10 text-center">
        <div className="text-6xl mb-4">🏮</div>
        <h1 className="text-3xl font-bold text-amber-900 leading-tight mb-3">
          Build My<br />Paper Lamp
        </h1>
        <p className="text-amber-700 text-lg mb-8 max-w-xs mx-auto">
          Turn any object into a custom DIY paper lamp — no 3D skills needed.
        </p>
        <Link
          href="/capture"
          className="inline-block bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-lg transition-colors"
        >
          Start Creating →
        </Link>
        <p className="text-xs text-amber-500 mt-3">Free · Works on any phone</p>
      </section>

      {/* How it works */}
      <section className="px-6 py-8 max-w-sm mx-auto">
        <h2 className="text-center text-sm font-semibold text-amber-600 uppercase tracking-wider mb-6">
          How it works
        </h2>
        <div className="space-y-4">
          {[
            { icon: '📸', title: 'Capture', desc: 'Take 4+ photos of any object — front, back, left, right.' },
            { icon: '🤖', title: '3D Scan', desc: 'AI reconstructs a 3D model from your photos in about a minute.' },
            { icon: '📐', title: 'Extract', desc: 'Vector outlines are automatically generated — laser-cutter ready.' },
            { icon: '✂️', title: 'Make', desc: 'Download SVG, cut the paper, add a light — done!' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-4 bg-white rounded-2xl p-4 shadow-sm">
              <div className="text-3xl shrink-0">{step.icon}</div>
              <div>
                <div className="font-semibold text-amber-900">{step.title}</div>
                <div className="text-sm text-amber-700 mt-0.5">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-6 max-w-sm mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '📱', label: 'Mobile first' },
            { icon: '🆓', label: '100% free' },
            { icon: '⚡', label: '~1 min to 3D' },
            { icon: '🖨️', label: 'Laser-cutter ready' },
          ].map((f) => (
            <div key={f.label} className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-2xl">{f.icon}</div>
              <div className="text-xs font-medium text-amber-800 mt-1">{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="px-6 py-10 text-center">
        <Link
          href="/capture"
          className="inline-block bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-lg transition-colors"
        >
          Try It Now — Free
        </Link>
      </section>
    </main>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { getJob, updateJob } from '@/lib/jobs'
import { getProjectStatus } from '@/lib/openscan'
import fs from 'fs'

// Demo mode: simulate progress ticks
const DEMO_STEPS = [
  { progress: 10, step: 'Analysing photos' },
  { progress: 25, step: 'Detecting feature points' },
  { progress: 45, step: 'Building point cloud' },
  { progress: 65, step: 'Generating mesh' },
  { progress: 80, step: 'Texturing model' },
  { progress: 90, step: 'Preparing download' },
  { progress: 100, step: 'Scan complete — SVG ready on results page' },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const job = getJob(jobId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  if (job.status === 'completed' || job.status === 'failed') {
    return NextResponse.json(job)
  }

  const isDemoMode = job.step === 'demo_mode' || job.step?.startsWith('Demo mode')

  if (isDemoMode) {
    // Advance demo progress each poll
    const currentProgress = job.progress ?? 0
    const next = DEMO_STEPS.find((s) => s.progress > currentProgress) ?? DEMO_STEPS[DEMO_STEPS.length - 1]
    const isComplete = next.progress === 100

    // Demo: use a public GLB as the sample model
    const modelUrl = isComplete
      ? 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb'
      : undefined

    const updated = updateJob(jobId, {
      status: isComplete ? 'completed' : 'scanning',
      progress: next.progress,
      step: next.step,
      modelUrl,
    })

    return NextResponse.json(updated)
  }

  // Real mode: poll OpenScanCloud
  const openscanPath = `/tmp/lamp-jobs/${jobId}.openscan`
  if (!fs.existsSync(openscanPath)) {
    return NextResponse.json({ error: 'OpenScan project ID not found' }, { status: 404 })
  }

  const projectId = fs.readFileSync(openscanPath, 'utf8').trim()

  try {
    const scanStatus = await getProjectStatus(projectId)

    if (scanStatus.status === 'failed' || scanStatus.error) {
      const updated = updateJob(jobId, {
        status: 'failed',
        progress: 0,
        step: 'Scan failed',
        error: scanStatus.error ?? 'OpenScanCloud returned an error',
      })
      return NextResponse.json(updated)
    }

    if (scanStatus.status === 'completed' && scanStatus.downloadUrl) {
      const updated = updateJob(jobId, {
        status: 'completed',
        progress: 100,
        step: 'Scan complete — open Results to generate SVG',
        modelUrl: scanStatus.downloadUrl,
      })
      return NextResponse.json(updated)
    }

    // Still processing
    const updated = updateJob(jobId, {
      status: 'scanning',
      progress: scanStatus.progress ?? job.progress,
      step: `3D scanning in progress (${scanStatus.progress ?? 0}%)`,
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('Status poll error:', err)
    return NextResponse.json(job)
  }
}

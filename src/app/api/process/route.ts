import { NextRequest, NextResponse } from 'next/server'
import { getJob, updateJob } from '@/lib/jobs'
import { startProcessing } from '@/lib/openscan'
import fs from 'fs'

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json()
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    const job = getJob(jobId)
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const isDemoMode = job.step === 'demo_mode'

    if (isDemoMode) {
      updateJob(jobId, {
        status: 'scanning',
        progress: 5,
        step: 'Demo mode — simulating 3D scan',
      })
      return NextResponse.json({ jobId, status: 'scanning' })
    }

    const openscanPath = `/tmp/lamp-jobs/${jobId}.openscan`
    if (!fs.existsSync(openscanPath)) {
      return NextResponse.json({ error: 'OpenScan project ID not found' }, { status: 404 })
    }

    const projectId = fs.readFileSync(openscanPath, 'utf8').trim()
    await startProcessing(projectId)

    updateJob(jobId, {
      status: 'scanning',
      progress: 5,
      step: 'Submitted to OpenScanCloud — 3D scanning in progress',
    })

    return NextResponse.json({ jobId, status: 'scanning' })
  } catch (err) {
    console.error('Process error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Processing failed' },
      { status: 500 }
    )
  }
}

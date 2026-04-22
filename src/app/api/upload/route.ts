import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createJob } from '@/lib/jobs'
import { createProject, uploadPhotos } from '@/lib/openscan'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('photos') as File[]

    if (files.length < 5) {
      return NextResponse.json({ error: 'Minimum 5 photos required' }, { status: 400 })
    }
    if (files.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 photos allowed' }, { status: 400 })
    }

    // Convert File objects to Buffers
    const buffers: Buffer[] = []
    const filenames: string[] = []
    for (const file of files) {
      const arr = await file.arrayBuffer()
      buffers.push(Buffer.from(arr))
      filenames.push(file.name || `photo_${filenames.length}.jpg`)
    }

    // Demo mode: skip OpenScanCloud when no token is configured
    const isDemoMode = !process.env.OPENSCAN_TOKEN
    const jobId = uuidv4()

    if (isDemoMode) {
      createJob(jobId, files.length)
      // Store demo flag in job
      const { updateJob } = await import('@/lib/jobs')
      updateJob(jobId, { step: 'demo_mode', status: 'uploaded' })
      return NextResponse.json({
        jobId,
        photoCount: files.length,
        estimatedTime: 30,
        demo: true,
      })
    }

    // Create project on OpenScanCloud
    const projectId = await createProject(`lamp-${jobId}`)
    await uploadPhotos(projectId, buffers, filenames)

    createJob(jobId, files.length)
    const { updateJob } = await import('@/lib/jobs')
    updateJob(jobId, { step: 'Uploaded to OpenScanCloud', status: 'uploaded' })

    // Store the OpenScan projectId inside jobId record
    const fs = await import('fs')
    fs.writeFileSync(`/tmp/lamp-jobs/${jobId}.openscan`, projectId)

    return NextResponse.json({
      jobId,
      photoCount: files.length,
      estimatedTime: 600,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

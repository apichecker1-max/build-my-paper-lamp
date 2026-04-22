import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
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

    const jobId = uuidv4()

    // Demo mode: no token configured — return immediately, client simulates progress
    if (!process.env.OPENSCAN_TOKEN) {
      return NextResponse.json({ jobId, demo: true, photoCount: files.length })
    }

    // Real mode: upload to OpenScanCloud
    const buffers: Buffer[] = []
    const filenames: string[] = []
    for (const file of files) {
      const arr = await file.arrayBuffer()
      buffers.push(Buffer.from(arr))
      filenames.push(file.name || `photo_${filenames.length}.jpg`)
    }

    const projectId = await createProject(`lamp-${jobId}`)
    await uploadPhotos(projectId, buffers, filenames)
    await import('@/lib/openscan').then(m => m.startProcessing(projectId))

    return NextResponse.json({ jobId, projectId, photoCount: files.length, estimatedTime: 600 })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

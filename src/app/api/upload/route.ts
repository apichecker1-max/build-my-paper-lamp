import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { uploadFile, createTask, pickEvenly } from '@/lib/tripo'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('photos') as File[]

    if (files.length < 1) {
      return NextResponse.json({ error: 'At least 1 photo required' }, { status: 400 })
    }
    if (files.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 photos allowed' }, { status: 400 })
    }

    const jobId = uuidv4()

    // Demo mode: no API key configured
    if (!process.env.TRIPO_API_KEY) {
      return NextResponse.json({ jobId, demo: true, photoCount: files.length })
    }

    // Pick up to 4 evenly-spaced photos for multiview reconstruction
    const selected = pickEvenly(files, Math.min(files.length, 4))

    // Upload selected photos to Tripo and collect file tokens
    const tokens: string[] = []
    for (let i = 0; i < selected.length; i++) {
      const arr = await selected[i].arrayBuffer()
      const buf = Buffer.from(arr)
      const token = await uploadFile(buf, selected[i].name || `photo_${i}.jpg`)
      tokens.push(token)
    }

    const taskId = await createTask(tokens)

    return NextResponse.json({
      jobId,
      taskId,
      photoCount: files.length,
      selectedCount: selected.length,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

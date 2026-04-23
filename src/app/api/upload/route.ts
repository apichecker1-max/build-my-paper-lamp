import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { uploadFile, createTask, pickEvenly } from '@/lib/tripo'
import sharp from 'sharp'

export const maxDuration = 60

// Resize to max 1024px and re-compress — speeds up Tripo upload + processing
async function resizeImage(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
}

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

    // Resize + upload selected photos to Tripo
    const tokens: string[] = []
    for (let i = 0; i < selected.length; i++) {
      const arr = await selected[i].arrayBuffer()
      const buf = await resizeImage(Buffer.from(arr))
      console.log(`[upload] photo ${i + 1}/${selected.length} resized to ${buf.byteLength} bytes`)
      const token = await uploadFile(buf, `photo_${i}.jpg`)
      tokens.push(token)
    }

    const taskId = await createTask(tokens)
    console.log(`[upload] created Tripo task ${taskId} with ${tokens.length} images`)

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

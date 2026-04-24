import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createProject, uploadPhotos, startProcessing } from '@/lib/openscan'

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

    // Demo mode: no token configured
    if (!process.env.OPENSCAN_TOKEN) {
      return NextResponse.json({ jobId, demo: true, photoCount: files.length })
    }

    // Read all files into buffers
    const buffers: Buffer[] = []
    let totalBytes = 0
    console.log(`[upload] received ${files.length} files, first type: ${typeof files[0]}, constructor: ${files[0]?.constructor?.name}`)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`[upload] file ${i}: type=${typeof file} size=${(file as File).size ?? 'n/a'} name=${(file as File).name ?? 'n/a'}`)
      const arr = await (file as File).arrayBuffer()
      const buf = Buffer.from(arr)
      buffers.push(buf)
      totalBytes += buf.byteLength
    }
    console.log(`[upload] buffers ready: ${buffers.length}, totalBytes: ${totalBytes}`)

    const projectName = `lamp-${jobId}`
    console.log(`[upload] creating OpenScan project "${projectName}" with ${buffers.length} photos, ${totalBytes} bytes`)

    const { uploadUrls } = await createProject(projectName, buffers.length, totalBytes)
    console.log(`[upload] got ${uploadUrls.length} upload URLs`)

    await uploadPhotos(uploadUrls, buffers)
    console.log(`[upload] all photos uploaded`)

    await startProcessing(projectName)
    console.log(`[upload] processing started`)

    return NextResponse.json({ jobId, projectId: projectName, photoCount: files.length })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

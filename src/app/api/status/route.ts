import { NextRequest, NextResponse } from 'next/server'
import { getStatus, getDownloadUrl } from '@/lib/kiri'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  try {
    const { status, progress, stage } = await getStatus(projectId)
    console.log(`[status] serialize=${projectId} status=${status} stage=${stage} progress=${progress}`)

    if (status === 'failed') {
      return NextResponse.json({ status: 'failed', error: 'Kiri Engine could not reconstruct the model' })
    }

    if (status === 'completed') {
      const modelUrl = await getDownloadUrl(projectId)
      return NextResponse.json({ status: 'completed', progress: 100, modelUrl })
    }

    return NextResponse.json({ status, progress, stage, step: `3D scanning in progress (${progress}%)` })
  } catch (err) {
    console.error('[status] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Status check failed' },
      { status: 500 }
    )
  }
}

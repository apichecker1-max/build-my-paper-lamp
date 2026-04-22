import { NextRequest, NextResponse } from 'next/server'
import { getProjectStatus } from '@/lib/openscan'

// Stateless: polls OpenScanCloud directly using the projectId from the URL.
// No server-side job storage needed — demo mode is handled entirely client-side.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  try {
    const scan = await getProjectStatus(projectId)

    if (scan.status === 'failed' || scan.error) {
      return NextResponse.json({ status: 'failed', error: scan.error ?? 'Scan failed' })
    }

    if (scan.status === 'completed' && scan.downloadUrl) {
      return NextResponse.json({ status: 'completed', progress: 100, modelUrl: scan.downloadUrl })
    }

    return NextResponse.json({
      status: 'scanning',
      progress: scan.progress ?? 0,
      step: `3D scanning in progress (${scan.progress ?? 0}%)`,
    })
  } catch (err) {
    console.error('Status poll error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Status check failed' },
      { status: 500 }
    )
  }
}

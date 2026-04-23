import { NextRequest, NextResponse } from 'next/server'
import { getTaskStatus } from '@/lib/tripo'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')

  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 })
  }

  try {
    const task = await getTaskStatus(taskId)

    if (task.status === 'failed' || task.status === 'banned' || task.status === 'expired') {
      return NextResponse.json({ status: 'failed', error: task.error ?? 'Generation failed' })
    }

    if (task.status === 'success' && task.modelUrl) {
      return NextResponse.json({ status: 'completed', progress: 100, modelUrl: task.modelUrl })
    }

    // pending or running
    const progress = task.status === 'pending' ? 10 : Math.max(10, task.progress)
    return NextResponse.json({
      status: 'scanning',
      progress,
      step: task.status === 'pending' ? 'Queued — waiting to start…' : `Generating 3D model… (${progress}%)`,
    })
  } catch (err) {
    console.error('Status poll error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Status check failed' },
      { status: 500 }
    )
  }
}

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
    console.log(`[status] taskId=${taskId} status=${task.status} progress=${task.progress} modelUrl=${task.modelUrl ?? 'none'}`)

    if (task.status === 'failed' || task.status === 'banned' || task.status === 'expired') {
      return NextResponse.json({ status: 'failed', error: task.error ?? 'Generation failed' })
    }

    if (task.status === 'success' && task.modelUrl) {
      return NextResponse.json({ status: 'completed', progress: 100, modelUrl: task.modelUrl })
    }

    // success but no modelUrl yet — treat as still running
    if (task.status === 'success' && !task.modelUrl) {
      console.warn(`[status] taskId=${taskId} success but no modelUrl — raw:`, JSON.stringify(task))
      return NextResponse.json({ status: 'scanning', progress: 95, step: 'Finalising model…' })
    }

    const progress = task.status === 'pending' ? 10 : Math.max(10, task.progress)
    return NextResponse.json({
      status: 'scanning',
      progress,
      step: task.status === 'pending' ? 'Queued — waiting to start…' : `Generating 3D model… (${progress}%)`,
    })
  } catch (err) {
    console.error(`[status] taskId=${taskId} error:`, err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Status check failed' },
      { status: 500 }
    )
  }
}

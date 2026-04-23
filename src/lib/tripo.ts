const BASE_URL = 'https://api.tripo3d.ai/v2/openapi'

function authHeader() {
  return { Authorization: `Bearer ${process.env.TRIPO_API_KEY}` }
}

// Upload a single image buffer and return its file token
export async function uploadFile(buffer: Buffer, filename: string): Promise<string> {
  const form = new FormData()
  form.append('file', new Blob([buffer.buffer as ArrayBuffer], { type: 'image/jpeg' }), filename)

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  })
  if (!res.ok) throw new Error(`Tripo upload failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`Tripo upload error: ${data.message}`)
  return data.data.image_token as string
}

// Create a task from 1–4 file tokens; uses multiview when >1 image
export async function createTask(fileTokens: string[]): Promise<string> {
  const body =
    fileTokens.length === 1
      ? {
          type: 'image_to_model',
          file: { type: 'jpg', file_encoding: 'raw', file_token: fileTokens[0] },
        }
      : {
          type: 'multiview_to_model',
          files: fileTokens.map((t) => ({ type: 'jpg', file_encoding: 'raw', file_token: t })),
        }

  const res = await fetch(`${BASE_URL}/task`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Tripo task creation failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`Tripo task error: ${data.message}`)
  return data.data.task_id as string
}

export interface TripoStatus {
  status: 'pending' | 'running' | 'success' | 'failed' | 'banned' | 'expired' | 'unknown'
  progress: number
  modelUrl?: string
  error?: string
}

export async function getTaskStatus(taskId: string): Promise<TripoStatus> {
  const res = await fetch(`${BASE_URL}/task/${taskId}`, {
    headers: authHeader(),
  })
  if (!res.ok) throw new Error(`Tripo status check failed: ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`Tripo status error: ${data.message}`)

  const task = data.data
  return {
    status: task.status,
    progress: task.progress ?? 0,
    modelUrl: task.output?.model ?? task.output?.pbr_model,
    error: task.message,
  }
}

// Pick n evenly-spaced indices from an array (used to select representative photos)
export function pickEvenly<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr
  return Array.from({ length: n }, (_, i) => arr[Math.round((i * (arr.length - 1)) / (n - 1))])
}

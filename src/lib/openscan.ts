// OpenScanCloud REST API client
// Docs: https://github.com/OpenScan-org/OpenScanCloud
// Free tier: email cloud@openscan.eu for a token
// Basic auth fallback: username=openscan, password=free

const BASE_URL = 'https://cloud.openscan.eu'

function getAuthHeader(): string {
  const token = process.env.OPENSCAN_TOKEN
  if (token) {
    return `Bearer ${token}`
  }
  // Public free tier fallback
  return 'Basic ' + Buffer.from('openscan:free').toString('base64')
}

function headers() {
  return {
    Authorization: getAuthHeader(),
    'Content-Type': 'application/json',
  }
}

export interface OpenScanProject {
  projectId: string
  status: string
  progress?: number
  downloadUrl?: string
  error?: string
}

export async function createProject(name: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/createProject`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name, mode: 'object' }),
  })
  if (!res.ok) throw new Error(`OpenScan createProject failed: ${res.status}`)
  const data = await res.json()
  return data.projectId as string
}

export async function uploadPhotos(
  projectId: string,
  photos: Buffer[],
  filenames: string[]
): Promise<void> {
  for (let i = 0; i < photos.length; i++) {
    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('index', String(i))
    formData.append(
      'file',
      new Blob([photos[i].buffer as ArrayBuffer], { type: 'image/jpeg' }),
      filenames[i]
    )
    const res = await fetch(`${BASE_URL}/uploadImage`, {
      method: 'POST',
      headers: { Authorization: getAuthHeader() },
      body: formData,
    })
    if (!res.ok) throw new Error(`OpenScan uploadImage failed at index ${i}: ${res.status}`)
  }
}

export async function startProcessing(projectId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/startProject`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ projectId }),
  })
  if (!res.ok) throw new Error(`OpenScan startProject failed: ${res.status}`)
}

export async function getProjectStatus(projectId: string): Promise<OpenScanProject> {
  const res = await fetch(
    `${BASE_URL}/getProjectInfo?projectId=${encodeURIComponent(projectId)}`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`OpenScan getProjectInfo failed: ${res.status}`)
  const data = await res.json()
  return {
    projectId,
    status: data.status ?? 'unknown',
    progress: data.progress ?? 0,
    downloadUrl: data.downloadUrl ?? data.model_url ?? undefined,
    error: data.error ?? undefined,
  }
}

export async function getQueueEstimate(): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/getQueueEstimate`, { headers: headers() })
    if (!res.ok) return 600
    const data = await res.json()
    return data.estimatedSeconds ?? 600
  } catch {
    return 600
  }
}

// OpenScanCloud REST API client
// Base URL and flow confirmed from https://github.com/OpenScan-org/OpenScanCloud
// All requests use GET + query params; Basic auth (openscan:free) on all calls.
// Token is passed as a query param, not a header.

const BASE_URL = 'http://openscanfeedback.dnsuser.de:1334'

const BASIC_AUTH = 'Basic ' + Buffer.from('openscan:free').toString('base64')

function token() {
  return process.env.OPENSCAN_TOKEN ?? ''
}

function baseHeaders() {
  return { Authorization: BASIC_AUTH }
}

export interface OpenScanProject {
  projectId: string   // the project name used as ID
  status: string
  progress?: number
  downloadUrl?: string
  error?: string
}

// Step 1: create project and get upload URLs back
export async function createProject(
  name: string,
  photoCount: number,
  totalBytes: number
): Promise<{ projectName: string; uploadUrls: string[] }> {
  const url = `${BASE_URL}/createProject?token=${encodeURIComponent(token())}&project=${encodeURIComponent(name)}&photos=${photoCount}&parts=1&filesize=${totalBytes}`
  const res = await fetch(url, { headers: baseHeaders() })
  const rawText = await res.text()
  console.log(`[openscan createProject] status=${res.status} body=${rawText.slice(0, 500)}`)
  if (!res.ok) throw new Error(`OpenScan createProject failed: ${res.status} ${rawText}`)
  let data: unknown
  try { data = JSON.parse(rawText) } catch { throw new Error(`OpenScan createProject non-JSON: ${rawText}`) }
  const uploadUrls: string[] = Array.isArray(data) ? data as string[] : ((data as Record<string, unknown>).uploadLinks ?? (data as Record<string, unknown>).links ?? []) as string[]
  console.log(`[openscan createProject] got ${uploadUrls.length} upload URLs`)
  return { projectName: name, uploadUrls }
}

// Step 2: upload each photo to its corresponding URL
export async function uploadPhotos(
  uploadUrls: string[],
  photos: Buffer[]
): Promise<void> {
  for (let i = 0; i < photos.length; i++) {
    const uploadUrl = uploadUrls[i] ?? uploadUrls[uploadUrls.length - 1]
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { ...baseHeaders(), 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array(photos[i]),
    })
    if (!res.ok) throw new Error(`OpenScan upload failed at index ${i}: ${res.status} ${await res.text()}`)
  }
}

// Step 3: start processing
export async function startProcessing(projectName: string): Promise<void> {
  const url = `${BASE_URL}/startProject?token=${encodeURIComponent(token())}&project=${encodeURIComponent(projectName)}`
  const res = await fetch(url, { headers: baseHeaders() })
  if (!res.ok) throw new Error(`OpenScan startProject failed: ${res.status} ${await res.text()}`)
}

// Step 4: poll status
export async function getProjectStatus(projectName: string): Promise<OpenScanProject> {
  const url = `${BASE_URL}/getProjectInfo?token=${encodeURIComponent(token())}&project=${encodeURIComponent(projectName)}`
  const res = await fetch(url, { headers: baseHeaders() })
  if (!res.ok) throw new Error(`OpenScan getProjectInfo failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return {
    projectId: projectName,
    status: data.status ?? 'unknown',
    progress: data.progress ?? 0,
    downloadUrl: data.downloadUrl ?? data.model_url ?? data.download ?? undefined,
    error: data.error ?? undefined,
  }
}

// OpenScanCloud REST API client
// Confirmed from https://github.com/OpenScan-org/OpenScanCloud
// All requests: GET + query params, Basic auth (openscan:free), token as query param.
// createProject returns a single Dropbox upload URL in `ulink[0]`.
// All photos must be zipped into one file and uploaded to that URL.

import { zipSync } from 'fflate'

const BASE_URL = 'http://openscanfeedback.dnsuser.de:1334'
const BASIC_AUTH = 'Basic ' + Buffer.from('openscan:free').toString('base64')

function token() {
  return process.env.OPENSCAN_TOKEN ?? ''
}

function baseHeaders() {
  return { Authorization: BASIC_AUTH }
}

export interface OpenScanProject {
  projectId: string
  status: string
  progress?: number
  downloadUrl?: string
  error?: string
}

// Step 1: create project → returns the Dropbox upload URL
export async function createProject(
  name: string,
  photoCount: number,
  totalBytes: number
): Promise<string> {
  const url = `${BASE_URL}/createProject?token=${encodeURIComponent(token())}&project=${encodeURIComponent(name)}&photos=${photoCount}&parts=1&filesize=${totalBytes}`
  const res = await fetch(url, { headers: baseHeaders() })
  const rawText = await res.text()
  console.log(`[openscan createProject] status=${res.status} body=${rawText.slice(0, 500)}`)
  if (!res.ok) throw new Error(`OpenScan createProject failed: ${res.status} ${rawText}`)

  let data: Record<string, unknown>
  try { data = JSON.parse(rawText) as Record<string, unknown> }
  catch { throw new Error(`OpenScan createProject non-JSON response: ${rawText}`) }

  const ulinks = data.ulink as string[] | undefined
  if (!ulinks || ulinks.length === 0) throw new Error(`OpenScan createProject returned no upload URL: ${rawText}`)

  return ulinks[0]
}

// Step 2: zip all photos and upload to the Dropbox URL
export async function uploadPhotos(uploadUrl: string, photos: Buffer[]): Promise<void> {
  const files: Record<string, Uint8Array> = {}
  photos.forEach((buf, i) => {
    files[`photo_${String(i).padStart(4, '0')}.jpg`] = new Uint8Array(buf)
  })

  const zipped = zipSync(files, { level: 0 }) // level 0 = store only, JPEGs don't compress further
  console.log(`[openscan upload] uploading zip: ${zipped.byteLength} bytes for ${photos.length} photos`)

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { ...baseHeaders(), 'Content-Type': 'application/octet-stream' },
    body: Buffer.from(zipped),
  })
  const uploadResponseText = await res.text()
  console.log(`[openscan upload] response status=${res.status} body=${uploadResponseText.slice(0, 200)}`)
  if (!res.ok) throw new Error(`OpenScan upload failed: ${res.status} ${uploadResponseText}`)
}

// Step 3: start processing
export async function startProcessing(projectName: string): Promise<void> {
  const url = `${BASE_URL}/startProject?token=${encodeURIComponent(token())}&project=${encodeURIComponent(projectName)}`
  const res = await fetch(url, { headers: baseHeaders() })
  const text = await res.text()
  console.log(`[openscan startProject] status=${res.status} body=${text.slice(0, 200)}`)
  if (!res.ok) throw new Error(`OpenScan startProject failed: ${res.status} ${text}`)
}

// Step 4: poll status
export async function getProjectStatus(projectName: string): Promise<OpenScanProject> {
  const url = `${BASE_URL}/getProjectInfo?token=${encodeURIComponent(token())}&project=${encodeURIComponent(projectName)}`
  const res = await fetch(url, { headers: baseHeaders() })
  const text = await res.text()
  if (!res.ok) throw new Error(`OpenScan getProjectInfo failed: ${res.status} ${text}`)

  let data: Record<string, unknown>
  try { data = JSON.parse(text) as Record<string, unknown> }
  catch { throw new Error(`OpenScan getProjectInfo non-JSON: ${text}`) }

  return {
    projectId: projectName,
    status: (data.status as string) ?? 'unknown',
    progress: (data.progress as number) ?? 0,
    downloadUrl: (data.downloadUrl ?? data.model_url ?? data.download ?? data.ulink) as string | undefined,
    error: data.error as string | undefined,
  }
}

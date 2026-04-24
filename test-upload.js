// Test script: downloads sample JPEGs and runs the full upload → status flow
// Usage: node test-upload.js

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const FormData = require('form-data')

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const PHOTO_COUNT = 15

// Public domain sample photos (Unsplash — small sizes)
const SAMPLE_URLS = [
  'https://picsum.photos/seed/lamp1/800/600.jpg',
  'https://picsum.photos/seed/lamp2/800/600.jpg',
  'https://picsum.photos/seed/lamp3/800/600.jpg',
  'https://picsum.photos/seed/lamp4/800/600.jpg',
  'https://picsum.photos/seed/lamp5/800/600.jpg',
]

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function postForm(url, form) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: form.getHeaders(),
    }
    const client = parsed.protocol === 'https:' ? https : http
    const req = client.request(options, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
        catch { resolve(Buffer.concat(chunks).toString()) }
      })
    })
    req.on('error', reject)
    form.pipe(req)
  })
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const client = parsed.protocol === 'https:' ? https : http
    client.get(url, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
        catch { resolve(Buffer.concat(chunks).toString()) }
      })
    }).on('error', reject)
  })
}

async function run() {
  console.log('=== OpenScanCloud Upload Test ===\n')

  // 1. Download sample images
  console.log(`Downloading ${SAMPLE_URLS.length} sample images...`)
  const buffers = []
  for (let i = 0; i < SAMPLE_URLS.length; i++) {
    process.stdout.write(`  Fetching image ${i + 1}/${SAMPLE_URLS.length}... `)
    const buf = await fetchBuffer(SAMPLE_URLS[i])
    console.log(`${buf.byteLength} bytes`)
    buffers.push(buf)
  }

  // Repeat to reach PHOTO_COUNT
  const photos = []
  for (let i = 0; i < PHOTO_COUNT; i++) {
    photos.push(buffers[i % buffers.length])
  }
  console.log(`\nUsing ${photos.length} photos total\n`)

  // 2. Upload
  console.log('Uploading to /api/upload...')
  const form = new FormData()
  photos.forEach((buf, i) => {
    form.append('photos', buf, { filename: `photo_${i}.jpg`, contentType: 'image/jpeg' })
  })

  const uploadRes = await postForm(`${BASE_URL}/api/upload`, form)
  console.log('Upload response:', JSON.stringify(uploadRes, null, 2))

  if (uploadRes.demo) {
    console.log('\n⚠️  Demo mode — OPENSCAN_TOKEN not active on server')
    return
  }
  if (uploadRes.error) {
    console.log('\n❌ Upload failed:', uploadRes.error)
    return
  }

  const { jobId, projectId } = uploadRes
  console.log(`\n✅ Project created: ${projectId}`)
  console.log(`   Job ID: ${jobId}\n`)

  // 3. Poll status
  console.log('Polling /api/status every 5 seconds...\n')
  let done = false
  while (!done) {
    await new Promise(r => setTimeout(r, 5000))
    const status = await getJson(`${BASE_URL}/api/status?projectId=${encodeURIComponent(projectId)}`)
    const time = new Date().toLocaleTimeString()
    console.log(`[${time}] status=${status.status} progress=${status.progress ?? 0}% step="${status.step ?? ''}"`)

    if (status.status === 'completed') {
      console.log(`\n✅ Done! Model URL: ${status.modelUrl}`)
      done = true
    } else if (status.status === 'failed') {
      console.log(`\n❌ Failed: ${status.error}`)
      done = true
    }
  }
}

run().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})

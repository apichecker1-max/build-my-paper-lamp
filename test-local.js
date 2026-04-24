// Tests against local dev server so we can see server console output
const https = require('https')
const http = require('http')
const FormData = require('form-data')

const BASE_URL = 'http://localhost:3000'

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
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: form.getHeaders(),
    }
    const client = parsed.protocol === 'https:' ? https : http
    const req = client.request(options, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString()
        console.log('Raw response:', body)
        try { resolve(JSON.parse(body)) } catch { resolve(body) }
      })
    })
    req.on('error', reject)
    form.pipe(req)
  })
}

async function run() {
  console.log('=== Local Upload Test ===\n')

  console.log('Downloading 1 sample image...')
  const buf = await fetchBuffer('https://picsum.photos/seed/test/800/600.jpg')
  console.log(`Got ${buf.byteLength} bytes\n`)

  // Send just 5 photos for a quick test
  console.log('Uploading 5 photos to local /api/upload...')
  const form = new FormData()
  for (let i = 0; i < 5; i++) {
    form.append('photos', buf, { filename: `photo_${i}.jpg`, contentType: 'image/jpeg' })
  }

  const res = await postForm(`${BASE_URL}/api/upload`, form)
  console.log('\nUpload response:', JSON.stringify(res, null, 2))
}

run().catch(err => { console.error('Error:', err.message); process.exit(1) })

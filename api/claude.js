// Vercel serverless proxy — forwards requests to Anthropic API to avoid CORS.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': req.headers['x-api-key'] || '',
      'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
    },
    body: JSON.stringify(req.body),
  })

  const data = await response.json()
  res.status(response.status).json(data)
}

// Calls Claude Vision to identify the subject and return a template + adjusted parameters.
// Returns { template: string, params: object } or throws on failure.
export async function analyzeWithClaude(file, description, apiKey) {
  const base64 = await fileToBase64(file)
  const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg'

  const prompt = `You are helping generate a 3D lamp wireframe from a photo.
${description ? `User says: "${description}"\n` : ''}
Identify the main subject and return a JSON object that selects a template and adjusts its shape parameters.

Available templates:
- "dog": four-legged, body + head + legs + tail + ears
- "cat": four-legged, rounder body, large head, pointy ears, long curved tail
- "bird": oval body, wings, beak, tail feathers, perch feet

All params are multipliers (1.0 = default). Adjust based on what you see in the photo.

Return ONLY this JSON (no markdown, no explanation):
{
  "template": "dog",
  "params": {
    "bodyLength": 1.0,
    "bodyHeight": 1.0,
    "bodyWidth": 1.0,
    "headSize": 1.0,
    "legLength": 1.0,
    "tailLength": 1.0,
    "tailCurve": 1.0,
    "earSize": 1.0,
    "sitting": false
  }
}

For bird template, use these params instead: bodyLength, bodyHeight, bodyWidth, headSize, wingSpan, tailLength, tailSpread, beakLength.
Adjust multipliers between 0.4 and 2.0. Set "sitting": true if the animal is sitting/crouching.`

  // Use /api/claude proxy to avoid CORS (Vite dev proxy + Vercel function in production)
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || `Claude API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.content[0].text.trim()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in Claude response')

  const result = JSON.parse(match[0])
  if (!result.template || !result.params) throw new Error('Invalid response structure')

  // Clamp all numeric params to [0.3, 2.5]
  for (const [k, v] of Object.entries(result.params)) {
    if (typeof v === 'number') result.params[k] = Math.max(0.3, Math.min(2.5, v))
  }

  return result
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

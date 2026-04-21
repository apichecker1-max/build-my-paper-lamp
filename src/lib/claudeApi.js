// Calls Claude vision to get a tight bounding box around the main subject.
// Returns [x1, y1, x2, y2] as 0–1 fractions of image dimensions, with padding.
export async function analyzeWithClaude(file, description, apiKey) {
  const base64 = await fileToBase64(file)
  const mimeType = file.type.startsWith('image/') ? file.type : 'image/jpeg'

  const prompt = [
    description ? `The user describes this image as: "${description}"\n` : '',
    'Locate the main subject and return its bounding box as JSON.',
    'Return ONLY this format — no markdown, no explanation:',
    '{"bbox": [x1, y1, x2, y2]}',
    'x1,y1 = top-left corner; x2,y2 = bottom-right corner.',
    'All values are 0.0–1.0 fractions of image width/height.',
  ].join('\n')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
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

  // Tolerate Claude wrapping JSON in markdown fences
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found in Claude response')

  const { bbox } = JSON.parse(match[0])
  if (!Array.isArray(bbox) || bbox.length !== 4) throw new Error('Invalid bbox format')

  const [x1, y1, x2, y2] = bbox.map(v => Math.max(0, Math.min(1, Number(v))))
  if (x2 <= x1 || y2 <= y1) throw new Error('Degenerate bounding box')

  // Add padding so subject doesn't fill the entire crop (edge detection needs some background)
  const pad = 0.06
  return [
    Math.max(0, x1 - pad),
    Math.max(0, y1 - pad),
    Math.min(1, x2 + pad),
    Math.min(1, y2 + pad),
  ]
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

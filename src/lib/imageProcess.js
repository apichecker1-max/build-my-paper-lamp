// Background segmentation via corner flood-fill + radial sweep contour extraction
// threshold: 0–100, controls flood-fill color tolerance (higher = more aggressive bg removal)

export function processImage(img, threshold = 30) {
  const MAX = 480
  const scale = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1)
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const fg = segment(data, w, h, threshold)

  // Center of mass of foreground
  let sx = 0, sy = 0, count = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (fg[y * w + x]) { sx += x; sy += y; count++ }
  }
  if (count < 200) return []
  const cx = sx / count, cy = sy / count

  // Radial sweep: outermost foreground pixel per ray
  const RAYS = 180
  const pts = []
  for (let i = 0; i < RAYS; i++) {
    const angle = (i / RAYS) * Math.PI * 2
    const dx = Math.cos(angle), dy = Math.sin(angle)
    let found = null
    const maxR = Math.sqrt(w * w + h * h)
    for (let r = 1; r < maxR; r++) {
      const px = Math.round(cx + dx * r), py = Math.round(cy + dy * r)
      if (px < 0 || px >= w || py < 0 || py >= h) break
      if (fg[py * w + px]) found = [px, py]
    }
    if (found) pts.push(found)
  }

  if (pts.length < 6) return []

  // Normalize to [-1, 1], y-up
  const contour = pts.map(([x, y]) => [(x / w) * 2 - 1, -((y / h) * 2 - 1)])
  return [contour]
}

function segment(data, w, h, threshold) {
  const tol = threshold * 2.55  // map 0–100 to 0–255 color distance
  const fg = new Uint8Array(w * h).fill(1)
  const visited = new Uint8Array(w * h)
  // [x, y, r, g, b] — store parent color for region growing
  const queue = []
  let qi = 0

  function seed(x, y) {
    if (visited[y * w + x]) return
    visited[y * w + x] = 1
    fg[y * w + x] = 0
    const i = (y * w + x) * 4
    queue.push(x, y, data[i], data[i + 1], data[i + 2])
  }

  // Seed all 4 corners
  seed(0, 0); seed(w - 1, 0); seed(0, h - 1); seed(w - 1, h - 1)

  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  while (qi < queue.length) {
    const x = queue[qi], y = queue[qi + 1], r0 = queue[qi + 2], g0 = queue[qi + 3], b0 = queue[qi + 4]
    qi += 5
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      if (visited[ny * w + nx]) continue
      const idx = (ny * w + nx) * 4
      const dr = data[idx] - r0, dg = data[idx + 1] - g0, db = data[idx + 2] - b0
      if (Math.sqrt(dr * dr + dg * dg + db * db) <= tol) {
        visited[ny * w + nx] = 1
        fg[ny * w + nx] = 0
        queue.push(nx, ny, data[idx], data[idx + 1], data[idx + 2])
      }
    }
  }
  return fg
}

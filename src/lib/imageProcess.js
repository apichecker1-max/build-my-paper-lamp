// Background segmentation via corner flood-fill + Moore-neighbor boundary tracing
// threshold: 0–100, controls flood-fill color tolerance (higher = more aggressive bg removal)

// 8-connected directions in clockwise order: up, upper-right, right, lower-right,
// down, lower-left, left, upper-left
const D8 = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]

// O(1) direction lookup: dirIdx[dy+1][dx+1] → index into D8
const dirIdx = [[7,0,1],[6,0,2],[5,4,3]]

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

  const fgRaw = segment(data, w, h, threshold)
  const fg = keepLargestComponent(fgRaw, w, h)
  const raw = traceBoundary(fg, w, h)
  if (raw.length < 6) return []

  const simplified = douglasPeucker(raw, 3)
  if (simplified.length < 4) return []

  // Normalize to [-1, 1], y-up
  return [simplified.map(([x, y]) => [(x / w) * 2 - 1, -((y / h) * 2 - 1)])]
}

// BFS to find and isolate the largest connected foreground component.
// Prevents Moore tracing from getting stuck on noise pixels near the image edge.
function keepLargestComponent(fg, w, h) {
  const label = new Int32Array(w * h).fill(-1)
  let maxSize = 0, maxLabel = 0, nextLabel = 0
  const sizes = []
  const DIRS4 = [[-1,0],[1,0],[0,-1],[0,1]]

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!fg[y * w + x] || label[y * w + x] >= 0) continue
    const comp = nextLabel++
    const queue = [x, y]
    let qi = 0
    label[y * w + x] = comp
    let size = 0
    while (qi < queue.length) {
      const cx = queue[qi++], cy = queue[qi++]
      size++
      for (const [dx, dy] of DIRS4) {
        const nx = cx + dx, ny = cy + dy
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
        if (!fg[ny * w + nx] || label[ny * w + nx] >= 0) continue
        label[ny * w + nx] = comp
        queue.push(nx, ny)
      }
    }
    sizes.push(size)
    if (size > maxSize) { maxSize = size; maxLabel = comp }
  }

  const out = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) if (label[i] === maxLabel) out[i] = 1
  return out
}

// Moore-neighbor boundary tracing with Jacob's stopping criterion.
// Returns the full closed pixel boundary of the largest foreground region.
function traceBoundary(fg, w, h) {
  // Find topmost-leftmost foreground pixel (guaranteed: b to its left is background)
  let sx = -1, sy = -1
  outer: for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (fg[y * w + x]) { sx = x; sy = y; break outer }
  }
  if (sx === -1) return []

  const contour = [[sx, sy]]
  // b starts as the pixel to the left of start — always background for raster-scan start
  let bx = sx - 1, by = sy
  let cx = sx, cy = sy

  for (let iter = 0; iter < w * h; iter++) {
    // Direction from c toward b, clamped to valid D8 index
    const ddx = Math.max(-1, Math.min(1, bx - cx))
    const ddy = Math.max(-1, Math.min(1, by - cy))
    const sd = dirIdx[ddy + 1][ddx + 1]

    // Search clockwise from sd until we find a foreground neighbor
    let moved = false
    for (let i = 1; i <= 8; i++) {
      const dir = (sd + i) % 8
      const nx = cx + D8[dir][0], ny = cy + D8[dir][1]
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && fg[ny * w + nx]) {
        // The pixel we skipped over becomes the new b
        const prev = (sd + i - 1) % 8
        bx = cx + D8[prev][0]
        by = cy + D8[prev][1]
        cx = nx; cy = ny
        moved = true
        break
      }
    }

    if (!moved) break  // isolated pixel — done

    // Jacob's stopping criterion: back at start, and the next step would
    // revisit the second contour point — the loop is closed
    if (cx === sx && cy === sy) break
    contour.push([cx, cy])
  }

  return contour
}

// Ramer–Douglas–Peucker polyline simplification
function douglasPeucker(pts, eps) {
  if (pts.length <= 2) return pts
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]
  const dx = bx - ax, dy = by - ay
  const len = Math.sqrt(dx * dx + dy * dy)
  let maxD = 0, maxI = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = len
      ? Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len
      : Math.hypot(pts[i][0] - ax, pts[i][1] - ay)
    if (d > maxD) { maxD = d; maxI = i }
  }
  if (maxD > eps) {
    const l = douglasPeucker(pts.slice(0, maxI + 1), eps)
    const r = douglasPeucker(pts.slice(maxI), eps)
    return [...l.slice(0, -1), ...r]
  }
  return [pts[0], pts[pts.length - 1]]
}

function segment(data, w, h, threshold) {
  const tol = threshold * 2.55  // map 0–100 to 0–255 color distance
  const fg = new Uint8Array(w * h).fill(1)
  const visited = new Uint8Array(w * h)
  const queue = []
  let qi = 0

  function seed(x, y) {
    if (visited[y * w + x]) return
    visited[y * w + x] = 1
    fg[y * w + x] = 0
    const i = (y * w + x) * 4
    queue.push(x, y, data[i], data[i + 1], data[i + 2])
  }

  seed(0, 0); seed(w - 1, 0); seed(0, h - 1); seed(w - 1, h - 1)

  const DIRS4 = [[-1,0],[1,0],[0,-1],[0,1]]
  while (qi < queue.length) {
    const x = queue[qi], y = queue[qi+1], r0 = queue[qi+2], g0 = queue[qi+3], b0 = queue[qi+4]
    qi += 5
    for (const [ddx, ddy] of DIRS4) {
      const nx = x + ddx, ny = y + ddy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h || visited[ny * w + nx]) continue
      const idx = (ny * w + nx) * 4
      const dr = data[idx] - r0, dg = data[idx+1] - g0, db = data[idx+2] - b0
      if (Math.sqrt(dr*dr + dg*dg + db*db) <= tol) {
        visited[ny * w + nx] = 1
        fg[ny * w + nx] = 0
        queue.push(nx, ny, data[idx], data[idx+1], data[idx+2])
      }
    }
  }
  return fg
}

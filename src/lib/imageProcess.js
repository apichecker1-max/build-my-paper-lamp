// Edge-based foreground segmentation + Moore-neighbor boundary tracing.
// threshold: 0–100. Lower = detect only strong edges (simpler outline).
//                    Higher = detect finer edges (more detail, noisier on busy backgrounds).

const G5 = [1/256,4/256,6/256,4/256,1/256,4/256,16/256,24/256,16/256,4/256,6/256,24/256,36/256,24/256,6/256,4/256,16/256,24/256,16/256,4/256,1/256,4/256,6/256,4/256,1/256]
const D8 = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]
const dirIdx = [[7,0,1],[6,0,2],[5,4,3]]

// bbox: optional [x1, y1, x2, y2] as 0–1 fractions — crops image to subject before processing.
export function processImage(img, threshold = 30, bbox = null) {
  const MAX = 480
  const scale = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1)
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')

  if (bbox) {
    const [x1, y1, x2, y2] = bbox
    const sx = Math.floor(x1 * img.naturalWidth)
    const sy = Math.floor(y1 * img.naturalHeight)
    const sw = Math.ceil((x2 - x1) * img.naturalWidth)
    const sh = Math.ceil((y2 - y1) * img.naturalHeight)
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
  } else {
    ctx.drawImage(img, 0, 0, w, h)
  }
  const { data } = ctx.getImageData(0, 0, w, h)

  // threshold 0→100 maps Sobel sensitivity 40→5 (higher user threshold = more edges detected)
  const sobelT = Math.max(5, 40 - threshold * 0.35)
  const edges = clearBorder(dilate(sobel(gaussBlur(gray(data, w, h), w, h), w, h, sobelT), w, h), w, h)

  // Flood-fill from ALL border pixels through non-edge space → exterior region
  // Foreground = everything the fill couldn't reach (walled off by edges = the subject)
  const fgRaw = interiorMask(edges, w, h)
  const fg = keepLargestComponent(fgRaw, w, h)
  const raw = traceBoundary(fg, w, h)
  if (raw.length < 6) return []

  const simplified = douglasPeucker(raw, 3)
  if (simplified.length < 4) return []

  return [simplified.map(([x, y]) => [(x / w) * 2 - 1, -((y / h) * 2 - 1)])]
}

function gray(data, w, h) {
  const g = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++)
    g[i] = 0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2]
  return g
}

function gaussBlur(g, w, h) {
  const o = new Float32Array(w * h)
  for (let y = 2; y < h-2; y++) for (let x = 2; x < w-2; x++) {
    let s = 0
    for (let ky = -2; ky <= 2; ky++) for (let kx = -2; kx <= 2; kx++)
      s += g[(y+ky)*w+(x+kx)] * G5[(ky+2)*5+(kx+2)]
    o[y*w+x] = s
  }
  return o
}

function sobel(g, w, h, t) {
  const e = new Uint8Array(w * h)
  for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++) {
    const gx = -g[(y-1)*w+(x-1)] - 2*g[y*w+(x-1)] - g[(y+1)*w+(x-1)]
               + g[(y-1)*w+(x+1)] + 2*g[y*w+(x+1)] + g[(y+1)*w+(x+1)]
    const gy = -g[(y-1)*w+(x-1)] - 2*g[(y-1)*w+x] - g[(y-1)*w+(x+1)]
               + g[(y+1)*w+(x-1)] + 2*g[(y+1)*w+x] + g[(y+1)*w+(x+1)]
    if (Math.sqrt(gx*gx + gy*gy) > t) e[y*w+x] = 1
  }
  return e
}

// Remove fake edges caused by gaussian blur leaving zeros at the image border.
function clearBorder(e, w, h, r = 4) {
  for (let x = 0; x < w; x++) for (let y = 0; y < r; y++) { e[y*w+x] = 0; e[(h-1-y)*w+x] = 0 }
  for (let y = 0; y < h; y++) for (let x = 0; x < r; x++) { e[y*w+x] = 0; e[y*w+(w-1-x)] = 0 }
  return e
}

function dilate(e, w, h) {
  const o = new Uint8Array(w * h)
  for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++)
    if (e[y*w+x] || e[(y-1)*w+x] || e[(y+1)*w+x] || e[y*w+x-1] || e[y*w+x+1]) o[y*w+x] = 1
  return o
}

// Flood-fill from ALL image border pixels through non-edge pixels.
// Returns a foreground mask: 1 where the fill couldn't reach (enclosed by edges).
function interiorMask(edges, w, h) {
  const visited = new Uint8Array(w * h)
  const queue = []
  let qi = 0

  function seed(x, y) {
    if (visited[y*w+x] || edges[y*w+x]) return
    visited[y*w+x] = 1
    queue.push(x, y)
  }
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h-1) }
  for (let y = 1; y < h-1; y++) { seed(0, y); seed(w-1, y) }

  const DIRS4 = [[-1,0],[1,0],[0,-1],[0,1]]
  while (qi < queue.length) {
    const x = queue[qi++], y = queue[qi++]
    for (const [dx, dy] of DIRS4) {
      const nx = x+dx, ny = y+dy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h || visited[ny*w+nx] || edges[ny*w+nx]) continue
      visited[ny*w+nx] = 1
      queue.push(nx, ny)
    }
  }

  // Foreground = pixels the exterior fill never reached
  const fg = new Uint8Array(w * h)
  for (let i = 0; i < w*h; i++) if (!visited[i]) fg[i] = 1
  return fg
}

// Isolate the largest 4-connected foreground component to ignore noise.
function keepLargestComponent(fg, w, h) {
  const label = new Int32Array(w * h).fill(-1)
  let maxSize = 0, maxLabel = 0, nextLabel = 0
  const DIRS4 = [[-1,0],[1,0],[0,-1],[0,1]]

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!fg[y*w+x] || label[y*w+x] >= 0) continue
    const comp = nextLabel++
    const queue = [x, y]
    let qi = 0, size = 0
    label[y*w+x] = comp
    while (qi < queue.length) {
      const cx = queue[qi++], cy = queue[qi++]
      size++
      for (const [dx, dy] of DIRS4) {
        const nx = cx+dx, ny = cy+dy
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
        if (!fg[ny*w+nx] || label[ny*w+nx] >= 0) continue
        label[ny*w+nx] = comp
        queue.push(nx, ny)
      }
    }
    if (size > maxSize) { maxSize = size; maxLabel = comp }
  }

  const out = new Uint8Array(w * h)
  for (let i = 0; i < w*h; i++) if (label[i] === maxLabel) out[i] = 1
  return out
}

// Moore-neighbor boundary tracing. Returns the pixel boundary of the fg region.
function traceBoundary(fg, w, h) {
  let sx = -1, sy = -1
  outer: for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (fg[y*w+x]) { sx = x; sy = y; break outer }
  }
  if (sx === -1) return []

  const contour = [[sx, sy]]
  let bx = sx - 1, by = sy
  let cx = sx, cy = sy

  for (let iter = 0; iter < w * h; iter++) {
    const ddx = Math.max(-1, Math.min(1, bx - cx))
    const ddy = Math.max(-1, Math.min(1, by - cy))
    const sd = dirIdx[ddy+1][ddx+1]
    let moved = false
    for (let i = 1; i <= 8; i++) {
      const dir = (sd + i) % 8
      const nx = cx + D8[dir][0], ny = cy + D8[dir][1]
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && fg[ny*w+nx]) {
        const prev = (sd + i - 1) % 8
        bx = cx + D8[prev][0]; by = cy + D8[prev][1]
        cx = nx; cy = ny
        moved = true
        break
      }
    }
    if (!moved) break
    if (cx === sx && cy === sy) break
    contour.push([cx, cy])
  }
  return contour
}

// Ramer–Douglas–Peucker polyline simplification.
function douglasPeucker(pts, eps) {
  if (pts.length <= 2) return pts
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]
  const dx = bx - ax, dy = by - ay
  const len = Math.sqrt(dx*dx + dy*dy)
  let maxD = 0, maxI = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = len
      ? Math.abs(dy*pts[i][0] - dx*pts[i][1] + bx*ay - by*ax) / len
      : Math.hypot(pts[i][0] - ax, pts[i][1] - ay)
    if (d > maxD) { maxD = d; maxI = i }
  }
  if (maxD > eps) {
    const l = douglasPeucker(pts.slice(0, maxI+1), eps)
    const r = douglasPeucker(pts.slice(maxI), eps)
    return [...l.slice(0, -1), ...r]
  }
  return [pts[0], pts[pts.length - 1]]
}

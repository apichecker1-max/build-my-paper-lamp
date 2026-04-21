// Cat wireframe template — similar structure to dog but different proportions.
export const cat = {
  id: 'cat',
  label: 'Cat',
  defaultParams: {
    bodyLength: 1, bodyHeight: 1, bodyWidth: 1,
    headSize: 1, legLength: 1,
    tailLength: 1, tailCurve: 1, earSize: 1,
    sitting: false,
  },
  build,
}

function ellipseRing(cx, cy, cz, rx, ry, segments = 10) {
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push([cx, cy + ry * Math.sin(a), cz + rx * Math.cos(a)])
  }
  return pts
}
function drawRing(pts, lines) {
  for (let i = 0; i < pts.length - 1; i++) lines.push([...pts[i], ...pts[i + 1]])
}

function build(p = {}) {
  const {
    bodyLength = 1, bodyHeight = 1, bodyWidth = 1,
    headSize = 1, legLength = 1,
    tailLength = 1, tailCurve = 1, earSize = 1,
    sitting = false,
  } = p

  // Cats: rounder body, larger head, pointy ears, very long curved tail, slender legs
  const BL = 0.38 * bodyLength
  const BH = 0.19 * bodyHeight
  const BW = 0.13 * bodyWidth
  const HS = 0.22 * headSize    // bigger head than dog
  const LL = (sitting ? 0.20 : 0.55) * legLength
  const TL = 0.50 * tailLength  // longer tail
  const TC = 0.55 * tailCurve   // more curved
  const ES = 0.11 * earSize

  const bodyY = 0
  const groundY = bodyY - BH - LL
  const headX = BL + 0.08 + HS * 0.7
  const headY = bodyY + BH * 0.5 + HS * 0.4

  const lines = []
  const ln = (...args) => lines.push(args)

  // Body
  const RINGS = 6, SEGS = 10
  const ringPts = []
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS
    const bx = -BL + 2 * BL * t
    const taper = Math.sin(Math.PI * t)
    const rx = BW * (0.40 + 0.60 * taper)
    const ry = BH * (0.50 + 0.50 * taper)
    const ring = ellipseRing(bx, bodyY, 0, rx, ry, SEGS)
    drawRing(ring, lines)
    ringPts.push(ring)
  }
  for (let j = 0; j <= SEGS; j += 2)
    for (let i = 0; i < RINGS; i++) ln(...ringPts[i][j], ...ringPts[i + 1][j])

  // Neck
  const nkBX = BL - 0.03, nkBY = bodyY + BH * 0.75
  const nkHX = headX - HS * 0.60, nkHY = headY - HS * 0.70
  const nkW = BW * 0.35
  ln(nkBX, nkBY,  nkW, nkHX, nkHY,  nkW * 0.50)
  ln(nkBX, nkBY, -nkW, nkHX, nkHY, -nkW * 0.50)
  ln(nkBX, nkBY - nkW * 0.4, 0, nkHX, nkHY - nkW * 0.3, 0)
  ln(nkBX, nkBY + nkW * 0.3, 0, nkHX, nkHY + nkW * 0.2, 0)

  // Head — rounder
  drawRing(ellipseRing(headX, headY, 0, HS * 0.95, HS * 0.95, 12), lines)
  const sideRing = [], frontRing = []
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2
    sideRing.push([headX + HS * Math.cos(a), headY + HS * Math.sin(a), 0])
    frontRing.push([headX, headY + HS * Math.cos(a), HS * Math.sin(a)])
  }
  drawRing(sideRing, lines)
  drawRing(frontRing, lines)

  // Pointy ears (triangles)
  const earTopX = headX + HS * 0.10
  const earBaseY = headY + HS * 0.80
  for (const side of [-1, 1]) {
    const ez = side * HS * 0.62
    ln(earTopX - ES, earBaseY,  ez, earTopX, earBaseY + ES * 2.2, ez * 0.5)
    ln(earTopX + ES, earBaseY,  ez, earTopX, earBaseY + ES * 2.2, ez * 0.5)
    ln(earTopX - ES, earBaseY,  ez, earTopX + ES, earBaseY,  ez)
  }

  // Legs — slender
  const legPairs = [[ BL * 0.58, BW * 0.85], [-BL * 0.50, BW * 0.85]]
  const lw = BW * 0.07
  for (const [lx, lz0] of legPairs) {
    for (const side of [-1, 1]) {
      const lz = side * lz0
      const y0 = bodyY - BH * 0.85, y1 = groundY
      ln(lx + lw, y0, lz + lw, lx + lw, y1, lz + lw)
      ln(lx - lw, y0, lz + lw, lx - lw, y1, lz + lw)
      ln(lx + lw, y0, lz - lw, lx + lw, y1, lz - lw)
      ln(lx - lw, y0, lz - lw, lx - lw, y1, lz - lw)
      ln(lx + lw, y0, lz + lw, lx - lw, y0, lz - lw)
      ln(lx - lw, y0, lz + lw, lx + lw, y0, lz - lw)
      const kneeY = y0 + (y1 - y0) * 0.50
      ln(lx + lw, kneeY, lz + lw, lx - lw, kneeY, lz - lw)
    }
  }

  // Long curved tail — cat tails curve upward dramatically
  const tailStartX = -BL + 0.03
  const tailStartY = bodyY + BH * 0.5
  const TSEGS = 10
  for (let i = 0; i < TSEGS; i++) {
    const t1 = i / TSEGS, t2 = (i + 1) / TSEGS
    const arc = t => {
      const angle = t * Math.PI * 1.1  // full upward arc
      return [
        tailStartX - TL * Math.cos(angle) * 0.9,
        tailStartY + TL * Math.sin(angle) * TC,
      ]
    }
    const [bx1, by1] = arc(t1), [bx2, by2] = arc(t2)
    for (const z of [-0.02, 0.02]) ln(bx1, by1, z, bx2, by2, z)
    if (i % 3 === 0) ln(bx1, by1, -0.02, bx1, by1, 0.02)
  }

  return lines
}

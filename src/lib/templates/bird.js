// Bird wireframe template (perched pose).
export const bird = {
  id: 'bird',
  label: 'Bird',
  defaultParams: {
    bodyLength: 1, bodyHeight: 1, bodyWidth: 1,
    headSize: 1, wingSpan: 1,
    tailLength: 1, tailSpread: 1, beakLength: 1,
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
    headSize = 1, wingSpan = 1,
    tailLength = 1, tailSpread = 1, beakLength = 1,
  } = p

  const BL = 0.32 * bodyLength
  const BH = 0.18 * bodyHeight
  const BW = 0.14 * bodyWidth
  const HS = 0.16 * headSize
  const WS = 0.55 * wingSpan   // wing half-span
  const TL = 0.28 * tailLength
  const TS = 0.14 * tailSpread
  const BK = 0.10 * beakLength

  const bodyY = 0.1
  const headX = BL + 0.06 + HS * 0.7
  const headY = bodyY + BH * 0.4 + HS * 0.5

  const lines = []
  const ln = (...args) => lines.push(args)

  // Body — egg-shaped (fatter front)
  const RINGS = 6, SEGS = 10
  const ringPts = []
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS  // 0=tail, 1=head/breast
    const bx = -BL + 2 * BL * t
    const rx = BW * (0.3 + 0.7 * Math.sin(Math.PI * (t * 0.75 + 0.1)))
    const ry = BH * (0.35 + 0.65 * Math.sin(Math.PI * (t * 0.75 + 0.1)))
    const ring = ellipseRing(bx, bodyY, 0, rx, ry, SEGS)
    drawRing(ring, lines)
    ringPts.push(ring)
  }
  for (let j = 0; j <= SEGS; j += 2)
    for (let i = 0; i < RINGS; i++) ln(...ringPts[i][j], ...ringPts[i + 1][j])

  // Neck — short
  const nkBX = BL - 0.02, nkBY = bodyY + BH * 0.7
  const nkHX = headX - HS * 0.5, nkHY = headY - HS * 0.6
  const nkW = BW * 0.30
  ln(nkBX, nkBY,  nkW, nkHX, nkHY,  nkW * 0.55)
  ln(nkBX, nkBY, -nkW, nkHX, nkHY, -nkW * 0.55)
  ln(nkBX, nkBY - nkW, 0, nkHX, nkHY - nkW * 0.5, 0)

  // Head — round
  drawRing(ellipseRing(headX, headY, 0, HS, HS, 12), lines)
  const sr = [], fr = []
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2
    sr.push([headX + HS * Math.cos(a), headY + HS * Math.sin(a), 0])
    fr.push([headX, headY + HS * Math.cos(a), HS * Math.sin(a)])
  }
  drawRing(sr, lines)
  drawRing(fr, lines)

  // Beak — triangular
  const bkX = headX + HS * 0.92, bkY = headY - HS * 0.08
  ln(bkX, bkY,  HS * 0.12, bkX + BK, bkY - HS * 0.05, 0)
  ln(bkX, bkY, -HS * 0.12, bkX + BK, bkY - HS * 0.05, 0)
  ln(bkX, bkY + HS * 0.08, 0, bkX + BK, bkY - HS * 0.05, 0)

  // Wings — swept back, simplified as V-shapes with ribs
  const wingRootX = 0, wingRootY = bodyY + BH * 0.2
  for (const side of [-1, 1]) {
    const wz = side * WS
    const wTip = [wingRootX - BL * 0.3, wingRootY + BH * 0.1, wz]
    // Leading edge
    ln(wingRootX, wingRootY, side * BW * 0.9, ...wTip)
    // Trailing edge
    ln(wingRootX - BL * 0.1, wingRootY - BH * 0.3, side * BW * 0.8, ...wTip)
    // 3 wing ribs
    for (let k = 1; k <= 3; k++) {
      const t = k / 4
      ln(
        wingRootX - BL * 0.3 * t, wingRootY + BH * 0.1 * t, side * (BW * 0.9 + (WS - BW * 0.9) * t),
        wingRootX - BL * 0.1 * t, wingRootY - BH * 0.3 * t, side * (BW * 0.8 + (WS - BW * 0.8) * t)
      )
    }
  }

  // Tail feathers — fan of lines from tail tip
  const tailX = -BL - 0.02, tailY = bodyY - BH * 0.1
  const FSEGS = 5
  for (let f = 0; f <= FSEGS; f++) {
    const t = (f / FSEGS) - 0.5
    const tz = t * TS * 2
    const tx = tailX - TL
    const ty = tailY - TL * 0.25
    ln(tailX, tailY, 0, tx, ty, tz)
  }
  // Cross rib on tail
  ln(tailX - TL * 0.6, tailY - 0.05, -TS * 0.8, tailX - TL * 0.6, tailY - 0.05, TS * 0.8)

  // Feet — simple perch grip
  const footY = bodyY - BH - 0.05
  for (const side of [-1, 1]) {
    const fz = side * BW * 0.7
    ln(0, footY, fz, 0, footY - 0.12, fz)
    ln(0, footY - 0.12, fz, 0.12, footY - 0.14, fz)
    ln(0, footY - 0.12, fz, -0.10, footY - 0.14, fz)
    ln(0, footY - 0.12, fz, 0, footY - 0.14, fz - 0.08)
  }
  // Perch bar
  ln(-0.18, footY - 0.12, -BW, -0.18, footY - 0.12, BW)
  ln( 0.18, footY - 0.12, -BW,  0.18, footY - 0.12, BW)

  return lines
}

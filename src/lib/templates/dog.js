// Dog wireframe template.
// All params are multipliers (1.0 = default). Returns line segments [x1,y1,z1,x2,y2,z2].

export const dog = {
  id: 'dog',
  label: 'Dog',
  defaultParams: {
    bodyLength: 1, bodyHeight: 1, bodyWidth: 1,
    headSize: 1, legLength: 1,
    tailLength: 1, tailCurve: 1, earSize: 1,
    sitting: false,
  },
  build,
}

function ellipseRing(cx, cy, cz, rx, ry, segments = 10) {
  // Returns closed ring of [x,y,z] points in the YZ plane at x=cx
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push([cx, cy + ry * Math.sin(a), cz + rx * Math.cos(a)])
  }
  return pts
}

function drawRing(pts, lines) {
  for (let i = 0; i < pts.length - 1; i++)
    lines.push([...pts[i], ...pts[i + 1]])
}

function build(p = {}) {
  const {
    bodyLength = 1, bodyHeight = 1, bodyWidth = 1,
    headSize = 1, legLength = 1,
    tailLength = 1, tailCurve = 1, earSize = 1,
    sitting = false,
  } = p

  // Base dimensions
  const BL = 0.44 * bodyLength   // body half-length along X
  const BH = 0.21 * bodyHeight   // body half-height
  const BW = 0.15 * bodyWidth    // body half-width (Z)
  const HS = 0.19 * headSize     // head radius
  const LL = (sitting ? 0.24 : 0.60) * legLength  // leg length
  const TL = 0.32 * tailLength   // tail arc length
  const TC = 0.30 * tailCurve    // tail curve height
  const ES = 0.13 * earSize      // ear size

  const bodyY = 0                // body center Y
  const groundY = bodyY - BH - LL

  // Head position: in front of and above body
  const headX = BL + 0.10 + HS * 0.7
  const headY = bodyY + BH * 0.55 + HS * 0.35

  const lines = []
  const ln = (...args) => lines.push(args)

  // ── BODY ── ellipsoid cage: rings + longitudes
  const RINGS = 7, SEGS = 10
  const ringPts = []
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS                          // 0=rear, 1=front
    const bx = -BL + 2 * BL * t
    const taper = Math.sin(Math.PI * t)          // 0 at tips, 1 at middle
    const rx = BW * (0.38 + 0.62 * taper)
    const ry = BH * (0.48 + 0.52 * taper)
    const cy = bodyY - BH * 0.06 * (1 - taper)  // belly sags slightly
    const ring = ellipseRing(bx, cy, 0, rx, ry, SEGS)
    drawRing(ring, lines)
    ringPts.push(ring)
  }
  // Longitude lines (connect matching points on adjacent rings)
  for (let j = 0; j <= SEGS; j += 2) {
    for (let i = 0; i < RINGS; i++)
      ln(...ringPts[i][j], ...ringPts[i + 1][j])
  }

  // ── NECK ── 4 lines from body front-top to head bottom
  const nkBX = BL - 0.04,  nkBY = bodyY + BH * 0.72
  const nkHX = headX - HS * 0.55, nkHY = headY - HS * 0.65
  const nkW = BW * 0.45
  ln(nkBX, nkBY,  nkW, nkHX, nkHY,  nkW * 0.55)
  ln(nkBX, nkBY, -nkW, nkHX, nkHY, -nkW * 0.55)
  ln(nkBX, nkBY - nkW * 0.5, 0, nkHX, nkHY - nkW * 0.3, 0)
  ln(nkBX, nkBY + nkW * 0.4, 0, nkHX, nkHY + nkW * 0.2, 0)

  // ── HEAD ── 3 sphere rings
  // Horizontal equator
  drawRing(ellipseRing(headX, headY, 0, HS * 0.90, HS * 0.90, 12), lines)
  // Side vertical ring
  const sideRing = []
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2
    sideRing.push([headX + HS * Math.cos(a), headY + HS * Math.sin(a), 0])
  }
  drawRing(sideRing, lines)
  // Front vertical ring
  const frontRing = []
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2
    frontRing.push([headX, headY + HS * Math.cos(a), HS * Math.sin(a)])
  }
  drawRing(frontRing, lines)

  // Nose
  const noseX = headX + HS * 0.92
  ln(noseX, headY - HS * 0.08,  HS * 0.12, noseX + 0.04, headY - HS * 0.18, 0)
  ln(noseX, headY - HS * 0.08, -HS * 0.12, noseX + 0.04, headY - HS * 0.18, 0)

  // ── EARS ── floppy triangular shapes on top of head
  const earTopX = headX + HS * 0.15
  const earBaseY = headY + HS * 0.82
  for (const side of [-1, 1]) {
    const ez = side * HS * 0.70
    const ez2 = side * HS * 0.25
    const eh = ES * 1.6
    ln(earTopX - ES * 0.5, earBaseY,  ez, earTopX + ES * 0.3, earBaseY + eh, ez2)
    ln(earTopX + ES * 0.5, earBaseY,  ez * 0.5, earTopX + ES * 0.3, earBaseY + eh, ez2)
    ln(earTopX - ES * 0.5, earBaseY,  ez, earTopX + ES * 0.5, earBaseY, ez * 0.5)
    ln(earTopX - ES * 0.5, earBaseY,  ez, earTopX + ES * 0.5, earBaseY, ez * 0.5)
  }

  // ── LEGS ── 4 rectangular cages
  const legPairs = [
    [ BL * 0.60,  BW * 0.88],  // front
    [-BL * 0.52,  BW * 0.88],  // rear
  ]
  const lw = BW * 0.10  // leg half-width
  for (const [lx, lz0] of legPairs) {
    for (const side of [-1, 1]) {
      const lz = side * lz0
      const y0 = bodyY - BH * 0.82  // leg top
      const y1 = groundY             // leg bottom
      const kneeY = y0 + (y1 - y0) * 0.48

      // 4 vertical lines
      ln(lx + lw, y0, lz + lw, lx + lw, y1, lz + lw)
      ln(lx - lw, y0, lz + lw, lx - lw, y1, lz + lw)
      ln(lx + lw, y0, lz - lw, lx + lw, y1, lz - lw)
      ln(lx - lw, y0, lz - lw, lx - lw, y1, lz - lw)
      // Top cap
      ln(lx + lw, y0, lz + lw, lx - lw, y0, lz + lw)
      ln(lx + lw, y0, lz - lw, lx - lw, y0, lz - lw)
      ln(lx + lw, y0, lz + lw, lx + lw, y0, lz - lw)
      ln(lx - lw, y0, lz + lw, lx - lw, y0, lz - lw)
      // Knee cross
      ln(lx + lw, kneeY, lz + lw, lx - lw, kneeY, lz - lw)
      ln(lx - lw, kneeY, lz + lw, lx + lw, kneeY, lz - lw)
      // Paw
      ln(lx - lw * 1.5, y1, lz, lx + lw * 2.0, y1, lz)
    }
  }

  // Sitting rear legs (tucked under)
  if (sitting) {
    const slx = -BL * 0.48
    const sly0 = bodyY - BH
    for (const side of [-1, 1]) {
      const slz = side * BW * 0.88
      ln(slx, sly0, slz, slx + BL * 0.25, sly0 - 0.18, slz)
      ln(slx, sly0, slz, slx - BL * 0.10, sly0 - 0.18, slz)
      ln(slx + BL * 0.25, sly0 - 0.18, slz, slx - BL * 0.10, sly0 - 0.18, slz)
    }
  }

  // ── TAIL ──
  const tailStartX = -BL + 0.04
  const tailStartY = bodyY + BH * 0.55
  const TSEGS = 8
  for (let i = 0; i < TSEGS; i++) {
    const t1 = i / TSEGS, t2 = (i + 1) / TSEGS
    const arc = t => tailStartY + TC * Math.sin(t * Math.PI * 0.75)
    const bx1 = tailStartX - TL * t1, by1 = arc(t1)
    const bx2 = tailStartX - TL * t2, by2 = arc(t2)
    ln(bx1, by1,  0.025, bx2, by2,  0.025)
    ln(bx1, by1, -0.025, bx2, by2, -0.025)
    if (i % 2 === 0) ln(bx1, by1, -0.025, bx1, by1, 0.025)
  }

  return lines
}

// Each contour becomes a panel rotated around the Y axis.
// For a single contour, 4 symmetric panels are auto-generated.
export function buildWireframe(contours, ribCount = 18) {
  if (!contours.length) return []

  // Single-photo case: replicate into 4 symmetric panels
  const panels = contours.length === 1
    ? [contours[0], contours[0], contours[0], contours[0]]
    : contours

  const n = panels.length
  const angleStep = (Math.PI * 2) / n
  const lines = []

  // Panel outlines
  for (let pi = 0; pi < n; pi++) {
    const contour = panels[pi]
    const m = contour.length
    if (m < 3) continue
    const theta = angleStep * pi
    const cos = Math.cos(theta), sin = Math.sin(theta)
    const pts3 = contour.map(([x, y]) => [x * cos, y, x * sin])
    for (let i = 0; i < m; i++) {
      const a = pts3[i], b = pts3[(i + 1) % m]
      lines.push([a[0], a[1], a[2], b[0], b[1], b[2]])
    }
  }

  // Horizontal ribs connecting corresponding contour points across panels
  const ref = panels[0]
  const step = Math.max(1, Math.floor(ref.length / ribCount))
  for (let ri = 0; ri < ref.length; ri += step) {
    const ring = panels.map((c, pi) => {
      const theta = angleStep * pi
      const [cx, cy] = c[Math.min(ri, c.length - 1)]
      return [cx * Math.cos(theta), cy, cx * Math.sin(theta)]
    })
    for (let pi = 0; pi < n; pi++) {
      const a = ring[pi], b = ring[(pi + 1) % n]
      lines.push([a[0], a[1], a[2], b[0], b[1], b[2]])
    }
  }

  return lines
}

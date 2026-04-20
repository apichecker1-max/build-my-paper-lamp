export function buildWireframe(normalizedLines, depth = 0.8) {
  const positions = []
  const half = depth / 2

  for (const [x1, y1, x2, y2] of normalizedLines) {
    // Front face
    positions.push(x1, y1, half, x2, y2, half)
    // Back face
    positions.push(x1, y1, -half, x2, y2, -half)
  }

  // Connecting ribs (every Nth line keeps it uncluttered)
  const ribStep = Math.max(1, Math.floor(normalizedLines.length / 80))
  for (let i = 0; i < normalizedLines.length; i += ribStep) {
    const [x1, y1] = normalizedLines[i]
    positions.push(x1, y1, half, x1, y1, -half)
  }

  return new Float32Array(positions)
}

function blur3x3(data, width, height) {
  const out = new Float32Array(data.length)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      out[y * width + x] = (
        data[(y-1)*width+(x-1)] + 2*data[(y-1)*width+x] + data[(y-1)*width+(x+1)] +
        2*data[y*width+(x-1)]   + 4*data[y*width+x]     + 2*data[y*width+(x+1)] +
        data[(y+1)*width+(x-1)] + 2*data[(y+1)*width+x] + data[(y+1)*width+(x+1)]
      ) / 16
    }
  }
  return out
}

export function processImage(imageElement) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const maxDim = 350
  const scale = Math.min(maxDim / imageElement.naturalWidth, maxDim / imageElement.naturalHeight, 1)
  canvas.width = Math.max(2, Math.floor(imageElement.naturalWidth * scale))
  canvas.height = Math.max(2, Math.floor(imageElement.naturalHeight * scale))

  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const gray = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    gray[i] = 0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2]
  }

  const blurred = blur3x3(gray, width, height)

  const mag = new Float32Array(width * height)
  let maxMag = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx =
        -blurred[(y-1)*width+(x-1)] + blurred[(y-1)*width+(x+1)] +
        -2*blurred[y*width+(x-1)]   + 2*blurred[y*width+(x+1)] +
        -blurred[(y+1)*width+(x-1)] + blurred[(y+1)*width+(x+1)]
      const gy =
        -blurred[(y-1)*width+(x-1)] - 2*blurred[(y-1)*width+x] - blurred[(y-1)*width+(x+1)] +
         blurred[(y+1)*width+(x-1)] + 2*blurred[(y+1)*width+x] + blurred[(y+1)*width+(x+1)]
      mag[y*width+x] = Math.sqrt(gx*gx + gy*gy)
      if (mag[y*width+x] > maxMag) maxMag = mag[y*width+x]
    }
  }

  const threshold = maxMag * 0.12
  const edge = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    edge[i] = mag[i] > threshold ? 1 : 0
  }

  const lines = []
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      if (!edge[y*width+x]) continue
      if (edge[y*width+(x+1)])   lines.push([x, y, x+1, y])
      if (edge[(y+1)*width+x])   lines.push([x, y, x, y+1])
      if (edge[(y+1)*width+(x+1)]) lines.push([x, y, x+1, y+1])
    }
  }

  const normalized = lines.map(([x1, y1, x2, y2]) => [
    (x1 / width) * 2 - 1,
    -((y1 / height) * 2 - 1),
    (x2 / width) * 2 - 1,
    -((y2 / height) * 2 - 1),
  ])

  const maxLines = 10000
  if (normalized.length <= maxLines) return normalized
  const step = Math.ceil(normalized.length / maxLines)
  return normalized.filter((_, i) => i % step === 0)
}

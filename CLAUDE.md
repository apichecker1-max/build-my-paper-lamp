# Build My Paper Lamp

Vite + React app that generates 3D lamp wireframes from photos, running entirely in the browser.

## Stack
- React 18, Vite 5
- Three.js (WebGL 3D viewer + OrbitControls)
- Tailwind CSS

## Dev
```
npm install
npm run dev   # http://localhost:5173
```

## Architecture

### Image processing (`src/lib/imageProcess.js`)
`processImage(img, threshold = 30)` — takes a loaded `HTMLImageElement` and a threshold (0–100).

1. **Background segmentation** — BFS flood-fill from the 4 image corners using region-growing color tolerance (`threshold × 2.55` in 0–255 space). Marks all reachable background pixels; everything else is foreground.
2. **Radial sweep** — finds the center of mass of the foreground, then casts 180 rays outward. The outermost foreground pixel per ray becomes a contour point.
3. Returns a single normalized contour in `[[-1,1], [-1,1]]` space (y-up).

**Threshold** controls how aggressively the flood-fill eats into the background. Too low = background leaks into subject. Too high = subject bleeds into background. The slider in the viewer lets users tune this live.

### Wireframe builder (`src/lib/wireframe.js`)
`buildWireframe(contours, ribCount = 18)`

Each contour becomes a panel rotated around the Y axis:
- Panel `i` at angle `θ = (2π/N) × i`
- Contour point `(x, y)` → 3D point `(x·cosθ, y, x·sinθ)`

For a **single contour**, 4 symmetric panels are auto-generated (0°, 90°, 180°, 270°). For multiple photos, each contour becomes one panel evenly spaced around Y.

Horizontal ribs connect corresponding contour points across all panels.

### App flow (`src/App.jsx`)
State: `idle → processing → result`

- Stores `loadedImgs[]` (HTMLImageElements) and `threshold` so images can be re-processed live when the slider moves.
- Multi-file: all contours are collected and passed to `buildWireframe` together.

### Components
- **`DropZone`** — multi-file drag-and-drop / file picker. Calls `onFiles(File[])`.
- **`Viewer3D`** — Three.js scene with OrbitControls. Overlay: threshold slider (bottom-right), photo thumbnails (bottom-left). Rebuilds scene whenever `lines` prop changes.
- **`ProcessingView`** — loading spinner shown during image processing.

## Known limitations / next steps
- Flood-fill seeds only from 4 corners — subjects touching the image border may be partially removed.
- Radial sweep assumes a roughly convex silhouette centered in the frame; concave shapes (e.g. dog legs) produce a convex hull approximation.
- No Ramer–Douglas–Peucker simplification on the radial contour yet — could reduce vertex count for cleaner wireframes.
- Consider seeding flood-fill from the full image border (not just corners) for more robust background removal.
- GrabCut or a small WASM segmentation model would significantly improve accuracy for complex subjects.

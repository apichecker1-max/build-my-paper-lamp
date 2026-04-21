# Build My Paper Lamp

A Vite + React single-page app that turns photos into 3D lamp wireframes entirely in the browser — no server, no uploads. The user drops one or more photos of a subject, the app extracts the silhouette, and renders a rotatable 3D wireframe cage around it.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

Deployed on Vercel (`vercel.json` rewrites all routes to `/` for SPA routing).

---

## Tech stack

| Layer | Library / tool |
|---|---|
| UI framework | React 18 (StrictMode) |
| Build tool | Vite 5 + `@vitejs/plugin-react` |
| 3D rendering | Three.js 0.164 + OrbitControls |
| Styling | Tailwind CSS 3 + Inter font |
| Deployment | Vercel |

---

## File map

```
src/
  main.jsx               # React root mount
  App.jsx                # Top-level state machine + orchestration
  index.css              # Tailwind base import
  lib/
    imageProcess.js      # Segmentation + contour extraction
    wireframe.js         # 3D wireframe geometry builder
  components/
    DropZone.jsx         # Multi-file drag-and-drop upload zone
    ProcessingView.jsx   # Loading spinner (shown during processing)
    Viewer3D.jsx         # Three.js canvas + UI overlays
index.html               # SPA shell (Inter font, #root mount point)
vite.config.js           # Vite config (react plugin only)
tailwind.config.js       # Tailwind content paths
vercel.json              # SPA rewrite rule
```

---

## App state machine (`src/App.jsx`)

Three states: `idle → processing → result`

```
idle       DropZone visible; user selects/drops image files
  ↓ handleFiles(File[])
processing ProcessingView spinner shown; images load + contours extract
  ↓ extractLines() succeeds
result     Viewer3D shown with wireframe
  ↓ onReset()
idle
```

**Persistent state across threshold changes:**
`loadedImgs` (array of `HTMLImageElement`) is kept in state after processing so that moving the threshold slider re-runs `processImage` + `buildWireframe` synchronously without reloading images. This makes the slider feel instant.

**Key state variables:**

| Variable | Type | Purpose |
|---|---|---|
| `state` | `"idle"\|"processing"\|"result"` | Which screen to show |
| `lines` | `Float32Array`-ready `[x1,y1,z1,x2,y2,z2][]` | Wireframe line segments |
| `previews` | `string[]` | Object URLs for thumbnail display |
| `loadedImgs` | `HTMLImageElement[]` | Kept for live threshold re-processing |
| `threshold` | `number` (0–100) | Background flood-fill tolerance |
| `error` | `string\|null` | Shown in idle state when processing fails |

`loadImage(file)` — promisifies `HTMLImageElement` load from a Blob URL.

`extractLines(imgs, threshold)` — pure function; runs `processImage` on each image, collects contours, calls `buildWireframe`. Returns `null` if no contours found.

---

## Image processing (`src/lib/imageProcess.js`)

`processImage(img: HTMLImageElement, threshold = 30): [number, number][][]`

Returns an array of contours (currently always length 0 or 1). Each contour is an array of `[x, y]` points normalized to `[-1, 1]` space, y-up.

### Step 1 — Downscale

Image is drawn onto a canvas at most 480 px on the longest side (aspect-ratio preserving). Keeps processing fast regardless of input resolution.

### Step 2 — Background segmentation (`segment()`)

BFS flood-fill seeded from the **4 image corners**. Each pixel is accepted into the background region if its Euclidean RGB distance from its BFS-parent pixel is ≤ `threshold × 2.55` (mapping the 0–100 slider to 0–255 range).

This is **region-growing**, not a fixed-color flood fill — each accepted pixel passes its own color to its children, so the fill can traverse gradients in the background without a global reference color.

Result: a `Uint8Array` (`fg`) where `1 = foreground (subject)`, `0 = background`.

**Threshold tuning guide:**
- Too low (< 15): flood-fill stops early; textured or gradient backgrounds aren't fully removed → noisy contour
- Default (30): works well for plain or slightly textured backgrounds
- Too high (> 60): fill bleeds into the subject, especially at low-contrast edges → subject partially erased

**Known limitation:** seeds only from corners. If the subject touches the image border (e.g. a cropped portrait), parts of it will be flood-filled as background.

### Step 3 — Radial sweep contour extraction

1. Find the **center of mass** of all foreground pixels.
2. Cast **180 rays** evenly distributed around 360°.
3. For each ray, walk outward from the centroid pixel by pixel. Track the **last foreground pixel** seen — this is the outermost boundary point in that direction.
4. Collect all 180 boundary points as the contour.

**Why radial sweep instead of row-scan silhouette?**
Row-scan only captures left/right extremes per row — it works for simple blob shapes but loses information on concave or irregular outlines (e.g. a dog's legs or ears). Radial sweep captures the full angular boundary.

**Known limitation:** for strongly concave shapes (e.g. a dog's legs spread wide), the radial sweep from a central centroid may skip interior concavities. The result approximates the convex hull in those regions.

### Step 4 — Normalize

Each contour point `[px, py]` (pixel coords) → `[(px/w)*2-1, -((py/h)*2-1)]`. Origin is image center, y-axis points up.

---

## Wireframe builder (`src/lib/wireframe.js`)

`buildWireframe(contours: [number,number][][], ribCount = 18): number[][]`

Returns an array of line segments, each `[x1, y1, z1, x2, y2, z2]`, ready to feed into a Three.js `BufferGeometry`.

### Panel rotation model

Each contour is placed as a **flat panel** in 3D space, rotated around the Y axis:

```
panel i at angle θ = (2π / N) × i

contour point (x, y) → 3D point (x·cosθ,  y,  x·sinθ)
```

For **1 photo**, the single contour is replicated 4 times at 0°, 90°, 180°, 270° — creating a symmetric 4-panel cage that resembles a lantern or paper lamp structure.

For **2 photos** (e.g. front + side view), two panels at 0° and 180° are placed, giving a cross-section silhouette intersection — a classic technique for carving 3D shapes from 2D views.

For **N photos**, N panels are evenly distributed around Y.

### Horizontal ribs

After drawing the panel outlines, horizontal ribs are added by sampling every `⌊contourLength / ribCount⌋`-th point from the reference contour and connecting the corresponding points across all panels. This creates the "cage" look characteristic of paper lamp wireframes.

### Why this model?

A paper lamp is made by bending flat panels into a rotationally-symmetric shape. The panel-rotation approach directly models this construction: each photo silhouette becomes one panel of the lamp, and the ribs represent where the panels intersect or are wired together.

---

## Components

### `DropZone.jsx`

Props: `onFiles(files: File[])`

- Accepts `multiple` file selection via the hidden `<input type="file" multiple>`.
- Handles drag-over / drag-leave / drop events on the drop zone `div`.
- Filters to `image/*` MIME type only before calling `onFiles`.
- Visual state: amber border + scale on drag-over.

### `ProcessingView.jsx`

No props. Purely visual — a spinning amber ring with a status label. Shown during the `processing` state while images load and contours are extracted.

### `Viewer3D.jsx`

Props: `lines`, `onReset`, `previews`, `threshold`, `onThreshold`

Three.js setup (in `useEffect`, re-runs when `lines` changes):
- `PerspectiveCamera` at `(0, 0.2, 3.5)`, FOV 50
- `WebGLRenderer` with antialiasing, pixel ratio capped at 2×
- `OrbitControls` with damping and slow auto-rotate
- `LineSegments` geometry built from the `lines` array
- `GridHelper` at y = −1.2 as a ground reference
- `FogExp2` for depth fade
- Cleans up RAF loop, resize listener, geometry, and renderer on unmount

**UI overlays:**
- Top bar: lamp icon + "LAMP WIREFRAME" label + "Try another photo" reset button
- Bottom-right: threshold `<input type="range">` (0–100) with live value label; calls `onThreshold` on every change
- Bottom-left: row of `16×16` thumbnail `<img>` tags for each uploaded photo (object URLs from `previews`)
- Bottom-right (above slider): "drag to rotate / scroll to zoom" hint

---

## Coordinate systems

| Space | Range | Origin | Y direction |
|---|---|---|---|
| Canvas pixel | `[0, w] × [0, h]` | top-left | down |
| Normalized contour | `[-1, 1] × [-1, 1]` | image center | up |
| Three.js world | unbounded | scene origin | up |

Contour normalization flips Y so that "up in the photo" = "up in 3D".

---

## Known issues and improvement ideas

### Segmentation quality
- **Corner seeding only** — subjects at image edges get partially removed. Fix: seed from a thin border strip instead of just corners, or let the user click to seed.
- **No alpha / transparency support** — images with transparent backgrounds (PNG) are not exploited; the flood-fill treats transparency as white.
- **Better model**: GrabCut (OpenCV WASM), or a lightweight ONNX segmentation model (e.g. SAM-tiny) would give dramatically better results for complex subjects like dogs, people, or objects with fine detail.

### Contour quality
- **No Douglas–Peucker simplification** — the 180-point radial contour could be reduced to 30–50 points for a cleaner wireframe while preserving the silhouette shape.
- **Concave shapes** — radial sweep from centroid approximates concavities as straight chords. Adding a second pass with a marching-squares or boundary-tracing algorithm would capture re-entrant shapes.

### Wireframe model
- **Single-contour fallback is symmetric** — for a dog, all 4 auto-generated panels are identical, so the lamp looks the same from every angle. Multiple photos from different viewpoints produce a much more interesting result.
- **No mesh output** — currently exports only line segments. Adding a `buildMesh()` path with `THREE.LatheGeometry` or hull faces would enable STL export for actual 3D printing.
- **No export** — adding a "Download SVG" or "Download STL" button is the next most valuable feature.

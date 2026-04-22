# Technical Specification — Build My Paper Lamp

**Version:** 1.0  
**Date:** April 22, 2026  
**Status:** Ready for Development

---

## 1. System Architecture

### 1.1 High-Level Overview
```
┌──────────────────────────────────────────────────────┐
│              MOBILE BROWSER (PWA)                    │
│  ┌────────────────────────────────────────────────┐  │
│  │ Next.js Frontend (React 18 + TypeScript)       │  │
│  │ - Camera Capture Component                     │  │
│  │ - Photo Gallery                                │  │
│  │ - 3D Model Viewer (Three.js)                   │  │
│  │ - Vector Preview (SVG)                         │  │
│  │ - Job Status Polling                           │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                       │
          HTTP/WebSocket (JSON)
                       │
┌──────────────────────────────────────────────────────┐
│              NEXT.JS BACKEND (Node.js)               │
│  ┌────────────────────────────────────────────────┐  │
│  │ API Routes (/app/api/)                         │  │
│  │ ├─ POST /upload (multipart file handling)      │  │
│  │ ├─ POST /process (job orchestration)           │  │
│  │ ├─ GET /status (polling endpoint)              │  │
│  │ └─ GET /download (file delivery)               │  │
│  │                                                 │  │
│  │ Integration Layer                              │  │
│  │ ├─ KIRI Engine API client                      │  │
│  │ ├─ SketchEdge API client                       │  │
│  │ └─ Error handling & retries                    │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
     │                              │
     │                              │
 (REST)                         (REST)
     │                              │
┌────▼─────────┐          ┌────────▼──────┐
│ KIRI ENGINE  │          │  SKETCHEDGE   │
│ API          │          │  API          │
│              │          │               │
│ 3D Scanning  │          │ Vector        │
│ (photos→OBJ) │          │ Extraction    │
└──────────────┘          │ (img→SVG)     │
                          └───────────────┘
```

### 1.2 Data Flow

**Scenario: User uploads 25 photos of a dog**

```
1. USER CAPTURES PHOTOS (Phone)
   Camera API → React state (photos in memory)
   Photos stored in IndexedDB (backup)

2. USER CLICKS "PROCESS"
   Frontend shows: "Uploading 25 photos..."
   POST /api/upload with FormData
   Backend receives multipart files

3. BACKEND UPLOADS TO KIRI ENGINE
   Convert photos to FormData
   Call KIRI Engine API
   Get back: jobId, modelUrl (GLB)
   Response: { jobId: "uuid-1", status: "3d_complete" }

4. BACKEND CALLS SKETCHEDGE
   Download GLB from KIRI (or render to image)
   Send to SketchEdge API
   Get back: SVG with vector outline
   Response: { jobId: "uuid-1", status: "vector_complete" }

5. FRONTEND POLLS /api/status
   Every 2 seconds: GET /api/status?jobId=uuid-1
   Receives incremental updates

6. WHEN COMPLETE
   Frontend shows 3D model preview + SVG preview
   User clicks "Download SVG"
   Backend returns optimized SVG file

7. USER DOWNLOADS & USES
   Opens in Inkscape or laser cutter software
   Prints → cuts with laser cutter
```

---

## 2. Frontend Specifications

### 2.1 Pages & Routes

#### **Landing Page (`/`)**
```typescript
Path: /
Component: src/app/page.tsx
Features:
  - Hero banner with app description
  - Feature highlights (icons + text)
  - CTA button → "Start Creating" → /capture
  - FAQ section
  - Example gallery (showing paper lamps)
Layout: Mobile-first, Tailwind CSS
Performance: <50KB initial load
```

#### **Capture Page (`/capture`)**
```typescript
Path: /capture
Component: src/app/capture/page.tsx
Features:
  - Request camera permission
  - Real-time camera preview (Camera.tsx component)
  - "Take Photo" button (triggers photo capture)
  - Photo gallery (thumbnails, swipe to delete)
  - Counter: "X / 15 photos (min 15, max 50)"
  - "Next" button (enabled only after 15+ photos)
  - Back button → /

State Management:
  - useState for photos array
  - useLocalStorage to persist photos

Interactions:
  - Click camera preview area → open full screen
  - Tap "Take Photo" → capture frame
  - Swipe photo thumbnail left → delete
  - Click "Next" → POST /api/upload → /processing

Error Handling:
  - Camera not available → show fallback (upload input)
  - Permission denied → show prompt to allow camera
  - Storage full → show warning + delete oldest
```

#### **Processing Page (`/processing`)**
```typescript
Path: /processing
Component: src/app/processing/page.tsx
Params: ?jobId=uuid-1

Features:
  - Large loading spinner/animation
  - Status messages (real-time)
  - Progress bar (0-100%)
  - Estimated time remaining
  - Cancel button (optional)

Status Messages:
  - "Uploading photos... 42% complete"
  - "Processing 3D model (KIRI Engine)..."
  - "Extracting vector outline (SketchEdge)..."
  - "Finalizing SVG... Almost done!"
  - "Complete! Redirecting..."

Polling Logic:
  - useEffect polling /api/status every 2 seconds
  - Stop polling when status === "completed" or "failed"
  - Redirect to /results?jobId=uuid-1 on success
  - Redirect to /error?jobId=uuid-1&reason=... on failure

Error Recovery:
  - If polling fails: show "Connection lost, retrying..."
  - If API times out: show "Taking longer than expected..."
  - Retry button (restarts from last checkpoint)
```

#### **Results Page (`/results`)**
```typescript
Path: /results
Component: src/app/results/page.tsx
Params: ?jobId=uuid-1

Features:
  - 3D Model Viewer (ModelViewer.tsx)
    - Three.js canvas
    - Rotate with mouse drag
    - Zoom with scroll/pinch
    - Load GLB model from jobData.modelUrl
  
  - Vector Preview (VectorPreview.tsx)
    - Embed SVG in <svg> tag
    - Show with transparent background
    - Display file size + vector complexity
  
  - Action Buttons:
    - Download SVG (GET /api/download?jobId=...)
    - Copy SVG Code (copy to clipboard)
    - Share (generate shareable link, optional)
    - Adjust (SketchEdge slider for line thickness)
  
  - Metadata Display:
    - Processing time
    - Model stats (polygons, vertices)
    - Vector stats (paths, segments)

Data Source:
  - GET /api/status?jobId=uuid-1 (fetch full results)
  - Cache in React state + localStorage

Error Handling:
  - If model fails to load: "3D preview unavailable"
  - If SVG is invalid: "Vector extraction failed, retry"
  - Show raw SVG code as fallback
```

#### **Error Page (`/error`)**
```typescript
Path: /error
Component: src/app/error.tsx OR custom page

Features:
  - Error message (specific)
  - Error code
  - Suggestions for recovery
  - Retry button
  - Return to home button

Examples:
  - "Camera permission denied" → link to settings
  - "API timeout" → retry or contact support
  - "Invalid photos" → back to /capture with tips
```

### 2.2 Components

#### **Camera.tsx**
```typescript
// src/components/Camera.tsx

Type: Functional Component
Props:
  - onCapture: (photo: Blob) => void
  - facingMode: "user" | "environment" (default: "environment")
  - style?: CSSProperties

Features:
  - useRef for video element
  - canvas for photo capture
  - getUserMedia() API
  - EXIF data handling (strip or preserve)

Methods:
  - startCamera() → request permission, start stream
  - capturePhoto() → draw frame to canvas, return blob
  - stopCamera() → stop stream

Error Handling:
  - Catch NotAllowedError → permission denied
  - Catch NotFoundError → no camera device
  - Show user-friendly error messages

Performance:
  - Lazy load WebRTC polyfills
  - Optimize canvas drawing
  - Limit resolution to 1280x720 (balance quality vs size)
```

#### **PhotoGallery.tsx**
```typescript
// src/components/PhotoGallery.tsx

Type: Functional Component
Props:
  - photos: Blob[]
  - onDelete: (index: number) => void
  - maxPhotos?: number (default: 50)

Features:
  - Map over photos array
  - Display thumbnails (100x100px)
  - Show index badge
  - Delete button on hover
  - Counter badge "15/50 photos"
  - Horizontal scroll on mobile

Interactions:
  - Click thumbnail → expand/lightbox
  - Swipe left → delete (with confirmation)
  - Swipe right → preview

Styling:
  - Tailwind grid
  - Responsive: 3 columns (mobile) → 6 columns (desktop)
```

#### **ModelViewer.tsx**
```typescript
// src/components/ModelViewer.tsx

Type: Functional Component
Props:
  - modelUrl: string (GLB file URL)
  - height?: number (default: 400px)

Features:
  - Three.js scene setup
  - Load GLB via GLTFLoader
  - OrbitControls (rotate, zoom, pan)
  - Automatic centering & scaling
  - Soft lighting (ambient + directional)
  - White background

Interactions:
  - Left-drag: rotate
  - Right-drag: pan
  - Scroll: zoom
  - Double-click: reset camera

Error Handling:
  - If GLB load fails → show placeholder
  - If WebGL not supported → show fallback image

Performance:
  - Lazy load Three.js
  - Defer rendering until in viewport
  - Optimize model geometry
```

#### **VectorPreview.tsx**
```typescript
// src/components/VectorPreview.tsx

Type: Functional Component
Props:
  - svgContent: string (raw SVG code)
  - downloadUrl: string
  - stats?: { paths: number, segments: number }

Features:
  - Render SVG inline
  - Auto-scale to fit container
  - Show file size
  - Show vector complexity
  - Hover tooltip for paths

Interactions:
  - Click → full-screen preview
  - Download button
  - Copy code button
  - Show raw SVG code (collapsible)

Styling:
  - Black strokes on white background (laser cutter ready)
  - Responsive: full width on mobile
```

### 2.3 Hooks

#### **useCamera()**
```typescript
// src/hooks/useCamera.ts

Returns:
  {
    videoRef: RefObject<HTMLVideoElement>
    canvasRef: RefObject<HTMLCanvasElement>
    isInitialized: boolean
    error: Error | null
    startCamera: () => Promise<void>
    stopCamera: () => void
    capturePhoto: () => Blob | null
  }

Usage:
  const { videoRef, startCamera, capturePhoto } = useCamera()
  useEffect(() => { startCamera() }, [])
```

#### **useJob(jobId: string)**
```typescript
// src/hooks/useJob.ts

Returns:
  {
    status: "processing" | "completed" | "failed"
    progress: number (0-100)
    step: string
    data: { modelUrl, svgUrl, ... } | null
    error: Error | null
    loading: boolean
  }

Usage:
  const { status, progress, data } = useJob(jobId)
  Polls /api/status every 2 seconds
  Stops polling when complete
```

#### **useLocalStorage(key: string)**
```typescript
// src/hooks/useLocalStorage.ts

Returns:
  [value: T, setValue: (val: T) => void]

Usage:
  const [photos, setPhotos] = useLocalStorage("photos", [])
  Syncs with IndexedDB for large files
```

### 2.4 Type Definitions

```typescript
// src/types/index.ts

interface Photo {
  id: string
  blob: Blob
  timestamp: number
  size: number
}

interface UploadResponse {
  jobId: string
  status: "uploaded"
  photoCount: number
  estimatedTime: number
}

interface ProcessingStep {
  id: string
  name: "3d_scanning" | "vector_extraction" | "finalization"
  status: "pending" | "processing" | "complete" | "failed"
  startTime: number
  endTime?: number
  error?: string
}

interface JobStatus {
  jobId: string
  status: "processing" | "completed" | "failed"
  progress: number (0-100)
  step: string
  steps: ProcessingStep[]
  estimatedTimeRemaining: number
  results?: {
    modelUrl: string
    svgUrl: string
    rawSvg: string
    metadata: {
      processingTime: number
      modelStats: { polygons: number, vertices: number }
      vectorStats: { paths: number, segments: number }
    }
  }
  error?: {
    code: string
    message: string
    recoverable: boolean
  }
}

interface AppState {
  photos: Photo[]
  currentJob: JobStatus | null
  history: JobStatus[]
  settings: {
    cameraFacing: "user" | "environment"
    outputQuality: "low" | "medium" | "high"
  }
}
```

---

## 3. Backend Specifications

### 3.1 API Endpoints

#### **POST /api/upload**
```typescript
// src/app/api/upload/route.ts

Request:
  Content-Type: multipart/form-data
  Body:
    - photos: File[] (array of image files)
    - metadata: {
        objectName?: string
        description?: string
        outputFormat?: "glb" | "obj"
      }

Response (200 OK):
  {
    jobId: "d8f4c6e1-a2b3-4f5e-b6c7-d8e9f0a1b2c3",
    status: "uploaded",
    photoCount: 42,
    totalSize: 52428800, // bytes
    estimatedTime: 180, // seconds
    uploadUrl: "https://..." // S3/storage URL
  }

Response (400 Bad Request):
  {
    error: "INVALID_PHOTOS",
    message: "Please provide at least 15 photos",
    details: { provided: 8, required: 15 }
  }

Response (413 Payload Too Large):
  {
    error: "PHOTOS_TOO_LARGE",
    message: "Total file size exceeds 200MB limit",
    details: { limit: 209715200, provided: 314572800 }
  }

Implementation:
  - Parse multipart/form-data using multer
  - Validate file count (15-50 photos)
  - Validate file size (<200MB total)
  - Validate MIME types (jpeg, png only)
  - Generate unique jobId (UUID)
  - Save photos to temporary storage (fs or S3)
  - Create job record in memory/DB
  - Return response
  - DO NOT start processing yet (user confirms in UI)

Error Cases:
  - Missing files → 400
  - Invalid MIME type → 400
  - Too many/few files → 400
  - Total size exceeds limit → 413
  - Disk space issues → 507
```

#### **POST /api/process**
```typescript
// src/app/api/process/route.ts

Request:
  Content-Type: application/json
  Body:
    {
      jobId: "d8f4c6e1-a2b3-4f5e-b6c7-d8e9f0a1b2c3",
      options?: {
        modelQuality: "fast" | "balanced" | "high" (default: "balanced")
        vectorSmoothness: 0-100 (default: 50)
      }
    }

Response (200 OK):
  {
    jobId: "d8f4c6e1-...",
    status: "processing",
    step: "3d_scanning",
    progress: 5,
    estimatedTimeRemaining: 175
  }

Response (404 Not Found):
  {
    error: "JOB_NOT_FOUND",
    message: "Job ID not found or expired",
    jobId: "d8f4c6e1-..."
  }

Implementation:
  - Validate jobId exists
  - Check job status (must be "uploaded")
  - Queue async processing (Bull job queue, optional)
  - Return immediately (200) - do NOT block
  - Background: Call KIRI Engine API
  - Background: Call SketchEdge API
  - Background: Store results in job record
  - Client polls /api/status for progress

Error Cases:
  - jobId not found → 404
  - Job already processing → 409 Conflict
  - KIRI Engine API failure → 502 Bad Gateway
  - SketchEdge API failure → 502 Bad Gateway
```

#### **GET /api/status**
```typescript
// src/app/api/status/route.ts

Query Params:
  - jobId: string (required)

Response (200 OK):
  {
    jobId: "d8f4c6e1-...",
    status: "processing", // or "completed" / "failed"
    progress: 45,
    step: "vector_extraction",
    steps: [
      {
        id: "upload",
        name: "Upload photos",
        status: "complete",
        startTime: 1713794400000,
        endTime: 1713794405000
      },
      {
        id: "3d_scan",
        name: "3D scanning",
        status: "processing",
        startTime: 1713794405000
      }
    ],
    estimatedTimeRemaining: 120,
    // Only when status === "completed":
    results?: {
      modelUrl: "https://storage.example.com/models/uuid.glb",
      svgUrl: "https://storage.example.com/svgs/uuid.svg",
      rawSvg: "<svg>...</svg>",
      metadata: {
        processingTime: 185,
        uploadTime: 5,
        modelStats: {
          vertices: 15000,
          polygons: 30000,
          fileSize: 2097152
        },
        vectorStats: {
          paths: 245,
          segments: 5890,
          fileSize: 98304
        }
      }
    }
  }

Response (404 Not Found):
  {
    error: "JOB_NOT_FOUND",
    message: "Job not found or expired",
    jobId: "d8f4c6e1-..."
  }

Implementation:
  - Look up job by jobId
  - Return current status
  - Calculate progress (0-100)
  - Calculate ETA (based on step)
  - If complete, include results object
  - If failed, include error details

Job Status Lifecycle:
  "uploaded" → "processing" → "completed" or "failed"
  
Progress Breakdown:
  - Upload: 0-5%
  - 3D Scanning: 5-60%
  - Vector Extraction: 60-95%
  - Finalization: 95-100%
```

#### **GET /api/download**
```typescript
// src/app/api/download/route.ts

Query Params:
  - jobId: string (required)
  - format?: "svg" | "dxf" (default: "svg")

Response (200 OK):
  Content-Type: image/svg+xml or application/dxf
  Content-Disposition: attachment; filename="design-uuid.svg"
  Body: SVG file bytes

Response (404 Not Found):
  {
    error: "JOB_NOT_FOUND",
    message: "Job not found"
  }

Response (400 Bad Request):
  {
    error: "NOT_READY",
    message: "Job not yet completed"
  }

Implementation:
  - Validate jobId exists
  - Check job status === "completed"
  - If format === "dxf":
    - Convert SVG → DXF (using svg2dxf or similar)
  - Return file with correct headers
  - Log download event (analytics)
  - Optional: set expiration (72 hours)

SVG Optimization (before serving):
  - Remove unnecessary whitespace
  - Optimize paths (reduce precision)
  - Ensure laser-cutter compatible (black lines, no fills)
  - Add metadata comments (object name, date, dimensions)
```

### 3.2 KIRI Engine Integration

```typescript
// src/lib/kiri-engine.ts

interface KiriEngineClient {
  uploadPhotos(photos: File[]): Promise<{
    jobId: string
    estimatedTime: number
  }>
  
  getJobStatus(jobId: string): Promise<{
    status: "processing" | "done" | "error"
    progress: number
    model?: { url: string, format: "glb" | "obj" }
    error?: string
  }>
  
  downloadModel(jobId: string): Promise<ArrayBuffer>
}

Implementation:
  - Use fetch API (no external SDK needed)
  - Base URL: https://api.kiriengine.app
  - Authentication: API key in header
  - Retry logic: exponential backoff (3 retries)
  - Timeout: 10 minutes per job

API Docs Reference: https://www.kiriengine.app/docs/
```

### 3.3 SketchEdge Integration

```typescript
// src/lib/sketch-edge.ts

interface SketchEdgeClient {
  extractLines(input: {
    imageUrl: string // URL to image or GLB render
    smoothness: number // 0-100
    threshold: number // edge detection threshold
  }): Promise<{
    jobId: string
    svgUrl: string
    rawSvg: string
    estimatedTime: number
  }>
  
  getStatus(jobId: string): Promise<{
    status: "processing" | "done" | "error"
    progress: number
    svg?: string
  }>
}

Implementation:
  - Use fetch API
  - Base URL: https://api.sketchedge.net
  - Authentication: API key
  - Render GLB to PNG first (if needed)
  - Send PNG to SketchEdge
  - Get back SVG

API Docs: https://sketchedge.net/en/docs
```

### 3.4 Job Queue (Optional)

```typescript
// src/lib/job-queue.ts (using Bull + Redis, optional)

For MVP, can use simple in-memory queue:
- Process jobs serially (one at a time)
- Store job state in memory + localStorage

For scale (Phase 2):
- Use Bull (Redis-backed job queue)
- Process jobs in parallel
- Persist job history
- Retry failed jobs automatically

Example (simple in-memory):
  const jobQueue = new Map<string, JobStatus>()
  
  async function processJob(jobId: string) {
    const job = jobQueue.get(jobId)
    // ... call KIRI, SketchEdge, etc
  }
```

---

## 4. Error Handling & Recovery

### 4.1 Error Categories

| Category | Example | HTTP Code | User Message | Recovery |
|----------|---------|-----------|--------------|----------|
| Client | Invalid photo format | 400 | "Only JPEG/PNG supported" | Retry with correct format |
| Client | Too few photos | 400 | "Need 15+ photos" | Go back, take more |
| Client | Too large | 413 | "Files too large (limit 200MB)" | Delete some photos, retry |
| Server | KIRI API down | 502 | "3D processing unavailable" | Retry in 5 min |
| Server | SketchEdge API down | 502 | "Vector extraction failed" | Retry in 5 min |
| Server | Timeout | 504 | "Processing taking longer than expected" | Keep polling, or restart |
| Network | Connection lost | - | "Lost connection, will retry..." | Auto-reconnect |
| Unknown | Unexpected error | 500 | "Something went wrong, try again" | Report to support |

### 4.2 Retry Strategy

```typescript
// Exponential backoff: 1s, 2s, 4s, 8s...
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, options)
    } catch (err) {
      if (i === maxRetries - 1) throw err
      const delay = Math.pow(2, i) * 1000
      await new Promise(r => setTimeout(r, delay))
    }
  }
}
```

### 4.3 User Recovery Flows

**API Timeout During 3D Scanning**
```
User sees: "Processing taking longer than expected..."
Options:
  1. Wait (polling continues)
  2. Retry (restart from same photos)
  3. Cancel + Start Over
```

**KIRI Engine API Down**
```
User sees: "3D scanning service temporarily unavailable"
Options:
  1. Retry (checks if API recovered)
  2. Try Different Quality (fast vs. high)
  3. Cancel + Try Later
```

---

## 5. Performance & Optimization

### 5.1 Frontend Performance

| Metric | Target | Strategy |
|--------|--------|----------|
| LCP (Largest Contentful Paint) | <2.5s | Lazy load 3D viewer, optimize images |
| FID (First Input Delay) | <100ms | Defer heavy computations |
| CLS (Cumulative Layout Shift) | <0.1 | Fixed layout dimensions |
| Initial Load | <50KB | Tree-shake unused code |
| Camera Startup | <1s | Start camera immediately on /capture |

### 5.2 Backend Performance

| Operation | Target | Strategy |
|-----------|--------|----------|
| /upload | <1s | Direct file save, no processing |
| /process | <100ms | Queue job, return immediately |
| /status | <100ms | Cached job data |
| KIRI API call | <3min | Depends on KIRI, show ETA |
| SketchEdge API call | <1min | Depends on SketchEdge |

### 5.3 Photo Optimization

```typescript
// Compress photos before upload
async function compressPhoto(blob: Blob): Promise<Blob> {
  const canvas = document.createElement("canvas")
  const img = new Image()
  const url = URL.createObjectURL(blob)
  
  img.src = url
  await new Promise(r => img.onload = r)
  
  // Max 1280x720
  const maxWidth = 1280
  const ratio = maxWidth / img.width
  canvas.width = maxWidth
  canvas.height = img.height * ratio
  
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  
  return new Promise(r => canvas.toBlob(r, "image/jpeg", 0.85))
}

// Result: 5-8MB → 1-2MB per photo
```

---

## 6. Security Considerations

### 6.1 Input Validation
- Validate file MIME types (server-side)
- Validate file sizes
- Sanitize SVG output (remove scripts)
- Rate limit API endpoints

### 6.2 Data Privacy
- Delete uploaded photos after processing (7-day cleanup)
- Do not store personal data
- HTTPS only
- No cookies for tracking

### 6.3 Authentication (Future)
- Optional user accounts
- API keys for commercial use
- OAuth for sign-in (Google, GitHub)

---

## 7. Testing Strategy

### 7.1 Unit Tests
```typescript
// tests/utils/file-handling.test.ts
test("compressPhoto reduces file size", async () => {
  const blob = /* create 5MB photo */
  const compressed = await compressPhoto(blob)
  expect(compressed.size).toBeLessThan(2097152)
})
```

### 7.2 Integration Tests
```typescript
// tests/api/upload.test.ts
test("POST /api/upload accepts multiple photos", async () => {
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData
  })
  expect(response.status).toBe(200)
  expect(response.json().jobId).toBeDefined()
})
```

### 7.3 E2E Tests
```typescript
// Cypress / Playwright
test("Full workflow: capture → process → download", () => {
  cy.visit("/")
  cy.get("[data-test=start]").click()
  cy.get("[data-test=camera]").should("be.visible")
  // ... take photos, process, download
})
```

---

## 8. Deployment Checklist

- [ ] Environment variables configured (.env.local)
- [ ] KIRI Engine API key set
- [ ] SketchEdge API key set
- [ ] Vercel deployment linked
- [ ] Custom domain configured (optional)
- [ ] CORS headers configured
- [ ] Rate limiting enabled
- [ ] Error logging configured (Sentry)
- [ ] Analytics configured (optional)
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Smoke tests pass

---

## 9. Monitoring & Logging

### 9.1 Metrics to Track
- API response times
- Error rates per endpoint
- Job success rates
- Average processing time
- User retention

### 9.2 Logging
```typescript
// Structured logging
logger.info("Job started", { jobId, photoCount })
logger.warn("API timeout", { service: "KIRI", retries: 3 })
logger.error("Job failed", { jobId, reason: error.message })
```

---

## 10. Rollout Plan

### Phase 1: Internal Testing (Week 1)
- Deploy to vercel.app subdomain
- Test on various phones (iOS/Android)
- Load test with synthetic jobs

### Phase 2: Closed Beta (Week 2)
- 50 beta testers
- Gather feedback
- Fix critical bugs

### Phase 3: Public Launch (Week 3)
- Deploy to custom domain
- Monitor for issues
- Iterate based on feedback

---

**Document Version:** 1.0  
**Last Updated:** April 22, 2026  
**Status:** Ready for Implementation

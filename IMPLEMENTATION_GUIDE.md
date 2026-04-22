# Implementation Guide — Build My Paper Lamp

**For: Claude Code Agent**  
**Status:** Ready for Development  
**Estimated Time:** 8-10 hours for Phase 1 MVP

---

## 🎯 Mission

Build a **Next.js 14 web app** that converts phone photos → 3D model → vector outline for paper lamp laser cutting.

**Success Criteria:**
- User takes 15-50 photos on phone
- App uploads + processes via KIRI Engine + SketchEdge APIs
- User downloads laser-cutter-ready SVG
- Works on iOS Safari + Android Chrome
- End-to-end workflow in <10 minutes

---

## 🚀 Start Here

### Phase 1: Foundation (Days 1-2)

#### Day 1: Project Setup + Landing Page
```bash
# 1. Create Next.js 14 project
npx create-next-app@latest build-my-paper-lamp \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --no-git

# 2. Install Shadcn/ui
cd build-my-paper-lamp
npx shadcn-ui@latest init

# 3. Install additional deps
npm install three axios zustand react-hook-form
npm install -D @types/three typescript

# 4. Create folder structure
mkdir -p src/components/ui src/lib src/hooks src/types src/utils

# 5. Start dev server
npm run dev
# Open http://localhost:3000
```

#### Build Pages

**1. Landing Page** (`src/app/page.tsx`)
```typescript
// Hero section with CTA
// Features section (3 features with icons)
// FAQ section
// Simple clean design
// Mobile responsive

Key: Make compelling, show paper lamp examples
```

**2. Capture Page** (`src/app/capture/page.tsx`)
```typescript
// Camera component (with preview)
// Photo gallery (thumbnails)
// Counter "X/15 photos"
// Next button (disabled <15 photos)

Key: Test on actual phone first!
```

**3. Processing Page** (`src/app/processing/page.tsx`)
```typescript
// Loading spinner
// Status messages (real-time)
// Progress bar
// Poll /api/status every 2 seconds

Key: Mock API first, then integrate real APIs
```

**4. Results Page** (`src/app/results/page.tsx`)
```typescript
// 3D model viewer placeholder (static image first)
// SVG preview (embed test SVG)
// Download button
// Copy code button

Key: Use placeholder 3D model initially
```

---

#### Day 2: Components + Hooks

**Camera Component** (`src/components/Camera.tsx`)
```typescript
// Use navigator.mediaDevices.getUserMedia()
// Show video preview
// Canvas for photo capture
// Handle permissions

Test: Open /capture on phone, allow camera, take photo
```

**Photo Gallery Component** (`src/components/PhotoGallery.tsx`)
```typescript
// Map photos as thumbnails
// Delete button per photo
// Show count

Test: Take 20 photos, verify gallery updates
```

**Custom Hooks**
- `useCamera()` — camera control
- `useLocalStorage()` — persist photos
- `useJob()` — poll job status

**Type Definitions** (`src/types/index.ts`)
```typescript
// Photo, UploadResponse, JobStatus, etc
```

---

### Phase 2: Backend APIs (Day 3)

#### API Routes

**1. POST /api/upload** (`src/app/api/upload/route.ts`)
```typescript
// Accept multipart form data (photos)
// Validate: 15-50 files, <200MB total
// Save to temp storage (Node fs for MVP)
// Return jobId + metadata

Test: Use curl or Postman to test upload
curl -X POST http://localhost:3000/api/upload \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.jpg"
```

**2. POST /api/process** (`src/app/api/process/route.ts`)
```typescript
// Accept jobId
// Queue async processing (Bull optional, use simple queue for MVP)
// Return 200 + jobId (non-blocking)

Test: POST with jobId, verify returns immediately
```

**3. GET /api/status** (`src/app/api/status/route.ts`)
```typescript
// Poll endpoint: GET /api/status?jobId=...
// Return job status + progress
// When complete, include results URLs

Test: Poll every 2 seconds, verify progress updates
```

**4. GET /api/download** (`src/app/api/download/route.ts`)
```typescript
// Accept jobId, return SVG file
// Set correct Content-Type + Content-Disposition headers

Test: Download SVG from /api/download?jobId=...
```

---

### Phase 3: API Integration (Days 4-5)

#### KIRI Engine Integration

**1. Get API Key**
- Sign up: https://www.kiriengine.app/
- Get free API key
- Save to .env.local: `KIRI_ENGINE_API_KEY=...`

**2. Implement KIRI Client** (`src/lib/kiri-engine.ts`)
```typescript
// uploadPhotos(photos: File[]) → { jobId, estimatedTime }
// getStatus(jobId: string) → { status, progress, modelUrl }
// downloadModel(jobId: string) → ArrayBuffer

Reference: https://www.kiriengine.app/docs/
```

**3. Integrate into /api/process**
```typescript
// When user clicks "Process":
// 1. Call KIRI uploadPhotos()
// 2. Store KIRI jobId in job record
// 3. Start polling KIRI status
// 4. When KIRI complete, proceed to SketchEdge
```

#### SketchEdge Integration

**1. Get API Key**
- Sign up: https://sketchedge.net/en
- Get free API key
- Save to .env.local: `SKETCH_EDGE_API_KEY=...`

**2. Implement SketchEdge Client** (`src/lib/sketch-edge.ts`)
```typescript
// extractLines(imageUrl: string) → { svgUrl, rawSvg }
// getStatus(jobId: string) → { status, progress, svg }

Reference: https://sketchedge.net/en/docs
```

**3. Integrate into /api/process**
```typescript
// After KIRI completes:
// 1. Download GLB from KIRI
// 2. Render GLB to PNG (or use KIRI's preview image)
// 3. Send PNG to SketchEdge
// 4. Receive SVG outline
// 5. Store in job results
```

---

#### Test Integration End-to-End

```bash
# 1. Start dev server
npm run dev

# 2. Open /capture on phone (or use web camera)
# 3. Take 15+ photos

# 4. Click "Process"
# 5. Watch progress updates in /processing

# 6. View results in /results
# 7. Download SVG

# 8. Open in Inkscape or Chrome to verify
```

---

### Phase 4: Polish & Testing (Day 6)

#### Mobile Optimization
- Test on iPhone + Android
- Touch-friendly buttons
- Responsive layout
- Fast camera startup

#### Error Handling
- Network failures → retry with message
- API timeouts → user-friendly error
- Invalid photos → tips on how to fix
- Permission denied → fallback

#### Performance
- Lazy load 3D viewer (Three.js)
- Compress photos before upload
- Optimize SVG before serving

#### Testing
```bash
# Run tests (if added)
npm run test

# Build production
npm run build

# Test production build locally
npm run start
# http://localhost:3000
```

---

## 📋 Detailed Implementation Checklist

### Frontend
- [ ] **Landing Page** (`/`)
  - [ ] Hero section
  - [ ] Feature highlights
  - [ ] CTA button
  - [ ] Responsive design
  
- [ ] **Capture Page** (`/capture`)
  - [ ] Camera preview
  - [ ] Photo capture button
  - [ ] Photo gallery
  - [ ] Counter (X/15)
  - [ ] Next button (disabled until 15+ photos)
  - [ ] Mobile optimization
  
- [ ] **Processing Page** (`/processing`)
  - [ ] Loading animation
  - [ ] Status messages
  - [ ] Progress bar
  - [ ] Poll /api/status
  - [ ] Handle errors
  
- [ ] **Results Page** (`/results`)
  - [ ] 3D model viewer
  - [ ] SVG preview
  - [ ] Download button
  - [ ] Copy SVG code button
  - [ ] Share button (optional)

### Backend
- [ ] **POST /api/upload**
  - [ ] Accept multipart files
  - [ ] Validate file count + size
  - [ ] Save to storage
  - [ ] Return jobId
  
- [ ] **POST /api/process**
  - [ ] Queue job
  - [ ] Return immediately
  - [ ] Background: call KIRI
  - [ ] Background: call SketchEdge
  
- [ ] **GET /api/status**
  - [ ] Return job status
  - [ ] Calculate progress
  - [ ] Return results when complete
  
- [ ] **GET /api/download**
  - [ ] Return SVG file
  - [ ] Correct headers
  - [ ] Optional: convert to DXF

### API Integration
- [ ] **KIRI Engine**
  - [ ] Create client
  - [ ] Upload photos
  - [ ] Poll status
  - [ ] Download model
  
- [ ] **SketchEdge**
  - [ ] Create client
  - [ ] Send image
  - [ ] Receive SVG
  - [ ] Store results

### Components
- [ ] Camera.tsx
- [ ] PhotoGallery.tsx
- [ ] ModelViewer.tsx (placeholder first)
- [ ] VectorPreview.tsx

### Hooks
- [ ] useCamera()
- [ ] useJob()
- [ ] useLocalStorage()

### Testing
- [ ] Unit tests (utils, helpers)
- [ ] Integration tests (APIs)
- [ ] E2E test (full workflow)
- [ ] Mobile testing (iPhone + Android)

### Deployment
- [ ] Environment variables
- [ ] Vercel setup
- [ ] Custom domain (optional)
- [ ] CORS configured
- [ ] Error logging (Sentry optional)

---

## 🔑 API Keys Required

Before starting, sign up for:

1. **KIRI Engine** → https://www.kiriengine.app/
   - Free tier available
   - 100+ jobs/month

2. **SketchEdge** → https://sketchedge.net/en
   - Free tier available
   - Unlimited extractions

3. **Vercel** → https://vercel.com (for deployment)
   - Free tier sufficient for MVP

### .env.local Template
```env
# KIRI Engine
KIRI_ENGINE_API_KEY=sk_...

# SketchEdge
SKETCH_EDGE_API_KEY=sk_...

# Optional: Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Public
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 🎬 Development Workflow

### Day 1: Setup + UI
```bash
npm run dev
# Code: Landing, Capture, Processing, Results pages
# Test: Browser at http://localhost:3000
```

### Day 2: Components + Logic
```bash
# Code: Camera component, Photo gallery, Hooks
# Test: Capture photos on phone
```

### Day 3: Backend APIs
```bash
# Code: /api/upload, /api/process, /api/status, /api/download
# Test: curl or Postman
```

### Day 4: KIRI Integration
```bash
# Code: KIRI client, integrate into /api/process
# Test: Real 3D scanning
```

### Day 5: SketchEdge Integration
```bash
# Code: SketchEdge client, integrate into /api/process
# Test: Real vector extraction
```

### Day 6: Polish + Deploy
```bash
# Mobile testing
# Error handling
# Performance optimization
# Deploy to Vercel

npm run build
vercel
```

---

## 🧪 Testing Strategy

### Manual Testing Checklist
- [ ] Open app on iPhone (Safari)
- [ ] Open app on Android (Chrome)
- [ ] Grant camera permission
- [ ] Take 15+ photos
- [ ] Click "Process"
- [ ] Wait 2-3 minutes
- [ ] Verify 3D preview shows
- [ ] Verify SVG shows
- [ ] Download SVG
- [ ] Open SVG in Inkscape
- [ ] Verify laser-cutter ready (black lines, correct scale)

### Automated Testing (Optional)
```typescript
// tests/api/upload.test.ts
import { POST } from '@/app/api/upload/route'

test('upload 20 photos', async () => {
  const formData = new FormData()
  // Add files
  
  const request = new Request('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData
  })
  
  const response = await POST(request)
  expect(response.status).toBe(200)
})
```

---

## 📦 Deployment to Vercel

### One-Time Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Link to Vercel
vercel link

# Add environment variables
vercel env add KIRI_ENGINE_API_KEY
vercel env add SKETCH_EDGE_API_KEY

# Deploy
vercel
```

### After Each Push
```bash
# Auto-deploys on push to main
git push origin main
# Wait ~60 seconds
# Check https://vercel.com/dashboard
```

---

## 🆘 Troubleshooting

### Camera Permission Issue
**Problem:** Camera not showing on phone
**Solution:** 
- HTTPS required for camera API
- Localhost works (http://localhost:3000)
- On mobile, HTTPS only

### KIRI API Timeout
**Problem:** 3D scanning takes >5 minutes
**Solution:**
- Check API key is valid
- Reduce photo count (try 20 instead of 50)
- Check KIRI status page

### SketchEdge Fails
**Problem:** Vector extraction returns error
**Solution:**
- Ensure image is valid (PNG/JPG)
- Try different image size
- Check SketchEdge status page

### Photos Not Uploading
**Problem:** Upload fails, network error
**Solution:**
- Check file sizes (<200MB total)
- Compress photos first
- Check internet connection
- Try fewer photos

---

## 🎯 Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Photo capture → download SVG | <10 min |
| Mobile responsiveness | Works iPhone SE+ |
| Error recovery | Can retry failed steps |
| SVG quality | Laser-cutter ready |
| Uptime | 99% (no crashes) |

---

## 📚 Key Files to Create

```
src/
├── app/
│   ├── page.tsx                    # Landing
│   ├── capture/page.tsx            # Camera capture
│   ├── processing/page.tsx         # Job processing
│   ├── results/page.tsx            # Results & download
│   └── api/
│       ├── upload/route.ts         # Photo upload
│       ├── process/route.ts        # Start processing
│       ├── status/route.ts         # Job status polling
│       └── download/route.ts       # Download SVG
│
├── components/
│   ├── Camera.tsx                  # Camera component
│   ├── PhotoGallery.tsx            # Photo gallery
│   ├── ModelViewer.tsx             # 3D viewer
│   └── VectorPreview.tsx           # SVG preview
│
├── lib/
│   ├── kiri-engine.ts              # KIRI API client
│   ├── sketch-edge.ts              # SketchEdge client
│   ├── storage.ts                  # File storage
│   └── api-client.ts               # HTTP utilities
│
├── hooks/
│   ├── useCamera.ts
│   ├── useJob.ts
│   └── useLocalStorage.ts
│
└── types/
    └── index.ts                    # TypeScript types
```

---

## ✅ Done!

Once you complete Phase 1, you'll have a **fully functional MVP**:
- ✅ Users can take photos on phone
- ✅ Photos upload + process via AI
- ✅ Users download laser-cutter-ready SVGs
- ✅ Works on iOS + Android
- ✅ Deployed to Vercel

**Next:** Phase 2 features (3D editor, batch processing, design history) can be built incrementally.

---

**Questions?** Check PROJECT_PLAN.md or TECHNICAL_SPEC.md for more details.

**Ready to start?** Begin with Day 1 setup above. Good luck! 🚀

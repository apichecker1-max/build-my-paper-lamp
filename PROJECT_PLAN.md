# Build My Paper Lamp — Project Plan

**Project:** Web app that converts real-world objects (phone photos) → 3D models → vector outlines for paper lamp laser cutting  
**Platform:** Progressive Web App (PWA) — works on any phone browser  
**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, Shadcn/ui  
**Deployment:** Vercel  
**Status:** 🔴 Not Started — Ready for MVP build

---

## 📋 Project Overview

### **Problem**
Users want to create DIY paper lamps from custom 3D objects (dogs, toucans, etc.) but the workflow is complex:
1. Capture object with phone camera
2. Convert to 3D model
3. Extract vector outlines
4. Unfold to flat patterns
5. Send to laser cutter

### **Solution**
Build a **single integrated web app** that guides users through the entire pipeline with a clean UI, real-time feedback, and downloadable SVG files.

### **Success Criteria**
- ✅ User can upload 15-50 photos from phone
- ✅ App displays 3D model preview
- ✅ App generates vector outline (SVG)
- ✅ SVG is downloadable and laser-cutter ready
- ✅ Works on mobile browsers (iOS Safari, Android Chrome)
- ✅ Process completes in <5 minutes per object

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         PHONE BROWSER (PWA)             │
│  ┌─────────────────────────────────┐   │
│  │  Frontend: Next.js + React      │   │
│  │  - Camera capture UI            │   │
│  │  - Photo gallery                │   │
│  │  - 3D model viewer              │   │
│  │  - Vector preview               │   │
│  └──────────────┬──────────────────┘   │
└─────────────────┼──────────────────────┘
                  │ (HTTP/WebSocket)
        ┌─────────▼──────────┐
        │  BACKEND (Node)    │
        │  ┌──────────────┐  │
        │  │ API Routes:  │  │
        │  │ - /upload    │  │
        │  │ - /process   │  │
        │  │ - /status    │  │
        │  │ - /download  │  │
        │  └──────────────┘  │
        └──────────┬─────────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
   ┌──▼──┐    ┌───▼────┐   ┌───▼────┐
   │KIRI │    │SketchEdge   │ Optional│
   │Engine   │   API    │ (Fallback)│
   │API │    └────────┘   └────────┘
   └─────┘   (Vector)
   (3D)
```

### **Data Flow**
```
User Phone
    ↓
[Camera Capture] → 15-50 photos
    ↓
[LocalStorage] → Queue in browser
    ↓
[Upload] → Send to Backend
    ↓
Backend/Job Queue
    ↓
[KIRI Engine API] → 3D model (OBJ/GLB)
    ↓
[SketchEdge API] → Vector outline (SVG)
    ↓
[SVG Processing] → Clean up, optimize, make laser-ready
    ↓
[WebSocket Update] → Send back to phone
    ↓
User Phone
    ↓
[Display SVG] → Preview + Download
```

---

## 📅 Development Phases

### **Phase 1: MVP (Weeks 1-2)**
**Goal:** End-to-end workflow working (photos → SVG download)

#### **Week 1: Foundation**
- [ ] Set up Next.js 14 project with TypeScript
- [ ] Create folder structure (components, pages, api, lib, utils)
- [ ] Set up Shadcn/ui + Tailwind CSS
- [ ] Design mobile-responsive layout (Figma/code)

#### **Features (Week 1)**
1. **Landing Page** (`/`)
   - Hero section explaining what the app does
   - "Start Capturing" CTA button
   - Feature highlights

2. **Capture Page** (`/capture`)
   - Camera access prompt
   - Real-time camera preview
   - "Take Photo" button
   - Flash toggle (optional)
   - Photo gallery (thumbnails of taken photos)
   - "Proceed to Processing" button
   - Min/max photo validation (15-50 photos)

3. **Processing Page** (`/processing`)
   - Show upload progress
   - Display status messages (uploading, processing, generating vector)
   - Loading animation
   - Estimated time remaining

#### **Backend (Week 1)**
- [ ] Create `/api/upload` endpoint (multipart file upload)
- [ ] Create `/api/process` endpoint (orchestrate KIRI + SketchEdge)
- [ ] Create `/api/status` endpoint (job status polling)
- [ ] Set up error handling & validation

---

#### **Week 2: Integration + Polish**
1. **Results Page** (`/results`)
   - Display 3D model preview (Three.js or Babylon.js)
   - Display vector outline (SVG preview)
   - Download SVG button
   - Copy SVG to clipboard
   - Share/export options

2. **API Integration**
   - [ ] Integrate KIRI Engine API (3D scanning)
   - [ ] Integrate SketchEdge API (vector extraction)
   - [ ] Handle API errors gracefully
   - [ ] Implement retry logic for failed jobs

3. **Local Storage & Offline**
   - [ ] Save photos locally before upload
   - [ ] Persist job status
   - [ ] Allow resume if connection drops

4. **Mobile Optimization**
   - [ ] Test on iOS Safari + Android Chrome
   - [ ] Responsive layout tweaks
   - [ ] Touch-friendly buttons
   - [ ] Vibration feedback on capture

#### **Deliverable: MVP Launch**
- Public Vercel URL
- Works on phone browsers
- Full end-to-end workflow
- User can download laser-cutter-ready SVG

---

### **Phase 2: Enhanced Features (Weeks 3-4)**
- [ ] 3D model viewer with rotation/zoom (Three.js)
- [ ] Vector outline adjustments (line thickness, smoothing)
- [ ] Batch processing (multiple objects at once)
- [ ] History/saved objects
- [ ] Account system (optional: save designs)
- [ ] Sharing designs as link/QR code
- [ ] Material selection (paper weight, color)
- [ ] Unfolding visualization (show how paper unfolds)

### **Phase 3: Production Ready (Weeks 5-6)**
- [ ] Analytics & monitoring
- [ ] Payment integration (if monetizing)
- [ ] Admin dashboard (monitor API usage)
- [ ] Database for user designs (Supabase/Firebase)
- [ ] Email notifications
- [ ] Advanced 3D editing tools

---

## 🛠️ Tech Stack Details

### **Frontend**
```
Framework: Next.js 14 (App Router)
Language: TypeScript
UI Library: Shadcn/ui + Radix UI
Styling: Tailwind CSS
3D Viewer: Three.js or Babylon.js
Camera: react-camera or navigator.mediaDevices API
Storage: localStorage + IndexedDB
State: React Context or Zustand
HTTP Client: fetch or axios
SVG Handling: SVG.js or D3.js
```

### **Backend**
```
Runtime: Node.js 18+
Framework: Express.js (via Next.js API Routes)
File Upload: multer or formidable
Job Queue: Optional (Bull + Redis, if heavy processing)
Monitoring: Sentry or similar
Logging: Winston or pino
Rate Limiting: express-rate-limit
```

### **APIs & Services**
```
3D Scanning: KIRI Engine API (https://www.kiriengine.app/)
Vector Extraction: SketchEdge API (https://sketchedge.net/en) or Vectorizer.AI
3D Model Viewer: Three.js (free) or Babylon.js
Hosting: Vercel (free tier)
Database: Supabase (optional, free tier)
```

---

## 📦 Project Structure

```
build-my-paper-lamp/
├── PROJECT_PLAN.md                 # This file
├── TECHNICAL_SPEC.md              # Detailed technical specs
├── README.md                       # User-facing readme
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── .env.example
├── .env.local                      # API keys (gitignored)
│
├── public/
│   ├── icons/
│   └── images/
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Landing page /
│   │   ├── capture/
│   │   │   └── page.tsx           # Capture page /capture
│   │   ├── processing/
│   │   │   └── page.tsx           # Processing /processing
│   │   ├── results/
│   │   │   └── page.tsx           # Results /results
│   │   └── api/
│   │       ├── upload/route.ts    # POST /api/upload
│   │       ├── process/route.ts   # POST /api/process
│   │       ├── status/route.ts    # GET /api/status?jobId=...
│   │       └── download/route.ts  # GET /api/download?jobId=...
│   │
│   ├── components/
│   │   ├── Camera.tsx             # Camera capture component
│   │   ├── PhotoGallery.tsx       # Display taken photos
│   │   ├── ModelViewer.tsx        # 3D model preview (Three.js)
│   │   ├── VectorPreview.tsx      # SVG preview component
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── ui/                    # Shadcn components
│   │
│   ├── lib/
│   │   ├── api-client.ts          # API wrapper functions
│   │   ├── kiri-engine.ts         # KIRI Engine integration
│   │   ├── sketch-edge.ts         # SketchEdge integration
│   │   ├── storage.ts             # LocalStorage utilities
│   │   ├── svg-utils.ts           # SVG processing helpers
│   │   └── constants.ts           # App-wide constants
│   │
│   ├── hooks/
│   │   ├── useCamera.ts           # Camera capture hook
│   │   ├── useJob.ts              # Job status hook
│   │   └── useLocalStorage.ts     # Storage hook
│   │
│   ├── types/
│   │   └── index.ts               # TypeScript types & interfaces
│   │
│   └── utils/
│       ├── validation.ts          # Input validation
│       ├── file-handling.ts       # File utilities
│       └── error-handling.ts      # Error utilities
│
├── tests/
│   ├── components/
│   ├── api/
│   └── utils/
│
└── docs/
    ├── API.md                     # API documentation
    ├── DEPLOYMENT.md              # Vercel deployment steps
    └── TROUBLESHOOTING.md         # Common issues & fixes
```

---

## 🔑 Key Features (MVP)

### **Feature 1: Photo Capture**
- User opens `/capture` page
- Browser requests camera permission
- Live camera preview shows
- User taps photos (min 15, max 50)
- Photos stored locally (IndexedDB)
- Progress indicator (X/15 photos)
- Continue button only enabled after 15 photos

### **Feature 2: Upload & Processing**
- User taps "Process"
- Photos uploaded to `/api/upload`
- Backend queues job (KIRI Engine + SketchEdge)
- Frontend polls `/api/status?jobId=...` every 2 seconds
- Shows real-time status: "Uploading… Processing 3D… Extracting Vector… Done"
- Estimated time remaining based on typical processing (2-3 min)

### **Feature 3: Results Display**
- 3D model preview (Three.js canvas)
- Vector outline preview (SVG embedded)
- Download SVG button
- SVG optimized for laser cutting (correct scale, clean paths)
- Copy SVG code button

### **Feature 4: Error Handling**
- Camera permission denied → show fallback (upload images)
- API failure → show error + retry button
- Invalid photos (blurry, wrong angle) → warning + tip
- Network timeout → allow resume from last successful step

---

## 📊 API Specifications

### **POST /api/upload**
Upload photos for processing
```
Request:
  - formData with multiple files (photos)
  - metadata: object_name, description (optional)

Response:
  {
    jobId: "uuid",
    status: "uploaded",
    photoCount: 42,
    estimatedTime: 180 // seconds
  }
```

### **POST /api/process**
Start 3D scanning + vector extraction
```
Request:
  {
    jobId: "uuid"
  }

Response:
  {
    jobId: "uuid",
    status: "processing",
    step: "3d_scanning", // or "vector_extraction"
    progress: 45
  }
```

### **GET /api/status?jobId=...**
Poll job status
```
Response:
  {
    jobId: "uuid",
    status: "completed", // or "processing" / "failed"
    step: "vector_extraction",
    progress: 100,
    results: {
      modelUrl: "...", // 3D model GLB
      svgUrl: "...",   // Vector outline SVG
      rawSvg: "..." // SVG source code
    }
  }
```

### **GET /api/download?jobId=...**
Download SVG file
```
Returns: SVG file (application/svg+xml)
```

---

## 🚀 Deployment & Delivery

### **Vercel Setup**
1. Connect GitHub repo to Vercel
2. Set environment variables:
   - `KIRI_ENGINE_API_KEY`
   - `SKETCH_EDGE_API_KEY`
   - `NEXT_PUBLIC_API_URL` (Vercel URL)

3. Deploy on each push to `main`
4. Live URL: `https://build-my-paper-lamp.vercel.app`

### **Database (Optional for MVP)**
- Use Supabase (free tier) for storing jobs + user designs
- Tables:
  - `jobs` (jobId, userId, status, results, createdAt)
  - `designs` (designId, userId, name, svgUrl, createdAt)

---

## 📝 Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Capture photos | <5 min for 25 photos |
| Upload time | <30 sec (25 photos, 5MB) |
| Processing time | <3 min (3D + vector) |
| Total time (start→download) | <10 min |
| Mobile responsiveness | Works on iPhone SE + Android |
| SVG quality | Suitable for 40W laser cutter |
| Error recovery | User can retry failed step |
| Uptime | 99% (no hard failures) |

---

## 🔗 External Dependencies

| Service | Purpose | Cost | Status |
|---------|---------|------|--------|
| KIRI Engine API | 3D scanning from photos | Free tier available | ✅ Active |
| SketchEdge | Vector outline extraction | Free tier available | ✅ Active |
| Vercel | Hosting + deployment | Free tier sufficient | ✅ Active |
| Supabase | Database (optional) | Free tier | ✅ Optional |
| Three.js | 3D viewer | Free (open source) | ✅ Active |

---

## 📚 Implementation Resources

- **KIRI Engine Docs:** https://www.kiriengine.app/
- **SketchEdge API:** https://sketchedge.net/en
- **Next.js Documentation:** https://nextjs.org/docs
- **Shadcn/ui Components:** https://ui.shadcn.com
- **Three.js Guide:** https://threejs.org/docs/
- **Vercel Deployment:** https://vercel.com/docs

---

## ✅ Acceptance Criteria

### **Minimum Viable Product (MVP)**
- [ ] User can open app on phone
- [ ] Camera capture works (iOS + Android)
- [ ] Photos upload successfully
- [ ] Backend processes photos via KIRI Engine
- [ ] SketchEdge generates vector outline
- [ ] SVG preview displays correctly
- [ ] User can download SVG file
- [ ] SVG is compatible with laser cutters (Inkscape validation)
- [ ] App handles errors gracefully
- [ ] Mobile UI is responsive and touch-friendly

### **Nice-to-Have (Phase 2)**
- 3D model viewer (rotate, zoom)
- Vector outline customization
- Batch processing
- Design history/saved projects
- Social sharing

---

## 👥 Team Roles

| Role | Responsibility |
|------|-----------------|
| **Frontend Engineer** | Build React UI, camera integration, 3D viewer |
| **Backend Engineer** | API routes, file handling, API orchestration |
| **DevOps** | Vercel deployment, monitoring, scaling |
| **PM** (You) | Project oversight, stakeholder communication |

---

## 📞 Contacts & Support

- **KIRI Engine Support:** https://www.kiriengine.app/
- **SketchEdge Support:** https://sketchedge.net/en
- **Vercel Support:** https://vercel.com/support
- **Tech Questions:** Ask Claude Code agent

---

## 📄 Document Checklist

- [x] PROJECT_PLAN.md (this file)
- [ ] TECHNICAL_SPEC.md (detailed API specs, error codes)
- [ ] README.md (user-facing guide)
- [ ] API_DOCUMENTATION.md (endpoint details)
- [ ] DEPLOYMENT.md (Vercel setup instructions)
- [ ] TROUBLESHOOTING.md (common issues)

---

**Last Updated:** April 22, 2026  
**Status:** Ready for Development  
**Next Step:** Start Phase 1, Week 1 implementation in Claude Code

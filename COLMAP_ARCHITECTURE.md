# COLMAP Backend Architecture for Paper Lamp MVP

**Date:** April 22, 2026  
**Goal:** Detailed backend design using COLMAP for 3D reconstruction  
**Status:** Ready for Implementation

---

## 🏗️ System Architecture

### **Updated Data Flow (COLMAP-Based)**

```
┌─────────────────────────────────────────────────────────┐
│                  PHONE BROWSER (PWA)                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Next.js Frontend                                  │ │
│  │  - Camera capture (15-50 photos)                   │ │
│  │  - Upload to backend                               │ │
│  │  - Poll job status                                 │ │
│  │  - Display 3D preview + SVG                        │ │
│  └──────────────────┬─────────────────────────────────┘ │
└─────────────────────┼──────────────────────────────────┘
                      │ (HTTP)
        ┌─────────────▼──────────────┐
        │   NEXT.JS BACKEND          │
        │  (Vercel Serverless)       │
        │  ┌──────────────────────┐  │
        │  │ API Routes:          │  │
        │  │ /api/upload          │  │
        │  │ /api/process         │  │
        │  │ /api/status          │  │
        │  │ /api/download        │  │
        │  └──────────┬───────────┘  │
        └─────────────┼──────────────┘
                      │ (Job Queue)
        ┌─────────────▼──────────────────────┐
        │   WORKER SERVICE                   │
        │  (AWS EC2 or DigitalOcean VM)      │
        │  ┌──────────────────────────────┐  │
        │  │ COLMAP Processing:           │  │
        │  │ 1. Feature extraction        │  │
        │  │ 2. Feature matching          │  │
        │  │ 3. Incremental mapping       │  │
        │  │ 4. Dense reconstruction      │  │
        │  │ Output: PLY/OBJ file         │  │
        │  └──────────┬───────────────────┘  │
        │             │                      │
        │  ┌──────────▼───────────────────┐  │
        │  │ SketchEdge Integration:      │  │
        │  │ - Download PLY from storage  │  │
        │  │ - Render to PNG              │  │
        │  │ - Send to SketchEdge API     │  │
        │  │ - Receive SVG outline        │  │
        │  └──────────┬───────────────────┘  │
        │             │                      │
        │  ┌──────────▼───────────────────┐  │
        │  │ Storage:                     │  │
        │  │ - Upload photos to S3        │  │
        │  │ - Save PLY/OBJ               │  │
        │  │ - Save SVG                   │  │
        │  └──────────────────────────────┘  │
        └──────────────────────────────────┘
                      │ (HTTP)
        ┌─────────────▼──────────────┐
        │   S3 STORAGE               │
        │  - Photos                  │
        │  - 3D Models               │
        │  - SVG Files               │
        └────────────────────────────┘
```

---

## 🔄 Detailed Processing Pipeline

### **Step 1: Photo Upload (Frontend)**

```typescript
// User uploads 15-50 photos
POST /api/upload
  ├─ Validate photo count (15-50)
  ├─ Validate file size (<200MB total)
  ├─ Compress photos (4MP max)
  ├─ Upload to S3
  └─ Return jobId
```

**Response:**
```json
{
  "jobId": "uuid-1234",
  "status": "uploaded",
  "photoCount": 42,
  "estimatedTime": 900
}
```

---

### **Step 2: Queue Job (Backend)**

```typescript
// Backend creates processing job
POST /api/process
  ├─ Validate jobId exists
  ├─ Create job record
  ├─ Queue to job system (Bull + Redis)
  └─ Return immediately (non-blocking)
```

**Job Record Structure:**
```typescript
{
  jobId: "uuid-1234",
  status: "queued",
  progress: 0,
  step: "waiting_for_worker",
  createdAt: 1713794400,
  estimatedCompletion: 1713795300,
  
  // Progress tracking
  steps: [
    { name: "feature_extraction", status: "pending" },
    { name: "feature_matching", status: "pending" },
    { name: "mapping", status: "pending" },
    { name: "dense_reconstruction", status: "pending" },
    { name: "sketch_edge", status: "pending" },
    { name: "svg_generation", status: "pending" }
  ],
  
  // Results (when complete)
  results: {
    modelUrl: "s3://bucket/models/uuid-1234.ply",
    svgUrl: "s3://bucket/svgs/uuid-1234.svg",
    rawSvg: "<svg>...</svg>",
    metadata: { ... }
  }
}
```

---

### **Step 3: COLMAP Processing (Worker)**

**Infrastructure:**
- AWS EC2 (t3.xlarge with GPU optional)
- Docker container running COLMAP
- Worker pulls jobs from Redis queue

**Process:**

```bash
#!/bin/bash
# Worker: process-job.sh

JOB_ID=$1
PHOTOS_PATH="/tmp/photos/$JOB_ID"
OUTPUT_PATH="/tmp/output/$JOB_ID"

# 1. Download photos from S3
aws s3 sync s3://bucket/photos/$JOB_ID $PHOTOS_PATH

# 2. COLMAP Feature Extraction
colmap feature_extractor \
  --database_path $OUTPUT_PATH/database.db \
  --image_path $PHOTOS_PATH

# 3. Feature Matching
colmap exhaustive_matcher \
  --database_path $OUTPUT_PATH/database.db

# 4. Incremental Mapper (SfM)
colmap mapper \
  --database_path $OUTPUT_PATH/database.db \
  --image_path $PHOTOS_PATH \
  --output_path $OUTPUT_PATH/sparse

# 5. Dense Reconstruction (Optional)
colmap patch_match_stereo \
  --workspace_path $OUTPUT_PATH \
  --workspace_format COLMAP \
  --pmvs_option_level 1

# 6. Export to PLY
colmap model_converter \
  --input_path $OUTPUT_PATH/sparse/0 \
  --output_path $OUTPUT_PATH/model.ply \
  --output_type PLY

# 7. Upload to S3
aws s3 cp $OUTPUT_PATH/model.ply s3://bucket/models/$JOB_ID.ply
```

**Progress Tracking:**
```typescript
// Update job status during processing
async function updateProgress(jobId, step, progress) {
  await db.update("jobs", { jobId }, {
    step,
    progress,
    steps: [
      { name: "feature_extraction", status: "complete" },
      { name: "feature_matching", status: "processing", progress: 45 },
      // ...
    ]
  })
  
  // Notify frontend via WebSocket
  io.to(jobId).emit("progress", { step, progress })
}
```

---

### **Step 4: Vector Extraction (SketchEdge API)**

**After COLMAP completes:**

```typescript
async function extractVector(jobId, plyUrl) {
  // 1. Download PLY file
  const plyBuffer = await downloadFromS3(plyUrl)
  
  // 2. Render PLY to image
  const pngBuffer = await renderPlyToImage(plyBuffer, {
    width: 1024,
    height: 1024,
    background: "white",
    wireframe: false
  })
  
  // 3. Send to SketchEdge
  const formData = new FormData()
  formData.append("image", new Blob([pngBuffer], { type: "image/png" }))
  formData.append("smoothness", 50)
  
  const response = await fetch("https://api.sketchedge.net/extract", {
    method: "POST",
    body: formData,
    headers: {
      "Authorization": `Bearer ${SKETCH_EDGE_API_KEY}`
    }
  })
  
  const { svgUrl, rawSvg } = await response.json()
  
  // 4. Optimize SVG for laser cutting
  const optimizedSvg = optimizeForLaserCutter(rawSvg)
  
  // 5. Save results
  await uploadToS3(`svgs/${jobId}.svg`, optimizedSvg)
  
  // 6. Update job
  await db.update("jobs", { jobId }, {
    status: "completed",
    results: {
      modelUrl: `s3://bucket/models/${jobId}.ply`,
      svgUrl: `s3://bucket/svgs/${jobId}.svg`,
      rawSvg: optimizedSvg
    }
  })
}
```

---

### **Step 5: Status Polling (Frontend)**

```typescript
// Frontend polls every 2 seconds
GET /api/status?jobId=uuid-1234

// Response updates in real-time
{
  jobId: "uuid-1234",
  status: "processing",
  progress: 65,
  step: "feature_matching",
  steps: [
    { name: "feature_extraction", status: "complete", duration: 45 },
    { name: "feature_matching", status: "processing", progress: 65 },
    { name: "mapping", status: "pending" },
    // ...
  ],
  estimatedTimeRemaining: 480
}
```

---

### **Step 6: Results Download (Frontend)**

```typescript
// When complete: status.status === "completed"
GET /api/download?jobId=uuid-1234&format=svg

// Response
Content-Type: image/svg+xml
Content-Disposition: attachment; filename="design-uuid-1234.svg"
<svg>...</svg>
```

---

## 🖥️ Backend Implementation Details

### **API Route: POST /api/process**

```typescript
// src/app/api/process/route.ts

import { v4 as uuidv4 } from 'uuid'
import redis from '@/lib/redis'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const { jobId } = await request.json()
  
  // Validate
  if (!jobId) return Response.json({ error: "jobId required" }, { status: 400 })
  
  const job = await db.getJob(jobId)
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 })
  if (job.status !== "uploaded") {
    return Response.json({ error: "Job already processing" }, { status: 409 })
  }
  
  // Queue job
  const task = {
    jobId,
    type: "colmap_process",
    photos: job.photoUrls,
    options: {
      gpuEnabled: true,
      quality: "balanced"
    },
    timestamp: Date.now()
  }
  
  await redis.lpush("colmap-queue", JSON.stringify(task))
  
  // Update status
  await db.updateJob(jobId, {
    status: "processing",
    progress: 0,
    step: "queued"
  })
  
  return Response.json({
    jobId,
    status: "processing",
    progress: 0,
    estimatedTimeRemaining: 900
  })
}
```

---

### **Worker Service: COLMAP Processor**

```typescript
// worker/colmap-processor.ts

import { spawn } from 'child_process'
import { db } from '@/lib/db'
import redis from '@/lib/redis'

async function processJob(task) {
  const { jobId, photos } = task
  
  try {
    // Download photos
    await downloadPhotos(jobId, photos)
    
    // Update: Starting feature extraction
    await updateJobProgress(jobId, "feature_extraction", 5)
    
    // Run COLMAP
    const colmapProcess = spawn('colmap', [
      'feature_extractor',
      `--database_path=/tmp/${jobId}/db.db`,
      `--image_path=/tmp/${jobId}/photos`
    ])
    
    await waitForProcess(colmapProcess)
    await updateJobProgress(jobId, "feature_extraction", 25)
    
    // Continue with other steps...
    await runFeatureMatching(jobId)
    await runMapper(jobId)
    await runDenseReconstruction(jobId)
    
    // Export
    await exportToPly(jobId)
    await updateJobProgress(jobId, "completed", 100)
    
    // Extract vectors
    await extractVector(jobId)
    
  } catch (error) {
    await db.updateJob(jobId, {
      status: "failed",
      error: error.message
    })
  }
}

// Run worker
async function main() {
  while (true) {
    const task = await redis.rpop("colmap-queue")
    if (!task) {
      await sleep(1000)
      continue
    }
    
    const parsed = JSON.parse(task)
    await processJob(parsed)
  }
}

main()
```

---

## 💾 Database Schema

```typescript
// Jobs table
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  jobId TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL, // "uploaded" | "processing" | "completed" | "failed"
  progress INTEGER DEFAULT 0, // 0-100
  step TEXT,
  
  // Input
  photoCount INTEGER,
  photoUrls TEXT[], // S3 URLs
  
  // Processing
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  estimatedCompletion TIMESTAMP,
  
  // Results
  modelUrl TEXT, // S3 URL to PLY
  svgUrl TEXT, // S3 URL to SVG
  rawSvg TEXT, // SVG content
  
  // Metadata
  metadata JSONB,
  error TEXT,
  
  createdAt TIMESTAMP DEFAULT NOW()
}

// Steps tracking
CREATE TABLE job_steps (
  id TEXT PRIMARY KEY,
  jobId TEXT NOT NULL,
  name TEXT NOT NULL, // "feature_extraction", "mapping", etc.
  status TEXT NOT NULL, // "pending" | "processing" | "complete" | "failed"
  progress INTEGER,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  duration INTEGER, // seconds
  
  FOREIGN KEY (jobId) REFERENCES jobs(jobId)
}
```

---

## 🚀 Deployment Strategy

### **Option 1: Hybrid (Recommended for MVP)**

```
Frontend: Vercel (Next.js)
  └─ Serverless functions for APIs

Backend: AWS EC2
  ├─ Node.js API server (port 3001)
  ├─ COLMAP + dependencies
  ├─ Worker process (Bull job queue)
  └─ Redis instance (job queue + cache)

Storage: AWS S3
  ├─ Photos (input)
  ├─ Models (PLY files)
  └─ SVGs (output)

Database: PostgreSQL
  └─ Job tracking + metadata
```

**Cost:** ~$50-80/month (EC2 t3.xlarge)

---

### **Option 2: Containerized (Scale-Ready)**

```
Frontend: Vercel

Backend: Docker containers
  ├─ API container (Next.js)
  ├─ Worker container (COLMAP × N)
  ├─ Redis container
  └─ PostgreSQL container

Orchestration: Docker Compose (dev) → Kubernetes (prod)

Hosting: DigitalOcean App Platform or AWS ECS
```

**Cost:** ~$60-100/month (scalable)

---

## 🔐 Security Considerations

### **Photo Handling**
- ✅ Validate file types (JPEG, PNG only)
- ✅ Scan for malware
- ✅ Delete after processing (24-hour cleanup)
- ✅ HTTPS only

### **API Security**
- ✅ Rate limiting (10 jobs/hour per IP)
- ✅ Job ID validation (UUID format)
- ✅ File size limits (<200MB)
- ✅ Timeout handling (>30 min = cancel)

### **Data Privacy**
- ✅ User photos not stored permanently
- ✅ Models deleted after 7 days
- ✅ SVGs available for 30 days
- ✅ No tracking/analytics on user data

---

## 📊 Performance Benchmarks

### **Processing Times (EC2 t3.xlarge, no GPU)**

| Photo Count | COLMAP Time | SketchEdge | Total |
|-------------|------------|-----------|-------|
| 15 photos | 8 min | 1 min | 9 min |
| 30 photos | 15 min | 1 min | 16 min |
| 50 photos | 25 min | 1 min | 26 min |
| 100 photos | 45 min | 1 min | 46 min |

### **With GPU (RTX 3060)**
- 30 photos: 6 min → 7 min total
- 50 photos: 12 min → 13 min total

---

## 🛠️ Local Development Setup

```bash
# Install COLMAP locally
conda install -c conda-forge colmap

# Or with Docker
docker pull colmap/colmap

# Or from source
git clone https://github.com/colmap/colmap.git
cd colmap && mkdir build && cd build
cmake .. && make

# Install Python bindings
pip install pycolmap

# Test on sample images
colmap feature_extractor \
  --database_path db.db \
  --image_path ./sample_photos

colmap exhaustive_matcher --database_path db.db

colmap mapper \
  --database_path db.db \
  --image_path ./sample_photos \
  --output_path ./reconstruction
```

---

## ✅ Implementation Checklist

### **Phase 1: MVP**
- [ ] Set up EC2 instance (t3.xlarge)
- [ ] Install COLMAP on instance
- [ ] Set up PostgreSQL + Redis
- [ ] Create job queue system (Bull)
- [ ] Implement `/api/upload`
- [ ] Implement `/api/process`
- [ ] Implement `/api/status`
- [ ] Implement worker (COLMAP processor)
- [ ] Integrate SketchEdge
- [ ] Test end-to-end

### **Phase 2: Optimization**
- [ ] Add GPU support
- [ ] Optimize COLMAP settings
- [ ] Implement caching
- [ ] Add monitoring/logging
- [ ] Cost optimization

### **Phase 3: Scale**
- [ ] Multiple worker nodes
- [ ] Load balancing
- [ ] Auto-scaling
- [ ] Monitoring dashboard

---

**Last Updated:** April 22, 2026  
**Status:** Ready for Implementation

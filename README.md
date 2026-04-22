# Build My Paper Lamp 🦜

**Transform any object into a custom DIY paper lamp in minutes!**

Take photos of a dog, toucan, or any object → AI converts it to 3D → Generate vector outlines → Print & cut with laser cutter → Assemble into a glowing paper lamp.

🚀 **[Try the App](https://build-my-paper-lamp.vercel.app)** (Coming Soon)

---

## What is This?

A web app that simplifies the entire paper lamp creation workflow:

1. **📸 Capture:** Take 15-50 photos of your object with your phone
2. **🤖 Process:** AI scans photos → creates 3D model
3. **📐 Extract:** Vector outline is automatically generated
4. **🖨️ Download:** Get a laser-cutter-ready SVG file
5. **✂️ Make:** Print, cut, glue, add light → Done!

**No 3D modeling skills required.** No Blender. No laser cutter software knowledge needed. Just photos → app → SVG → laser cutter.

---

## Features

### MVP (Phase 1)
- ✅ Real-time camera capture on mobile
- ✅ AI-powered 3D scanning (KIRI Engine)
- ✅ Automatic vector extraction (SketchEdge)
- ✅ Live progress tracking
- ✅ 3D model preview (interactive)
- ✅ SVG vector preview
- ✅ One-click download (laser-ready)
- ✅ Mobile-first design
- ✅ Works on iOS + Android

### Phase 2 (Planned)
- 🔜 3D model editor (adjust scale, rotate)
- 🔜 Vector adjustments (line thickness, smoothing)
- 🔜 Batch processing (create multiple lamps at once)
- 🔜 Design history (save favorite designs)
- 🔜 Paper/material selection (weight, color)
- 🔜 Assembly guides (step-by-step instructions)

### Phase 3 (Future)
- 🔮 AI-assisted folding patterns
- 🔮 Unfolding visualization
- 🔮 E-commerce integration (order pre-cut kits)
- 🔮 Community gallery (share your designs)

---

## How It Works

### The Pipeline

```
📱 YOUR PHONE
    ↓
  📸 Take 15-50 photos (walk around the object)
    ↓
💾 Photos stored locally in browser
    ↓
🚀 Click "Process" → upload to server
    ↓
🤖 KIRI Engine API
    • Photogrammetry + AI
    • Generates 3D model (OBJ/GLB)
    • 2-3 minutes
    ↓
🎨 SketchEdge API
    • Vector outline extraction
    • Silhouette edge detection
    • Generates SVG (laser-ready)
    • 30-60 seconds
    ↓
📊 Results in App
    • 3D model preview (interactive)
    • SVG vector outline preview
    • Download button
    ↓
📥 Download SVG
    • Use in Inkscape
    • Send to laser cutter
    • Print, cut, glue, add light!
```

### Technology Stack

**Frontend:**
- Next.js 14 (React + TypeScript)
- Shadcn/ui components
- Tailwind CSS
- Three.js (3D viewer)
- Camera API (phone capture)

**Backend:**
- Node.js + Express
- KIRI Engine API (3D scanning)
- SketchEdge API (vector extraction)

**Hosting:**
- Vercel (frontend + backend)
- Free tier supports MVP

---

## Quick Start

### For Users (App)

1. Open **[https://build-my-paper-lamp.vercel.app](https://build-my-paper-lamp.vercel.app)** on your phone
2. Click **"Start Creating"**
3. Allow camera permission
4. Take **15-50 photos** of your object (walk around it)
5. Click **"Process"**
6. Wait 2-3 minutes while AI processes
7. Download the **SVG file**
8. Open in **Inkscape** or send to **laser cutter**
9. Print, cut, glue, add light → **Done!** 🎉

### For Developers (Build from Source)

#### Prerequisites
- Node.js 18+
- Git
- KIRI Engine API key (free: https://www.kiriengine.app/)
- SketchEdge API key (free: https://sketchedge.net/en)

#### Setup

```bash
# Clone the repo
git clone https://github.com/apichecker1-max/build-my-paper-lamp.git
cd build-my-paper-lamp

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your API keys
# KIRI_ENGINE_API_KEY=...
# SKETCH_EDGE_API_KEY=...

# Start dev server
npm run dev

# Open http://localhost:3000
```

#### Build for Production

```bash
# Build
npm run build

# Test production build locally
npm run start

# Deploy to Vercel (one-click)
npm i -g vercel
vercel
```

---

## Documentation

### For Users
- **[Getting Started Guide](docs/GETTING_STARTED.md)** — Step-by-step tutorial
- **[FAQ](docs/FAQ.md)** — Common questions
- **[Tips & Tricks](docs/TIPS.md)** — Get better results

### For Developers
- **[PROJECT_PLAN.md](PROJECT_PLAN.md)** — High-level project overview
- **[TECHNICAL_SPEC.md](TECHNICAL_SPEC.md)** — Detailed technical architecture
- **[API_DOCUMENTATION.md](docs/API.md)** — Backend endpoint reference
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** — How to deploy to Vercel
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** — Common issues & fixes

---

## Project Structure

```
build-my-paper-lamp/
├── PROJECT_PLAN.md           # Project overview & phases
├── TECHNICAL_SPEC.md         # Detailed technical specs
├── README.md                 # This file
├── package.json
├── next.config.js
├── tailwind.config.js
│
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Landing page
│   │   ├── capture/          # Camera capture page
│   │   ├── processing/       # Job processing page
│   │   ├── results/          # Results & download page
│   │   └── api/              # Backend routes
│   │       ├── upload/
│   │       ├── process/
│   │       ├── status/
│   │       └── download/
│   │
│   ├── components/           # React components
│   ├── lib/                  # Utilities & API clients
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript definitions
│
├── public/                   # Static assets
├── docs/                     # Documentation
└── tests/                    # Test files
```

---

## How to Get Better Results

### 📸 Photography Tips
1. **Good lighting** — Bright, even lighting (avoid shadows)
2. **Many angles** — Walk around object, capture all sides
3. **Close-ups** — Include detail photos
4. **Focus** — Make sure photos are sharp (not blurry)
5. **Variety** — Mix wide shots + detail shots

### 📊 For Complex Objects
- Small objects: 20-30 photos
- Medium objects: 30-50 photos
- Complex geometry: 50+ photos

### 🖨️ Laser Cutter Tips
1. Get **material thickness right** (3mm cardstock works great)
2. Test cut **a small piece first**
3. Adjust **power/speed** based on material
4. Use **masking tape** on back (prevents scorch marks)
5. **Sand edges** gently for smooth assembly

---

## FAQ

**Q: Do I need experience with 3D modeling?**  
A: No! The app handles all the hard stuff. You just take photos.

**Q: What phone do I need?**  
A: Any phone with a decent camera (iPhone 11+ or Android equivalent). Newer is better.

**Q: How long does processing take?**  
A: About 2-3 minutes for photos → 3D → vector. Most of that is waiting for AI services.

**Q: Can I use this without a laser cutter?**  
A: Yes! You can:
- Print the SVG template on regular paper, hand-cut it
- Send SVG to a local makerspace (they have laser cutters)
- Order pre-cut kits online (future feature)

**Q: Is my data private?**  
A: Yes. We delete all photos after processing (48 hours). We don't store personal data.

**Q: How much does it cost?**  
A: Free! (Costs us ~$0.50-$1 per job for API calls, but we're covering it during beta)

**Q: Can I commercialize designs?**  
A: Yes, for personal use. For commercial resale, contact us for a license.

---

## Roadmap

### 🟢 Phase 1: MVP (April 2026)
- Basic workflow: capture → 3D → SVG → download
- Works on mobile
- Free to use

### 🟡 Phase 2: Features (May-June 2026)
- 3D model editor
- Batch processing
- Design history
- Material selection

### 🔴 Phase 3: Scale (July 2026+)
- User accounts
- Design marketplace
- Premium features
- E-commerce integration

---

## Support & Feedback

### Report a Bug
- Open an issue on GitHub
- Include photos (if possible)
- Describe what went wrong

### Suggest a Feature
- Discussions tab on GitHub
- Vote on existing suggestions
- Share your use case

### Contact Us
- Email: [support@buildmypaperlamp.com](mailto:support@buildmypaperlamp.com) (future)
- Twitter: [@buildmypaperlamp](https://twitter.com) (future)

---

## Credits

Built with love by [apichecker1-max](https://github.com/apichecker1-max)

### API Partners
- **KIRI Engine** — 3D scanning technology
- **SketchEdge** — AI-powered vector extraction
- **Vercel** — Hosting & deployment

### Open Source
- [Next.js](https://nextjs.org)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn/ui](https://ui.shadcn.com)
- [Three.js](https://threejs.org)

---

## License

MIT License — Build & sell! (With attribution appreciated 💙)

---

## Contributing

Want to help? Pull requests welcome!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Let's make paper lamp creation accessible to everyone!** 🎉

**[Live Demo](https://build-my-paper-lamp.vercel.app)** | **[GitHub](https://github.com/apichecker1-max/build-my-paper-lamp)** | **[Docs](docs/)**

Made with ❤️ for makers, artists, and lamp lovers.

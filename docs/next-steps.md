# SonoTag - Next Steps

> **Last Updated**: January 20, 2026
> **Current Phase**: UI polish - cleaner labels, improved chart tooltips

---

## 🚀 Deployment Plan: Vercel + Railway

### Overview

Two deployment options:

---

### Option A: All-in-One Railway (Simpler) ⭐ RECOMMENDED

Deploy everything on Railway as a single service. FastAPI serves both the API and the React static files.

```
┌───────────────────────────────────────────────────────────────┐
│              RAILWAY - SINGLE DEPLOYMENT                      │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   FastAPI Application                                         │
│   ┌─────────────────────────────────────────────────────────┐ │
│   │                                                         │ │
│   │   GET /                  → React app (index.html)      │ │
│   │   GET /assets/*          → Static files (JS, CSS)      │ │
│   │   POST /classify-local   → FLAM inference              │ │
│   │   POST /prepare-youtube  → Download video              │ │
│   │   GET /stream-video/*    → Serve video (YOUR server)   │ │
│   │                                                         │ │
│   └─────────────────────────────────────────────────────────┘ │
│                                                               │
│   URL: https://sonotag.up.railway.app                        │
│                                                               │
│   ✅ No CORS issues (same origin)                            │
│   ✅ Simpler deployment (one service)                        │
│   ✅ One URL to share                                        │
│   ✅ YouTube audio extraction WORKS                          │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Why CORS is NOT a problem here**:

The YouTube CORS issue only happens when:
- Video is served from `googlevideo.com` (YouTube's CDN)
- Your app is on a different domain
- YouTube doesn't send CORS headers → Browser blocks audio extraction

With Railway:
- YOU download the video to YOUR server
- YOU serve it from `sonotag.up.railway.app/stream-video/...`
- Same origin as your frontend → No CORS restrictions
- Even if different origin, YOU control the headers → Can add CORS headers

**Implementation Steps**:

1. **Build frontend and copy to backend**:
   ```bash
   cd frontend && npm run build
   cp -r dist ../backend/static
   ```

2. **Update FastAPI to serve static files** (`backend/app/main.py`):
   ```python
   from fastapi.staticfiles import StaticFiles
   from fastapi.responses import FileResponse
   import os

   # Serve React static files
   static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
   if os.path.exists(static_dir):
       app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

   @app.get("/")
   async def serve_react_app():
       return FileResponse(os.path.join(static_dir, "index.html"))

   @app.get("/{path:path}")
   async def serve_react_routes(path: str):
       # Serve index.html for client-side routing
       file_path = os.path.join(static_dir, path)
       if os.path.exists(file_path) and os.path.isfile(file_path):
           return FileResponse(file_path)
       return FileResponse(os.path.join(static_dir, "index.html"))
   ```

3. **Create Railway config** (`railway.json`):
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
     }
   }
   ```

4. **Create build script** (`build.sh`):
   ```bash
   #!/bin/bash
   # Build frontend
   cd frontend
   npm ci
   npm run build

   # Copy to backend
   rm -rf ../backend/static
   cp -r dist ../backend/static

   # Install backend deps
   cd ../backend
   pip install -r requirements.txt
   pip install -e ../openflam
   ```

5. **Update `frontend/vite.config.ts`** for relative paths:
   ```typescript
   export default defineConfig({
     base: '/',  // Relative paths for static serving
     // ...
   })
   ```

6. **Deploy**:
   ```bash
   railway login
   railway init
   railway up
   ```

**Checklist**:
- [ ] Create `build.sh` script
- [ ] Update FastAPI to serve static files
- [ ] Update `vite.config.ts` with `base: '/'`
- [ ] Create `railway.json`
- [ ] Test locally: `cd backend && uvicorn app.main:app`
- [ ] Deploy to Railway
- [ ] Test YouTube video + FLAM analysis

---

### Option B: Split Deployment (Vercel + Railway)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────┐              ┌─────────────────────────────┐  │
│   │   VERCEL (Free)     │              │   RAILWAY (Free Tier)       │  │
│   │   ───────────────   │              │   ─────────────────────     │  │
│   │                     │   HTTPS      │                             │  │
│   │   React Frontend    │─────────────▶│   FastAPI Backend           │  │
│   │   - Static build    │              │   - FLAM model loaded       │  │
│   │   - Vite SSG        │◀─────────────│   - yt-dlp for YouTube      │  │
│   │   - Global CDN      │   JSON/Video │   - Audio classification    │  │
│   │                     │              │   - Video streaming         │  │
│   └─────────────────────┘              └─────────────────────────────┘  │
│                                                                         │
│   URL: sonotag.vercel.app              URL: sonotag-api.railway.app    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why This Split?

| Concern | Vercel | Railway |
|---------|--------|---------|
| Static files (React) | ✅ Excellent (CDN) | ⚠️ Overkill |
| Long-running processes | ❌ 10-60s timeout | ✅ No limit |
| Persistent storage | ❌ Ephemeral | ✅ Persistent |
| ML model loading | ❌ Cold starts | ✅ Always warm |
| yt-dlp binary | ❌ Tricky | ✅ Easy |
| Free tier | ✅ Generous | ✅ 500 hrs/mo |

### Phase 1: Railway Backend Setup

**Status**: 📋 Planned

**Prerequisites**:
- [ ] Create Railway account (https://railway.app)
- [ ] Install Railway CLI: `npm install -g @railway/cli`
- [ ] Login: `railway login`

**Create Railway Config** (`railway.json` in project root):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd backend && pip install -e ../openflam && uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Or use Procfile** (`Procfile` in project root):
```
web: cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Backend Deployment Steps**:
- [ ] Create `railway.json` or `Procfile`
- [ ] Add `.railwayignore` (exclude frontend, node_modules, etc.)
- [ ] Set environment variables in Railway dashboard:
  - `PYTHONPATH=/app/openflam/src`
  - `ALLOWED_ORIGINS=https://sonotag.vercel.app`
- [ ] Deploy: `railway up`
- [ ] Note the generated URL (e.g., `sonotag-api.up.railway.app`)

**Files to create**:
```
SonoTag/
├── railway.json          # Railway config
├── Procfile              # Alternative to railway.json
├── .railwayignore        # Exclude frontend
└── backend/
    └── requirements.txt  # Already exists
```

**.railwayignore**:
```
frontend/
node_modules/
*.md
docs/
.git/
```

### Phase 2: Vercel Frontend Setup

**Status**: 📋 Planned

**Prerequisites**:
- [ ] Create Vercel account (https://vercel.com)
- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Login: `vercel login`

**Create Vercel Config** (`vercel.json` in `frontend/`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://sonotag-api.up.railway.app/:path*" }
  ]
}
```

**Frontend Deployment Steps**:
- [ ] Create `frontend/vercel.json`
- [ ] Set environment variable in Vercel dashboard:
  - `VITE_API_BASE_URL=https://sonotag-api.up.railway.app`
- [ ] Deploy: `cd frontend && vercel`
- [ ] Configure custom domain (optional)

**Update `frontend/src/api.ts`** (if not already dynamic):
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
```

### Phase 3: CORS Configuration

**Status**: 📋 Planned

Update `backend/app/main.py` for production CORS:

```python
# Update CORS middleware
origins = [
    "http://localhost:5173",           # Local dev
    "http://localhost:3000",           # Alternative local
    "https://sonotag.vercel.app",      # Production frontend
    "https://*.vercel.app",            # Preview deployments
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Or use environment variable**:
```python
import os

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    # ...
)
```

### Phase 4: Testing & Validation

**Status**: 📋 Planned

- [ ] Test Railway backend health: `curl https://sonotag-api.up.railway.app/health`
- [ ] Test FLAM inference from Railway
- [ ] Test YouTube video preparation on Railway
- [ ] Verify Vercel frontend loads and connects to Railway
- [ ] Test full flow: YouTube URL → Video plays → FLAM analysis
- [ ] Check CORS headers in browser DevTools

### Phase 5: CI/CD (Optional)

**Status**: 📋 Future

Both Vercel and Railway support automatic deployments from GitHub:

- [ ] Connect GitHub repo to Railway (auto-deploy on push to `main`)
- [ ] Connect GitHub repo to Vercel (auto-deploy frontend on push)
- [ ] Set up preview deployments for PRs

### Cost Estimate

⚠️ **Important**: Railway's free tier (0.5GB RAM) is **NOT sufficient** for FLAM. The model needs ~1-2GB RAM.

| Service | Tier | Cost | RAM | Works for FLAM? |
|---------|------|------|-----|-----------------|
| **Railway** | Free | $0 (30-day trial, then $1/mo) | 0.5 GB | ❌ Too small |
| **Railway** | Hobby | $5/mo minimum | 8 GB | ✅ **Recommended** |
| **Railway** | Pro | $20/mo minimum | 32 GB | ✅ Overkill |
| **Vercel** | Free | $0 | N/A (serverless) | ✅ Frontend only |

**Why FLAM needs more RAM**:
- FLAM model weights: ~750MB
- PyTorch runtime: ~200-500MB
- Audio processing buffers: ~100MB
- Total minimum: ~1.2GB

**Realistic Cost for SonoTag**:

| Deployment Option | Monthly Cost |
|-------------------|--------------|
| **Option A**: Railway Hobby (all-in-one) | **$5/mo** |
| **Option B**: Vercel (free) + Railway Hobby | **$5/mo** |

**Alternatives to Railway** (if seeking truly free):

| Platform | Free Tier | RAM | Notes |
|----------|-----------|-----|-------|
| **Render** | 750 hrs/mo | 512MB | ❌ Too small, but can try |
| **Fly.io** | 3 VMs | 256MB | ❌ Too small |
| **Hugging Face Spaces** | Free | 2GB CPU | ✅ Could work! Gradio/Streamlit only |
| **Google Colab** | Free | 12GB | ✅ Works but not a web server |
| **Self-hosted VPS** | ~$4-6/mo | 2GB+ | ✅ Hetzner, DigitalOcean, Linode |

**Recommendation**: Railway Hobby at $5/mo is the simplest path. The $5 credit covers usage, and you get 8GB RAM which is plenty for FLAM.

### Quick Reference Commands

```bash
# Railway
railway login
railway init
railway up
railway logs
railway open  # Open dashboard

# Vercel
vercel login
vercel        # Deploy
vercel --prod # Production deploy
vercel logs
vercel env pull  # Pull env vars locally
```

---

## 🎵 Streaming Platform Integration Roadmap

### Overview

Feasibility analysis for integrating other streaming platforms beyond YouTube.

| Platform | Difficulty | yt-dlp Support | DRM | Feasibility |
|----------|------------|----------------|-----|-------------|
| **Vimeo** | 🟢 Easy | ✅ Yes | ❌ No | ✅ **Ready to implement** |
| **SoundCloud** | 🟢 Easy | ✅ Yes | ❌ No | ✅ **Ready to implement** |
| **Spotify** | 🔴 Hard | ❌ No | ✅ Yes | ❌ **Not feasible** |
| **Apple Music** | 🔴 Hard | ❌ No | ✅ Yes | ❌ **Not feasible** |
| **Twitch** | 🟡 Medium | ✅ Yes | ❌ No | ⚠️ Live streams only |
| **Bandcamp** | 🟢 Easy | ✅ Yes | ❌ No | ✅ **Ready to implement** |

---

### Vimeo Integration

**Status**: 📋 Planned
**Difficulty**: 🟢 Easy
**Effort**: 2-3 hours

**Why it works**:
- yt-dlp fully supports Vimeo downloads
- No DRM protection on standard videos
- Same backend architecture as YouTube
- Vimeo Player API available for embeds

**Implementation**:
```python
# Backend: yt-dlp already handles Vimeo URLs
# Example: https://vimeo.com/123456789

# Same endpoint works:
@app.post("/prepare-video")  # Renamed from prepare-youtube-video
async def prepare_video(request: PrepareVideoRequest):
    # yt-dlp auto-detects platform
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(request.url, download=True)
```

**Frontend changes**:
- [ ] Rename "YouTube" input to "Video URL"
- [ ] Update URL validation regex to accept Vimeo
- [ ] Add Vimeo icon/indicator when Vimeo URL detected
- [ ] Test with various Vimeo video types (public, unlisted)

**Vimeo URL patterns**:
```
https://vimeo.com/123456789
https://vimeo.com/channels/staffpicks/123456789
https://player.vimeo.com/video/123456789
```

---

### SoundCloud Integration

**Status**: 📋 Planned
**Difficulty**: 🟢 Easy
**Effort**: 2-3 hours

**Why it works**:
- yt-dlp fully supports SoundCloud
- No DRM protection
- Audio-only (no video) - simpler!
- Great for music analysis use case

**Implementation**:
```python
# Backend: yt-dlp handles SoundCloud URLs
# Example: https://soundcloud.com/artist/track-name

# For audio-only, simpler options:
ydl_opts = {
    "format": "bestaudio/best",
    "outtmpl": os.path.join(audio_dir, "audio.%(ext)s"),
    "postprocessors": [{
        "key": "FFmpegExtractAudio",
        "preferredcodec": "wav",
        "preferredquality": "192",
    }],
}
```

**Frontend changes**:
- [ ] Accept SoundCloud URLs in video input
- [ ] Show audio-only player (waveform visualization?)
- [ ] Add SoundCloud branding/icon
- [ ] Consider playlist support

**SoundCloud URL patterns**:
```
https://soundcloud.com/artist-name/track-name
https://soundcloud.com/artist-name/sets/playlist-name
https://api.soundcloud.com/tracks/123456789
```

**Bonus**: SoundCloud is ideal for FLAM testing since it's pure audio!

---

### Spotify Integration

**Status**: ❌ Not Feasible
**Difficulty**: 🔴 Hard
**Reason**: DRM + Terms of Service

**Why it doesn't work**:

1. **DRM Protection**: Spotify uses Widevine DRM encryption
   - Audio streams are encrypted
   - Cannot be downloaded or intercepted
   - yt-dlp does NOT support Spotify

2. **No Direct Audio Access**:
   - Spotify Web Playback SDK plays audio but doesn't expose PCM data
   - `createMediaElementSource()` returns silence (DRM protection)
   - Even with Premium account, audio is protected

3. **Terms of Service**:
   - Spotify explicitly prohibits audio extraction
   - API only provides metadata, not audio content
   - Would require reverse engineering (illegal)

**What COULD work (but limited)**:

```
┌─────────────────────────────────────────────────────────────┐
│  Workaround: Microphone + Spotify Desktop                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Spotify Desktop App ─────► Speakers ─────► Microphone    │
│                                    │              │         │
│                                    └──────────────┘         │
│                                    Room audio captured      │
│                                                             │
│   ⚠️ Not ideal: Background noise, quality loss             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Alternative**: Use SoundCloud for similar use case (music analysis).

---

### Apple Music Integration

**Status**: ❌ Not Feasible
**Reason**: Same DRM issues as Spotify

- FairPlay DRM encryption
- No yt-dlp support
- MusicKit API doesn't expose audio data

---

### Twitch Integration

**Status**: ⚠️ Possible (Live Only)
**Difficulty**: 🟡 Medium
**Effort**: 4-6 hours

**What works**:
- yt-dlp supports Twitch VODs and clips
- Live streams can be captured
- No DRM on most content

**Challenges**:
- Live streams are continuous (no defined end)
- Would need chunked processing
- High bandwidth usage

**Implementation idea**:
```python
# Capture chunks from live stream
ydl_opts = {
    "format": "audio_only",
    "live_from_start": False,
    # Would need custom chunking logic
}
```

---

### Bandcamp Integration

**Status**: 📋 Planned (Low Priority)
**Difficulty**: 🟢 Easy
**Effort**: 1-2 hours

**Why it works**:
- yt-dlp fully supports Bandcamp
- No DRM (artist-friendly platform)
- High quality audio available
- Great for indie music analysis

**Bandcamp URL patterns**:
```
https://artist.bandcamp.com/track/song-name
https://artist.bandcamp.com/album/album-name
```

---

### Implementation Priority

| Priority | Platform | Reason |
|----------|----------|--------|
| 1️⃣ | **Vimeo** | Easy win, professional video content |
| 2️⃣ | **SoundCloud** | Audio-only, great for music FLAM testing |
| 3️⃣ | **Bandcamp** | Niche but DRM-free, high quality |
| 4️⃣ | **Twitch** | Complex (live streams), lower priority |
| ❌ | **Spotify** | Not feasible (DRM) |
| ❌ | **Apple Music** | Not feasible (DRM) |

---

### Quick Implementation (Vimeo + SoundCloud)

Since both use the same yt-dlp backend, minimal changes needed:

**Backend** (`backend/app/main.py`):
- [ ] Rename endpoint: `/prepare-youtube-video` → `/prepare-media`
- [ ] Add platform detection (YouTube/Vimeo/SoundCloud)
- [ ] Return platform type in response

**Frontend** (`frontend/src/App.tsx`):
- [ ] Rename UI: "YouTube URL" → "Media URL"
- [ ] Update placeholder: "Paste YouTube, Vimeo, or SoundCloud URL"
- [ ] Add platform icons based on URL detection
- [ ] For SoundCloud: Hide video, show audio waveform

**URL Detection Regex**:
```typescript
const detectPlatform = (url: string): 'youtube' | 'vimeo' | 'soundcloud' | 'unknown' => {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/vimeo\.com/i.test(url)) return 'vimeo';
  if (/soundcloud\.com/i.test(url)) return 'soundcloud';
  return 'unknown';
};
```

---

## ✅ Completed

### FLAM Model Integration
- [x] Install OpenFLAM in backend venv
- [x] Test probe script with audio files
- [x] Add model loading at startup (lifespan context manager)
- [x] Add `/classify` endpoint with audio upload
- [x] Add `/classify-local` endpoint with frame-wise detection (Eq. 7)
- [x] Add resampling to 48kHz (FLAM requirement)
- [x] Cache text embeddings for default prompts
- [x] Return similarity scores as JSON
- [x] Add timing breakdown to API response

### Custom Prompts Feature
- [x] Update `/classify` to accept `prompts` parameter (semicolon-separated)
- [x] Support compound prompts with commas (e.g., "male speech, man speaking")
- [x] Compute text embeddings on-the-fly for custom prompts
- [x] Add textarea input in frontend for user-defined prompts
- [x] Add "Update prompts" button to parse and activate new prompts
- [x] Update heatmap labels to show user's prompts

### Live Frontend Integration
- [x] Capture audio samples using ScriptProcessorNode
- [x] Buffer samples for configurable duration (1-10 seconds slider)
- [x] Convert Float32Array to WAV blob
- [x] Send to `/classify-local` with current prompts
- [x] Update `classificationScores` state with global_scores
- [x] Store `frameScores` for frame-wise temporal data
- [x] Display real FLAM scores in heatmap
- [x] Scores panel with progress bars and raw scores
- [x] Model status indicator
- [x] Inference timing breakdown display

### Audio Processing
- [x] Audio tiling for short clips (repeat to fill 10s window)
- [x] Fixes signal dilution from zero-padding

### Visualization
- [x] Clamped mode (matches paper): negative→0, positive→value
- [x] Relative mode (min-max normalization): worst=0, best=1
- [x] Scale inverted: 1 (bright) at top, 0 (dark) at bottom
- [x] Sliding speed control for spectrogram and heatmap (frame skipping)

### Unbiased Local Similarity (Eq. 7)
- [x] Backend `/classify-local` endpoint with `get_local_similarity(method="unbiased")`
- [x] Returns frame-wise scores (~20 frames per 10s audio, ~0.5s per frame)
- [x] Returns global_scores (max across frames) for display
- [x] Frontend API function `classifyAudioLocal()` in api.ts
- [x] Frontend types `ClassifyLocalResponse` in types.ts
- [x] App.tsx updated to call `/classify-local` endpoint

### YouTube Video Integration
- [x] YouTube URL input and video preparation API
- [x] Floating draggable/resizable video modal
- [x] Live audio extraction from video element
- [x] Real-time FLAM analysis of video audio
- [x] Video modal search icon with inline URL input (keeps current video playing)
- [x] Modal transparency (0.65 opacity) for immersive feel
- [x] **Video modal initial position centered on screen** (not top-left)

### Immersive UI/UX Enhancements
- [x] Glassmorphism design with blur effects and transparency
- [x] Soft fade effect on heatmap/spectrogram left edges (no hard container lines)
- [x] Gradient horizontal borders (solid right → transparent left)
- [x] Floating Labels modal (draggable, transparent)
- [x] Labels button in video modal header
- [x] Labels button in main window (heatmap section)
- [x] Color theme selector (multiple palettes)
- [x] Collapsible settings panel

### Stats Modal Enhancements (NEW)
- [x] **Top-Ranked Count Over Time chart** - Tracks which label was #1 at each inference
  - X-axis: Time (inference number chronologically)
  - Y-axis: Cumulative count of #1 rankings
  - Dynamic top 6 labels displayed
  - **Legend layout: 2 rows × 3 columns grid**
- [x] **PDF chart** - Probability density of median scores (bar histogram)
- [x] **CDF chart** - Cumulative distribution with colored dots per label
  - Hover tooltip shows label name near pointer
- [x] **Score Histogram** - All individual scores with color-coded bins (red/yellow/green)
  - Hover tooltip shows bin count near pointer (dynamic positioning)
- [x] **All Labels table** - Peak/Median gauges for ALL labels, sorted by median or peak
  - Toggle button to switch sort order between Median/Peak
- [x] `topRankedHistory` state tracking which label was #1 at each inference
- [x] Reset button clears all stats including topRankedHistory

### UI Polish
- [x] Removed emojis from status labels (Video playing, Microphone)
- [x] Fixed histogram tooltip positioning bug on right side of chart

### Verified End-to-End
```bash
# Test frame-wise detection with custom prompts:
curl -X POST http://localhost:8000/classify-local \
  -F "audio=@openflam/test/test_data/test_example.wav" \
  -F "prompts=water drops; water dripping; screaming" \
  -F "method=unbiased"

# Response includes:
# - frame_scores: per-frame detection (20 frames × 0.5s each)
# - global_scores: max across frames for each prompt
# - num_frames: number of temporal frames
# - frame_duration_s: ~0.5s per frame
```

---

## 🎯 Immediate Priorities

### 1. YouTube Deployment Options
**Status**: ⚠️ Decision Required
**Effort**: Varies by option

The current YouTube video handling downloads videos to the server, which is **incompatible with Vercel** (serverless).

#### Current Architecture (Problems)
```
Frontend → /prepare-youtube-video → yt-dlp downloads to /tmp → /stream-video/{id}
```

| Issue | Why it's a problem on Vercel |
|-------|------------------------------|
| **Serverless timeouts** | 10s (free) to 60s (pro) max. Video downloads can exceed this. |
| **No persistent filesystem** | `/tmp` is ephemeral, cleared between invocations |
| **Memory limits** | 1GB max per function. Large videos will fail. |
| **yt-dlp binary** | Needs bundling, tricky on serverless |
| **YouTube ToS** | Downloading/re-hosting is technically against ToS |

#### Option 1: Direct YouTube Embed (Simplest) ⭐ Recommended for Vercel
- Use YouTube IFrame API with `origin` parameter
- Extract audio from `<video>` element using Web Audio API (already implemented!)
- No downloading, no ToS issues, works on Vercel
- ⚠️ Limitation: Some videos block embedding, CORS can block audio extraction

**How It Works**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (your-app.vercel.app)                                  │
│  ┌────────────────────┐    ┌─────────────────────────────────┐  │
│  │  YouTube IFrame    │    │  Your React App                 │  │
│  │  ┌──────────────┐  │    │                                 │  │
│  │  │ <video>      │──┼────┼──► Web Audio API                │  │
│  │  │ (embedded)   │  │    │    createMediaElementSource()  │  │
│  │  └──────────────┘  │    │         │                       │  │
│  └────────────────────┘    │         ▼                       │  │
│                            │    ScriptProcessor / Worklet    │  │
│                            │         │                       │  │
│                            │         ▼                       │  │
│                            │    PCM Audio Chunks → FLAM API  │  │
│                            └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**YouTube IFrame API Setup**:
```html
<!-- Load the IFrame Player API -->
<script src="https://www.youtube.com/iframe_api"></script>

<!-- Player container -->
<div id="player"></div>
```

```javascript
// Initialize player
const player = new YT.Player('player', {
  videoId: 'VIDEO_ID',
  playerVars: {
    origin: window.location.origin,  // Required for API access
    enablejsapi: 1,                  // Enable JavaScript API
    controls: 1,
  },
  events: {
    onReady: onPlayerReady,
    onStateChange: onPlayerStateChange,
  }
});
```

**CORS Limitation Explained**:

CORS (Cross-Origin Resource Sharing) is a browser security feature that restricts how resources from one origin can interact with resources from another origin.

```
┌─────────────────────────────────────────────────────────────────┐
│  The CORS Problem with YouTube Audio Extraction                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Your App (https://your-app.vercel.app)                        │
│       │                                                         │
│       │  createMediaElementSource(videoElement)                │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Browser Security Check:                                 │   │
│  │                                                          │   │
│  │  "Is the media from the same origin as the page?"       │   │
│  │                                                          │   │
│  │  Media source: https://googlevideo.com/...              │   │
│  │  Page origin:  https://your-app.vercel.app              │   │
│  │                                                          │   │
│  │  ❌ DIFFERENT ORIGINS → CORS blocks audio data access   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Result: MediaElementAudioSourceNode connects but outputs      │
│          SILENCE (all zeros) to protect user privacy           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why This Happens**:
- YouTube videos are served from `googlevideo.com` CDN
- Your page is served from `your-app.vercel.app`
- Browser treats cross-origin media as "tainted"
- Web Audio API cannot read sample data from tainted media
- The audio PLAYS in the `<video>` element, but you can't ANALYZE it

**When CORS Blocks Audio**:
| Scenario | Audio Plays? | Can Analyze? |
|----------|-------------|--------------|
| Same-origin video (your server) | ✅ Yes | ✅ Yes |
| YouTube embed (IFrame) | ✅ Yes | ❌ No* |
| Cross-origin with `crossorigin="anonymous"` + CORS headers | ✅ Yes | ✅ Yes |
| YouTube direct URL (no CORS headers) | ✅ Yes | ❌ No |

*YouTube does NOT send CORS headers that allow audio extraction.

**Workarounds**:

1. **Backend Proxy (Current Approach)** - Download video server-side, serve with CORS headers
   - ✅ Works reliably
   - ❌ Not Vercel-compatible (needs persistent storage)

2. **Audio Capture via Screen/Tab Sharing** - Use `getDisplayMedia()` with audio
   - ✅ Bypasses CORS entirely
   - ❌ Requires user to grant screen share permission
   - ❌ Captures ALL tab audio, not just video

3. **Browser Extension** - Extensions can bypass CORS restrictions
   - ✅ Full access to audio data
   - ❌ Users must install extension
   - ❌ Not a web-only solution

4. **Accept the Limitation** - Use YouTube for playback, mic for analysis
   - ✅ No CORS issues
   - ❌ Picks up room audio, not clean video audio

**Recommendation for Vercel**:
The cleanest Vercel-compatible approach is **Option 3 (Separate Backend)** where:
- Frontend on Vercel (React app)
- Backend on Railway/Render (FastAPI + yt-dlp)
- Backend serves video with proper CORS headers
- Full audio extraction works

If you MUST be Vercel-only, the **Screen/Tab Sharing workaround** is the most reliable way to capture YouTube audio without a backend.

**Implementation**:
- [ ] Add YouTube IFrame API to index.html
- [ ] Create YouTubePlayer component with API integration
- [ ] Attempt audio extraction with `createMediaElementSource()`
- [ ] Detect CORS failure (silent output) and show user message
- [ ] Offer fallback: "Use microphone to analyze video audio" or "Share tab audio"
- [ ] Test with `youtube-nocookie.com` embed URLs (may have different CORS behavior)

#### Option 2: Proxy Stream URLs Only (No Download)
- Use `yt-dlp` to extract direct stream URLs only (no download)
- Pass URL to frontend `<video>` element
- Audio extraction via Web Audio API
- ⚠️ URLs expire after ~6 hours
- ⚠️ Still needs yt-dlp on backend

**Implementation**:
- [ ] New endpoint `/get-youtube-stream-url` (fast, no download)
- [ ] Frontend handles expired URLs gracefully
- [ ] Backend can be lightweight (no storage needed)

#### Option 3: Separate Backend (Current approach) ⭐ Recommended for full features
- Deploy FastAPI backend on **Railway**, **Render**, **Fly.io**, or VPS
- These support long-running processes and persistent storage
- Deploy React frontend to Vercel separately
- Frontend points to external backend via `VITE_API_BASE_URL`

**Deployment targets**:
| Platform | Free Tier | Persistent Storage | Long-running |
|----------|-----------|-------------------|--------------|
| Railway | 500 hrs/mo | ✅ Yes | ✅ Yes |
| Render | 750 hrs/mo | ✅ Yes | ✅ Yes |
| Fly.io | 3 VMs free | ✅ Yes | ✅ Yes |
| Vercel | Generous | ❌ No | ❌ No (serverless) |

**Implementation**:
- [ ] Create `railway.json` or `render.yaml` for backend
- [ ] Set `VITE_API_BASE_URL` in Vercel env vars
- [ ] Add CORS for production frontend domain

#### Option 4: Hybrid (Vercel + Serverless Backend)
- Frontend on Vercel
- Backend on Vercel Serverless Functions (limited)
- YouTube streaming via Option 2 (URL extraction only)
- Full video download disabled

**Trade-offs**:
- Works for short videos only
- No video caching
- Simpler deployment (single platform)

#### Recommendation
- **For Vercel-only**: Use Option 1 (YouTube Embed) or Option 4 (Hybrid)
- **For full features**: Use Option 3 (Separate Backend on Railway/Render)

---

### 2. ~~Loudness Relabel Postprocessing (Paper Section C.4)~~
**Status**: ✅ Completed
**Effort**: 1-2 hours

Temporal smoothing to clean up noisy frame-wise predictions:

**Algorithm**:
1. Fill short gaps: Negative segments <200ms between positives → mark positive
2. Remove short spikes: Positive segments <40ms in long events → mark negative

**Implemented**:
- [x] `postprocess_frame_scores()` function in backend
- [x] `postprocess: bool = True` parameter to `/classify-local`
- [x] `threshold: float = 0.5` parameter for decision boundary
- [x] Returns both raw `frame_scores` and `smoothed_frame_scores`
- [x] Frontend types updated for new response fields

**Parameters** (from paper):
- RMS window: 2400 samples (at 48kHz)
- Hop size: 1200 samples (50Hz frame rate)
- Min gap: 10 frames (200ms)
- Min spike: 2 frames (40ms)

---

### 2. Backend Thread Pool (Concurrent Inference)
**Status**: Planned
**Effort**: 2-3 hours

Allow multiple inference requests to run concurrently:

**Tasks**:
- [ ] Use `asyncio.to_thread()` or `ThreadPoolExecutor` for FLAM inference
- [ ] Add request queuing for high-load scenarios
- [ ] Add concurrency limit config
- [ ] Benchmark concurrent vs sequential performance

**Files to modify**:
- `backend/app/main.py` - Wrap inference in thread executor

---

### 2. Web Worker for Audio Capture
**Status**: Planned
**Effort**: 3-4 hours

Offload audio processing from main thread:

**Tasks**:
- [ ] Create `frontend/src/workers/audio-worker.ts`
- [ ] Move audio buffering and resampling to worker
- [ ] Use `postMessage` to communicate with main thread
- [ ] Fallback to main thread for browsers without Worker support

**Benefits**:
- Smoother UI during audio processing
- Better performance on lower-end devices
- Enables future overlapping buffer support

---

### 3. Overlapping Buffer Windows
**Status**: Planned
**Effort**: 2 hours

Add sliding window with overlap for smoother detection:

**Tasks**:
- [ ] Add overlap percentage control (0-50%)
- [ ] Implement circular buffer for efficient overlap
- [ ] Stitch inference results correctly
- [ ] Add visual indicator for overlap regions

**Current**:
```
[---4s buffer---][---4s buffer---]  ← Gap at boundaries
```

**With 50% overlap**:
```
[---4s window 1---]
    [---4s window 2---]  ← Catches boundary events
        [---4s window 3---]
```

---

## 🔬 Experimentation Track

### WebGPU for Client-Side Inference
**Status**: Research phase
**Effort**: 1-2 weeks

**Goal**: Run FLAM inference in the browser using WebGPU for reduced latency.

**Approach**:
1. Export FLAM model to ONNX format
2. Use ONNX Runtime Web with WebGPU backend
3. Compare latency vs Python backend

**Challenges**:
- Model size (~750MB) download to browser
- WebGPU browser support (Chrome/Edge primarily)
- MPS (Apple Silicon) not supported by FLAM

---

### Code Optimization
**Status**: Identified opportunities
**Effort**: Variable

| Area | Current | Optimization | Priority |
|------|---------|--------------|----------|
| Audio Capture | ScriptProcessorNode | Web Worker + AudioWorklet | High |
| Backend Inference | Synchronous | Thread Pool | High |
| Buffer Strategy | Non-overlapping | Sliding window with overlap | Medium |
| Canvas Rendering | 2D Context | WebGL / OffscreenCanvas Worker | Medium |
| API Calls | HTTP Polling | WebSocket streaming | Medium |
| FFT Analysis | AnalyserNode | Custom FFT with typed arrays | Low |
| State Updates | useState per value | useReducer batching | Low |

---

## 📋 Backlog

### High Priority
- [ ] Backend thread pool for concurrent inference
- [ ] Web Worker for audio capture
- [ ] Overlapping buffer windows
- [ ] Add WebSocket endpoint for streaming audio/results

### Medium Priority
- [x] **Webcam Floating Modal (Mic Tab)** - Add webcam activation in mic input mode with floating draggable modal (same UX as YouTube video modal). Enable real-time video + audio capture for multimodal scenarios
- [ ] Add local storage for user prompt presets
- [ ] Add export of classification results (CSV/JSON)
- [ ] Desktop wrapper (Tauri/Electron) for local GPU access
- [ ] Add prompt suggestions/autocomplete

### Low Priority
- [ ] Add dark/light theme toggle
- [ ] Add keyboard shortcuts
- [ ] Add i18n support
- [ ] Add PWA support for offline use

---

## 🎥 Vision: Webcam Floating Modal

### Concept
Add webcam activation in the microphone input mode, following the same UX pattern as the YouTube video modal:

**Features**:
- Floating, draggable, resizable modal showing live webcam feed
- Positioned alongside or overlapping the audio visualizations
- Toggle on/off via camera icon in the mic section header
- Continue microphone audio analysis while webcam is active
- Video-only (no webcam audio to avoid feedback) or optional webcam audio mixing

**Use Cases**:
1. **Multimodal analysis**: Combine live audio detection with visual context
2. **Recording scenarios**: Monitor what's being captured visually
3. **Streaming preview**: See yourself while analyzing audio environment
4. **Future vision models**: Prepare for audio-visual foundation models

**Implementation Approach**:
```
[Mic Section Header]
  🎤 Microphone  |  [Start] [Stop]  |  📷 Webcam Toggle

[Floating Webcam Modal] (when active)
  ┌──────────────────────────────────┐
  │ [drag handle]  📷 Webcam   ✕    │
  ├──────────────────────────────────┤
  │                                  │
  │       Live webcam feed           │
  │                                  │
  └──────────────────────────────────┘
```

**Technical Notes**:
- Use `navigator.mediaDevices.getUserMedia({ video: true })` for webcam
- Separate stream from audio capture to avoid conflicts
- Reuse modal drag/resize logic from video modal
- Consider device selection dropdown for multiple cameras

---

## 🧪 Testing Checklist

Before deployment:

- [x] Test FLAM probe script with test audio
- [x] Test `/classify` endpoint with curl
- [x] Test `/classify` with custom prompts
- [x] Test semicolon-separated prompts
- [x] Test compound prompts (commas within)
- [ ] Test mic selection on Chrome, Edge, Safari
- [ ] Test with various sample rates (44.1kHz, 48kHz, 96kHz)
- [ ] Test backend on CPU-only machine
- [ ] Test backend on GPU machine (CUDA)
- [ ] Load test `/classify` endpoint
- [ ] Test permission denial flow
- [ ] Test device disconnect/reconnect

---

## 📚 References

- [OpenFLAM Paper (ICML 2025)](https://openreview.net/forum?id=7fQohcFrxG)
- [OpenFLAM GitHub](https://github.com/adobe-research/openflam)
- [Web Audio API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)

---

## 📝 Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-19 | Migrate frontend to TypeScript | Type safety, better IDE support, no runtime cost |
| 2026-01-19 | Keep Python backend | PyTorch/OpenFLAM are Python-native, ONNX export can come later |
| 2026-01-19 | Exclude openflam/ from git | 750MB+ weights shouldn't be in version control |
| 2026-01-19 | Custom prompts via Form field | Flexibility for users to define any sound categories |
| 2026-01-19 | Semicolon delimiter for prompts | Allows commas within compound prompts |
| 2026-01-19 | Audio tiling instead of padding | Maintains signal strength for short clips |
| 2026-01-19 | Clamped mode as default | Matches FLAM paper visualization |
| 2026-01-19 | Relative mode as option | Amplifies differences for near-zero scores |

---

## 🔑 Key Insight: How FLAM Works

FLAM is **NOT** a fixed-class classifier. It's a language-audio similarity model:

- You provide **text prompts** describing sounds you want to detect
- FLAM returns **similarity scores** (-1 to +1) for each prompt
- **Higher scores** (closer to +1) = better match
- **You define the categories** - can be anything ("water dripping", "my cat meowing", "train horn")
- **Compound prompts** work: "male speech, man speaking" gives richer embeddings

**FLAM expects exactly 480,000 samples** (10 seconds at 48kHz):
- Long audio: truncated to 10 seconds
- Short audio: **tiled (repeated)** to maintain signal strength

**Example**:
```
Audio: Water drops + person screaming

Prompts:              Score:
- water dripping      +0.027 👆 Best match
- screaming           +0.024
- water drops         +0.007
- speech              -0.182 (not a match)
```

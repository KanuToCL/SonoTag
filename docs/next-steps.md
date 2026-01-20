# SonoTag - Next Steps

> **Last Updated**: January 20, 2026
> **Current Phase**: UI polish - cleaner labels, improved chart tooltips

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

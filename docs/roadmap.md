# FLAM Browser App Roadmap

> **Last Updated**: January 19, 2026
> **Current Phase**: Live inference wired ✅ → Optimization & Polish

## Product Vision
Deliver a modern, browser-first audio console that lets users pick a microphone, validate live audio input, and continuously categorize sounds via FLAM with clear latency tradeoffs. The experience should feel seamless locally and in production, with an inference service that can scale independently of the UI.

### Product Tenets
- Real-time first: the UI surfaces latency, buffer size, and confidence clearly.
- Trustworthy diagnostics: show host specs, audio sample rate, and device status.
- Configurable outputs: users can tune frequency range and display rules.
- Deployable by default: the browser app is lightweight and stateless.
- Desktop extension (mid-term): ship a downloadable wrapper (Tauri/Electron) that hosts the same UI but can access local GPU/CPU for high-performance inference.

## Goals
- User opens app and sees audio permissions + device dropdown.
- Default microphone is selected automatically; user can change it.
- FLAM categorizes audio continuously from the selected mic.
- Device dropdown lists all available input devices.
- Same UX locally and on Vercel; config switches are environment based.

## Constraints and Assumptions
- FLAM expects 48kHz audio; browser capture may need resampling.
- Inference is heavy (PyTorch); browser-only inference is likely not viable.
- Vercel has no GPU; plan for a separate inference service if needed.
- OpenFLAM license is non-commercial; confirm usage scope early.

## Integration Strategy (OpenFLAM + Browser)
- Treat `openflam/` as a local dependency and install it editable in the backend (`pip install -e ..\openflam`).
- Run all FLAM inference in the backend; the browser only captures audio and renders UI.
- Load the FLAM model once at backend startup and reuse it across requests.

## Performance Strategy (Real-Time Focus)
- GPU is the main lever; CPU-only likely needs larger buffers (5-10s).
- Precompute text embeddings for fixed prompt lists and reuse them per request.
- Use streaming (WebSocket) for low-latency audio chunks and results.
- Use overlapping windows (e.g., 1-2s hop, 5-10s window) with smoothing.
- Keep resampling server-side to 48kHz with an efficient resampler.

---

## Status

### ✅ Done (v0.3.0)

#### Backend
- [x] FastAPI scaffold with `/health`, `/system-info`, `/recommend-buffer`
- [x] FLAM model loading at startup via lifespan context manager
- [x] `/classify` endpoint with audio upload and 48kHz resampling
- [x] Custom prompts support via `prompts_csv` Form parameter
- [x] `/model-status` endpoint to check if FLAM is ready
- [x] `/prompts` endpoint to get default prompt list
- [x] Timing breakdown in `/classify` response (read, decode, tensor, audio_embed, similarity, total)
- [x] Text embeddings cached for default prompts (compute once at startup)

#### Frontend
- [x] React + Vite with TypeScript (migrated from JavaScript)
- [x] Mic selection, permission flow, device enumeration
- [x] Live level meter and real-time spectrogram
- [x] Frequency range controls with Nyquist display
- [x] System snapshot panel (CPU, memory, GPU, platform)
- [x] FLAM prompts textarea with custom prompt input
- [x] Audio buffer slider (1-10 seconds, controls update frequency)
- [x] Scores panel showing all prompts with progress bars and numerical values
- [x] Heatmap with real FLAM scores (scrolls with time)
- [x] Timing breakdown display (shows backend processing times)
- [x] Model status indicator and inference counter

#### Documentation
- [x] `sonotag-devmate-summary.md` - Comprehensive onboarding guide
- [x] `docs/next-steps.md` - Task tracking and priorities
- [x] `docs/flam_integration.md` - FLAM setup and API reference
- [x] `docs/roadmap.md` - This file
- [x] `CHANGELOG.md` - Version history

#### Performance (M1 Pro CPU)
- [x] FLAM audio embedding: ~94ms
- [x] Backend total: ~95ms
- [x] Frontend round-trip: ~280ms
- [x] 1s buffer = ~1 update/second

---

### 🔄 In Progress

- [ ] WebSocket streaming for lower latency (currently HTTP polling)
- [ ] GPU acceleration testing (CUDA)
- [ ] AudioWorklet migration (replace deprecated ScriptProcessorNode)

---

### 📋 Next Up

#### Short-term (v0.4.0)
- [ ] Add classification toggle (enable/disable live inference)
- [ ] Add minimum confidence threshold slider
- [ ] Add persistence window (only show if confident for N consecutive chunks)
- [ ] Add local storage for user prompt presets
- [ ] Add audio recording/playback for testing prompts

#### Mid-term (v0.5.0)
- [ ] WebSocket endpoint for streaming audio/results
- [ ] Implement real benchmark-based buffer recommendations
- [ ] Add export of classification results (CSV/JSON)
- [ ] Desktop wrapper (Tauri/Electron) for local GPU access

#### Long-term (v1.0.0)
- [ ] WebGPU experimentation for client-side inference
- [ ] ONNX export for cross-platform inference
- [ ] Multi-user support with session management
- [ ] Deploy to production (Vercel + GPU inference service)

---

## Milestones

### ✅ Milestone 1: Discovery and Architecture (Complete)
- [x] Review `openflam` API and model requirements (SR, window size, prompts)
- [x] Decide deployment split: browser UI + Python inference service
- [x] Define audio chunking, latency target, and output schema

### ✅ Milestone 2: Inference Service (Complete)
- [x] Build a Python API that loads FLAM once per process
- [x] Endpoint: `POST /classify` with audio chunk, returns category scores
- [x] Add resampling to 48kHz and basic smoothing for stable output
- [ ] Add a system identification benchmark endpoint for recommendations (partial)

### ✅ Milestone 3: Browser Client (Complete)
- [x] Mic selection UI, mic level meter, and spectrogram
- [x] Capture mic audio via Web Audio, chunk into windows, send to API
- [x] Show live category confidence and recent history
- [x] Add recommended buffer guidance with user override
- [ ] Add display rules: show only categories over threshold for a persistence window (next)

### 🔄 Milestone 4: Local to Vercel Parity (In Progress)
- [x] Use an `API_BASE_URL` env var for local vs deployed
- [x] Add health checks and error states for permissions/no devices
- [ ] Ensure audio capture works on Chrome, Edge, and Safari (needs testing)

### 📋 Milestone 5: Deployment (Not Started)
- [ ] Deploy frontend to Vercel
- [ ] Deploy inference service to a GPU-capable host (or CPU if OK)
- [ ] Configure CORS, auth (if needed), and rate limits

### 📋 Milestone 6: Quality and Monitoring (Not Started)
- [ ] Add basic tests for audio pipeline and API responses
- [ ] Add telemetry for latency and inference errors
- [ ] Document setup and deployment steps

---

## Open Questions
- Where will inference run in production (Vercel API, external service)?
- Target category list: fixed taxonomy or free-form prompts? → **Answered: Free-form prompts**
- Latency and batch size targets for real-time UX? → **Answered: ~100ms inference, 1-5s buffer**
- Expected concurrency and cost constraints?

---

## Deliverables
- `docs/roadmap.md` (this file)
- Browser app with mic selection, mic level, spectrogram, and live categorization UI
- Inference service with documented API, model loading, and deployment scripts

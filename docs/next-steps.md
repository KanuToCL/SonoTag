# SonoTag - Next Steps

> **Last Updated**: January 19, 2026
> **Current Phase**: Live inference complete, optimizations planned

---

## ✅ Completed

### FLAM Model Integration
- [x] Install OpenFLAM in backend venv
- [x] Test probe script with audio files
- [x] Add model loading at startup (lifespan context manager)
- [x] Add `/classify` endpoint with audio upload
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
- [x] Send to `/classify` with current prompts
- [x] Update `classificationScores` state with response
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
- [x] Sliding speed control for spectrogram and heatmap (1-5 px/frame)

### Verified End-to-End
```bash
# Test with custom prompts (semicolon-separated, compound prompts):
curl -X POST http://localhost:8000/classify \
  -F "audio=@openflam/test/test_data/test_example.wav" \
  -F "prompts=water drops; water dripping; screaming; male speech, man speaking"

# Results:
# water dripping: +0.0272 👆 TOP MATCH
# screaming:      +0.0244
# water drops:    +0.0072
```

---

## 🎯 Immediate Priorities

### 1. Backend Thread Pool (Concurrent Inference)
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

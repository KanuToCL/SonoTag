# SonoTag - Next Steps

> **Last Updated**: January 19, 2026
> **Current Phase**: Live inference wiring

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

### Custom Prompts Feature
- [x] Update `/classify` to accept `prompts_csv` parameter
- [x] Compute text embeddings on-the-fly for custom prompts
- [x] Add textarea input in frontend for user-defined prompts
- [x] Add "Update prompts" button to parse and activate new prompts
- [x] Update heatmap labels to show user's prompts

### Verified End-to-End
```bash
# Test with custom prompts (water drops + screaming audio):
curl -X POST http://localhost:8000/classify \
  -F "audio=@openflam/test/test_data/test_example.wav" \
  -F "prompts_csv=water drops, water dripping, screaming, rain"

# Results:
# water dripping: +0.0272 👆 TOP MATCH
# screaming:      +0.0244
# water drops:    +0.0072
```

---

## 🎯 Immediate Priorities

### 1. Wire Frontend to Send Live Audio
**Status**: In Progress
**Effort**: 2-3 hours

Connect the React app to capture audio chunks and send to `/classify`:

**Tasks**:
- [ ] Capture audio samples using ScriptProcessorNode or AudioWorklet
- [ ] Buffer samples for configurable duration (3-5 seconds)
- [ ] Convert Float32Array to WAV blob
- [ ] Send to `/classify` with current prompts
- [ ] Update `classificationScores` state with response
- [ ] Display real FLAM scores in heatmap (replace placeholder)

**Files to modify**:
- `frontend/src/App.tsx` - Add audio buffering and classify loop
- `frontend/src/api.ts` - Already has `classifyAudio()` and `audioSamplesToWavBlob()`

---

### 2. Add Classification Controls
**Status**: Not started
**Effort**: 1 hour

Add UI controls for classification behavior:

- [ ] Toggle: Enable/disable live classification
- [ ] Slider: Classification interval (1-10 seconds)
- [ ] Slider: Minimum confidence threshold for display
- [ ] Status indicator: "Classifying..." / "Ready"

---

### 3. Improve Heatmap Visualization
**Status**: Not started
**Effort**: 1 hour

- [ ] Normalize scores for better visualization (currently -1 to +1 range)
- [ ] Add score labels on hover
- [ ] Highlight top N matches
- [ ] Add persistence window (only show if confident for N consecutive chunks)

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

**Files to study**:
- `openflam/src/openflam/module/model.py` - Model architecture
- `openflam/src/openflam/hook.py` - Inference API

---

### Code Optimization
**Status**: Identified opportunities
**Effort**: Variable

| Area | Current | Optimization | Priority |
|------|---------|--------------|----------|
| Canvas Rendering | 2D Context | WebGL / OffscreenCanvas Worker | Medium |
| Audio Processing | Main Thread | AudioWorklet | High |
| FFT Analysis | AnalyserNode | Custom FFT with typed arrays | Low |
| State Updates | useState per value | useReducer batching | Low |
| API Calls | HTTP Polling | WebSocket streaming | High |

---

## 📋 Backlog

### High Priority
- [ ] Add WebSocket endpoint for streaming audio/results
- [ ] Implement real benchmark-based buffer recommendations
- [ ] Add error states and UX polish for edge cases
- [ ] Add audio recording/playback for testing prompts

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
| 2026-01-19 | HTTP for initial classify | Simpler to debug; upgrade to WebSocket later for streaming |

---

## 🔑 Key Insight: How FLAM Works

FLAM is **NOT** a fixed-class classifier. It's a language-audio similarity model:

- You provide **text prompts** describing sounds you want to detect
- FLAM returns **similarity scores** (-1 to +1) for each prompt
- **Higher scores** (closer to +1) = better match
- **You define the categories** - can be anything ("water dripping", "my cat meowing", "train horn")

**Example**:
```
Audio: Water drops + person screaming

Prompts:              Score:
- water dripping      +0.027 👆 Best match
- screaming           +0.024
- water drops         +0.007
- speech              -0.182 (not a match)
```

This is why the default prompts ("car horn", "gunshot") scored poorly on the test audio - they weren't relevant to the content!

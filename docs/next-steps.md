# SonoTag - Next Steps

> **Last Updated**: January 2026
> **Current Phase**: Pre-inference integration

---

## 🎯 Immediate Priorities

### 1. Test FLAM Inference Locally
**Status**: Ready to test
**Effort**: 5 minutes

```bash
# Activate backend environment
source backend/.venv/bin/activate

# Run the global example (tests model loading + inference)
python openflam/test/global_example.py

# Or use the probe script with any WAV file
python backend/scripts/flam_probe.py --audio openflam/test/test_data/test_example.wav
```

**Expected Output**: Similarity scores for each text prompt vs the audio.

---

### 2. Implement `/classify` Endpoint
**Status**: Not started
**Effort**: 1-2 hours

Add audio classification endpoint to FastAPI backend:

```python
# backend/app/main.py - additions needed:

@app.on_event("startup")
def load_flam():
    """Load FLAM model once at startup"""
    global flam_model, text_embeddings
    # ... model loading code

@app.post("/classify")
async def classify(audio: UploadFile):
    """Classify audio chunk and return similarity scores"""
    # ... inference code
```

**Dependencies to add**:
```bash
pip install python-multipart  # For file uploads
```

**Tasks**:
- [ ] Add model loading at startup
- [ ] Add `/classify` endpoint with audio upload
- [ ] Add resampling to 48kHz (FLAM requirement)
- [ ] Cache text embeddings for prompt list
- [ ] Return similarity scores as JSON

---

### 3. Wire Frontend to Backend Inference
**Status**: Not started
**Effort**: 2-3 hours

Connect the React app to send audio chunks and display results:

**Tasks**:
- [ ] Capture audio chunks from Web Audio API
- [ ] Send chunks to `/classify` endpoint
- [ ] Display category scores in heatmap (replace placeholder)
- [ ] Add confidence threshold filter
- [ ] Add persistence window (show only if confident for N chunks)

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
- [ ] Add configurable prompt list in UI

### Medium Priority
- [ ] Add local storage for user preferences
- [ ] Add audio recording/playback for testing
- [ ] Add export of classification results
- [ ] Desktop wrapper (Tauri/Electron) for local GPU access

### Low Priority
- [ ] Add dark/light theme toggle
- [ ] Add keyboard shortcuts
- [ ] Add i18n support
- [ ] Add PWA support for offline use

---

## 🧪 Testing Checklist

Before deployment:

- [ ] Test mic selection on Chrome, Edge, Safari
- [ ] Test with various sample rates (44.1kHz, 48kHz, 96kHz)
- [ ] Test backend on CPU-only machine
- [ ] Test backend on GPU machine (CUDA)
- [ ] Load test `/classify` endpoint
- [ ] Test permission denial flow
- [ ] Test device disconnect/reconnect

---

## 📚 References

- [OpenFLAM Paper](https://arxiv.org/abs/2505.05335)
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

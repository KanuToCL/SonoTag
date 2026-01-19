# FLAM Browser App Roadmap
- Current focus: integrate FLAM inference with streamed audio for live categorization.

## Project Vision
Deliver a browser-first audio console that lets users pick a microphone, validate live audio input, and continuously categorize sounds via FLAM with clear latency tradeoffs. The experience should feel seamless locally and in production, with an inference service that can scale independently of the UI.

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

## Status
### Done
- Frontend scaffold with mic selection, permission flow, mic level meter, and real-time spectrogram.
- System check panel with browser system info and recommended buffer.
- Backend scaffold (FastAPI) with `/health`, `/system-info`, and `/recommend-buffer`.
- Local dev instructions in `docs/dev.md`.
- Modern UI refresh with frequency range controls and spectrogram axis labels.
- Backend system info expanded to report host CPU and memory.

### In Progress
- Define FLAM inference workflow (prompt list, buffer size, output schema).

### Next
- Integrate FLAM model loading and `POST /classify` in the backend.
- Add audio chunking and resampling to 48kHz in the backend.
- Wire frontend to stream audio chunks to `/classify` and render category results.
- Add real benchmark-based system identification for buffer recommendations.
- Add display settings for confidence threshold and persistence (e.g., 70% for 10 chunks).
- Add error states and UX polish for missing devices or blocked permissions.

## Milestones
1) Discovery and architecture
- Review `openflam` API and model requirements (SR, window size, prompts).
- Decide deployment split: browser UI + Python inference service.
- Define audio chunking, latency target, and output schema.

2) Inference service (local first)
- Build a Python API that loads FLAM once per process.
- Endpoint: `POST /classify` with audio chunk, returns category scores.
- Add resampling to 48kHz and basic smoothing for stable output.
- Add a system identification benchmark endpoint for recommendations.

3) Browser client
- Mic selection UI, mic level meter, and spectrogram.
- Capture mic audio via Web Audio, chunk into windows, send to API.
- Show live category confidence and recent history.
- Add recommended buffer guidance with user override.
- Add display rules: show only categories over threshold for a persistence window.

4) Local to Vercel parity
- Use an `API_BASE_URL` env var for local vs deployed.
- Add health checks and error states for permissions/no devices.
- Ensure audio capture works on Chrome, Edge, and Safari.

5) Deployment
- Deploy frontend to Vercel.
- Deploy inference service to a GPU-capable host (or CPU if OK).
- Configure CORS, auth (if needed), and rate limits.

6) Quality and monitoring
- Add basic tests for audio pipeline and API responses.
- Add telemetry for latency and inference errors.
- Document setup and deployment steps.

## Open Questions
- Where will inference run in production (Vercel API, external service)?
- Target category list: fixed taxonomy or free-form prompts?
- Latency and batch size targets for real-time UX?
- Expected concurrency and cost constraints?

## Deliverables
- `docs/roadmap.md` (this file).
- Browser app with mic selection, mic level, spectrogram, and live categorization UI.
- Inference service with documented API, model loading, and deployment scripts.

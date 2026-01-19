# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-01-19

### Added - Live FLAM Inference Integration
- **Backend `/classify` endpoint**: Accepts audio files, resamples to 48kHz, returns FLAM similarity scores
- **Custom prompts support**: Users can define their own sound categories via comma-separated `prompts_csv` parameter
- **Timing breakdown in API response**: Returns detailed timing for each inference step:
  - `read_ms` - Time to read uploaded audio file
  - `decode_ms` - Time to decode and resample audio (librosa to 48kHz)
  - `tensor_ms` - Time to convert numpy array to PyTorch tensor
  - `audio_embed_ms` - FLAM audio embedding inference time (main bottleneck)
  - `similarity_ms` - Cosine similarity computation time
  - `total_ms` - Total backend processing time
- **`/model-status` endpoint**: Check if FLAM model is loaded and ready
- **`/prompts` endpoint**: Get the current default prompt list

### Added - Frontend Live Classification
- **Scores panel**: Grid display showing all prompts with:
  - Colored progress bars (normalized 0-1 scale)
  - Numerical scores (e.g., +0.027, -0.182)
  - Top match highlighted in orange
- **Heatmap with real FLAM scores**: Canvas scrolls with classification scores over time
- **Audio buffer slider**: Adjustable 1-10 seconds (controls update frequency)
- **Timing breakdown display**: Shows backend processing times in Inference Settings panel
- **Model status indicator**: Shows "ready (cpu)" or "loading..."
- **Inference counter**: Tracks total classifications

### Changed
- **Reduced classification cooldown**: From 3000ms to 500ms for faster updates
- **Heatmap uses refs**: Fixed closure issue where draw loop wasn't seeing updated scores
- **Default prompts updated**: Now includes "water drops", "keyboard typing", "footsteps", "door closing", "rain"
- **Scale labels updated**: Changed from "low/high" to "-1/0/+1" to reflect actual FLAM score range

### Fixed
- **Heatmap not updating**: Now uses `classificationScoresRef` and `promptsRef` to keep draw loop in sync with React state
- **Custom prompts not working**: Added `Form()` import and parameter annotation in FastAPI endpoint

### Technical Notes
- FLAM inference on M1 Pro CPU: ~94ms for 1s audio buffer
- Backend total round-trip: ~95ms (minimal overhead)
- Frontend buffer + inference + network: ~280ms total
- Buffer size determines update frequency (1s buffer = ~1 update/second)

## [0.2.0] - 2026-01-19

### Added - TypeScript Migration & FLAM Scaffolding
- Migrated frontend from JavaScript to TypeScript
- Added `tsconfig.json` and proper type definitions
- Created `frontend/src/types.ts` with shared interfaces
- Created `frontend/src/api.ts` with API utilities:
  - `classifyAudio()` - Send audio to `/classify` endpoint
  - `audioSamplesToWavBlob()` - Convert Float32Array to WAV format
  - `resampleAudio()` - Linear interpolation resampler
  - `getModelStatus()` - Check FLAM model status
- Added FLAM model loading at backend startup via lifespan context manager
- Added scaffolding for live audio capture and classification

### Added - Documentation
- Created `sonotag-devmate-summary.md` - Comprehensive onboarding guide
- Created `docs/next-steps.md` - Task tracking and priorities
- Created `docs/flam_integration.md` - FLAM setup and API reference

## [0.1.0] - 2026-01-18

### Added
- FastAPI backend scaffold with `/health`, `/system-info`, and `/recommend-buffer`.
- React + Vite UI with mic selection, level meter, live spectrogram, and heatmap placeholder.
- Modern UI styling with frequency range controls and axis labels.
- Windows/macOS install, run, and uninstall scripts.
- Roadmap and local development docs.
- First-user `README.md` with quick start and architecture overview.
- FLAM integration guide and a local probe script for experimentation.
- Install scripts now clone OpenFLAM automatically and can download model weights.
- Install scripts can prompt to install Python 3.11 when an unsupported version is detected.
- Install scripts now recreate the backend venv if it uses an unsupported Python version.

### Changed
- Hardened install/run scripts with dependency/version checks and port cleanup.
- Backend system info now reports host CPU and memory details.
- Roadmap expanded with product vision and tenets.
- Product vision updated with a desktop wrapper milestone.

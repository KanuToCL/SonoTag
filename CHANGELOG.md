# Changelog

All notable changes to this project will be documented in this file.

## [0.4.0] - 2026-01-19

### Added - YouTube Live Analysis 🎬
- **YouTube video integration**: Load any YouTube video and analyze its audio in real-time
  - `/prepare-youtube-video` endpoint downloads video via yt-dlp
  - `/stream-video/{video_id}` endpoint streams video for HTML5 playback
  - `/cleanup-video/{video_id}` endpoint cleans up temporary files
  - `/analyze-youtube` endpoint for batch analysis (chunked processing)

- **Dual input mode**: Tab switcher between YouTube and Microphone modes
  - YouTube mode: Paste URL → Download → Play with real-time FLAM analysis
  - Microphone mode: Original live audio capture workflow

- **Music Decomposition mode**: Toggle to switch to 45 instrument prompts
  - Covers strings, woodwinds, brass, percussion, keyboard, and vocals
  - Great for analyzing music composition and identifying instruments

- **Collapsible scores panel**: For large prompt lists (>10)
  - "Expand all" / "Collapse" button
  - Scrollable when collapsed (max 320px height)

- **Sort by score toggle**: Order prompts by highest score first

- **Heatmap improvements**:
  - Labels moved to right side for better readability
  - Dynamic height based on prompt count (min 240px, or 12px per prompt)

### Changed - Installer & Runtime
- **Session cleanup on startup**: Kills stale processes and clears temp files
- **CPU core detection**: Optimizes PyTorch threading (OMP_NUM_THREADS, MKL_NUM_THREADS)
- **Backend health check**: Waits for model to load before opening browser
- **FFmpeg detection**: Optional install prompt for YouTube audio extraction

### Technical Notes
- Video files are cached with hash-based deduplication
- Web Audio API extracts audio from HTML5 video element in real-time
- ScriptProcessorNode buffers audio and triggers classification when buffer is full
- yt-dlp handles video download with format selection (720p max for browser compatibility)

### Known Issues
- Classification continues briefly when video is paused (to be fixed)
- Buffer duration changes require video restart to take effect (to be fixed)

## [0.3.2] - 2026-01-19

### Added
- **Sliding speed control**: Adjustable 1-5 pixels/frame for spectrogram and heatmap scrolling
  - Slower = zoomed in (see more detail per time unit)
  - Faster = compressed (see more history)
- **normalizeScoresRef**: Ref for draw loop to access normalization setting

### Changed
- **Heatmap now respects Relative mode**: Min-max normalization applies to both scores panel AND heatmap when enabled
- **Spectrogram draws multiple columns**: For slide speeds > 1, fills the shifted area properly

### Technical Notes
- Added `slideSpeed` state and UI slider (1-5 px/frame)
- Spectrogram and heatmap shift by `slideSpeed` pixels per frame
- Higher slide speed = more history visible but less temporal resolution

## [0.3.1] - 2026-01-19

### Added
- **Compound prompts support**: Use commas within prompts for richer descriptions (e.g., "male speech, man speaking")
- **Audio tiling**: Short audio is now repeated (tiled) to fill 10 seconds instead of zero-padding, maintaining signal strength
- **Score visualization modes**:
  - **Clamped mode (default)**: Matches FLAM paper - negative→0, positive→value. Scale: 0.0 to 1.0
  - **Relative mode**: Min-max normalization - worst=0, best=1. Amplifies differences for weak signals

### Changed
- **Prompt delimiter changed**: Switched from comma-separated to **semicolon-separated** prompts to allow commas within compound prompts
- **Backend parameter renamed**: `prompts_csv` → `prompts`
- **Heatmap uses clamping**: Negative scores now clamp to 0 (matching paper visualization)
- **Scores panel uses display modes**: Progress bars now use selected visualization mode

### Fixed
- **Custom prompts not updating**: Fixed closure issue where `classifyCurrentBuffer` wasn't seeing updated prompts - now uses `promptsRef.current`
- **Low scores with short audio**: Audio tiling prevents signal dilution from zero-padding

### Technical Notes
- FLAM expects exactly 480,000 samples (10s @ 48kHz)
- Short audio is tiled (repeated) to fill the window
- Backend logs now show audio statistics: min, max, mean, std, rms

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

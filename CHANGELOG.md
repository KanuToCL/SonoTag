# Changelog

All notable changes to this project will be documented in this file.

## [0.4.2] - 2026-01-19

### Added - Immersive Flow Layout ✨
- **New "Immersive Flow" layout**: Full-screen, visualization-first design optimized for real-time audio analysis
  - **Full-width spectrogram & heatmap**: Edge-to-edge visualization with synchronized scroll speeds
  - **Edge fade vignette effect**: Subtle gradient overlay (120px) on left edges for depth
  - **Dynamic label styling**: Labels automatically adjust opacity (0.3→1.0), font-weight (400→700), and color warmth based on classification score
  - **Right-side labels panel**: 220px fixed-width panel with gradient fade, labels stay aligned to heatmap rows
  - **Synchronized canvas widths**: Both spectrogram and heatmap share same visible width via spacer element, ensuring identical scroll speeds

- **Layout toggle**: Switch between "Immersive Flow" and "Classic" layouts
  - Footer button in Immersive mode: "Classic View"
  - Header button in Classic mode: "✨ Immersive View"

- **Settings slide-out panel**: Clean settings UI in Immersive mode
  - Sound categories (prompts) editor
  - Detection mode toggles (relative mode, sort by score)
  - Inference settings (buffer duration, slide speed)
  - Frequency range controls
  - Timing breakdown display
  - System info display

- **Compact footer controls bar**: Bottom bar with:
  - Video player or microphone controls
  - Preset buttons (🎬 Action, 🏈 Sports, 🎵 Music)
  - Buffer duration slider
  - Model status badge with inference count

### Changed
- **Sort by score default**: Now ON by default for better UX in Immersive mode
- **Background color**: Darker base color (#090d12) for better contrast with visualizations
- **Video player size**: Increased from 120×68px to 200×112px for better visibility

### Fixed
- **Heatmap/spectrogram sync**: Heatmap now ALWAYS shifts left regardless of whether scores exist, staying perfectly synchronized with spectrogram
- **Canvas scroll speed mismatch**: Added `.spectrogram-label-spacer` (220px) to match heatmap's label panel width
- **Labels alignment**: Dynamic labels now left-aligned and vertically centered to corresponding heatmap rows
- **JSX structure corruption**: Fixed canvas wrapper hierarchy (spectrogram-canvas-wrap → canvas → spacer)

### Technical Notes
- `getDynamicLabelStyle()` helper function computes opacity, fontWeight, and color based on normalized score
- `promptsWithScores` computed in original order (not sorted) to maintain heatmap row alignment
- CSS flexbox layout with `flex: 1` canvas wrappers and fixed-width spacers for width synchronization
- Settings panel uses overlay + slide-in animation with `transform: translateX()`

## [0.4.1] - 2026-01-19

### Added - Documentation & Planning
- **GUI Layout Proposals**: Created `docs/gui-layout-proposal.md` with 4 layout options:
  - **Focus Mode**: Minimal, visualization-first design
  - **Power User Mode**: All controls visible in sidebar
  - **Immersive Flow** ⭐: Dynamic labels (opacity/weight by score), edge fade vignette, spectrogram↔heatmap sync
  - **Mobile/Compact Mode**: For narrow screens
- **Action Movie preset**: 24 sound prompts for action film analysis (explosions, gunshots, car chases, etc.)
- **Sports preset**: 22 sound prompts for sports broadcast analysis (crowd, whistle, commentary, etc.)
- **Transfer learning roadmap**: Product vision for custom sound fine-tuning in v2.0.0
- **Synchronized visualizations roadmap**: Frame-wise heatmap painting using FLAM's `frame_scores`

### Fixed
- **Video pause/play bug**: Classification now stops when video is paused, buffer clears on pause
- **Buffer duration not updating**: ScriptProcessorNode callback now uses `bufferSecondsRef` to read current value
- **Tab switching continues analysis**: Switching to Microphone tab now stops YouTube analysis and cleans up audio context

### Technical Notes
- Added `youtubeAnalyzingRef` and `bufferSecondsRef` to solve JavaScript closure stale state issue
- Refs keep callbacks in sync with React state changes

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

## [0.3.2]

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

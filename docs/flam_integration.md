# FLAM Integration Next Steps

This document outlines the short-term path to wire OpenFLAM into the backend
and start local experiments without blocking the UI work.

## Prerequisites
- Python 3.10-3.12 (3.11 recommended for OpenFLAM). Install scripts can prompt to install 3.11.
- GPU optional but recommended for real-time.
- OpenFLAM repo cloned in `openflam/`.

## Step 1: Install OpenFLAM in the backend venv
From the repo root:

```bat
call backend\.venv\Scripts\activate.bat
pip install -e openflam
```

macOS:
```bash
source backend/.venv/bin/activate
pip install -e openflam
```

This installs OpenFLAM and its dependencies (torch, librosa, etc).
If you use `install.bat` / `install.command`, the repo clone and install are handled automatically.

## Step 2: Smoke test with a local audio file
Use the probe script in `backend/scripts/flam_probe.py`:

```bat
call backend\.venv\Scripts\activate.bat
python backend\scripts\flam_probe.py --audio path\to\audio.wav
```

macOS:
```bash
source backend/.venv/bin/activate
python backend/scripts/flam_probe.py --audio /path/to/audio.wav
```

## Step 3: Define the inference contract
Decide:
- Prompt list strategy (fixed list vs user input).
- Output schema (top-k scores, confidence threshold, persistence window).
- Window length and hop size (e.g., 10s window / 2s hop).

## Step 4: Backend endpoint
Add `POST /classify` that accepts PCM chunks and returns scores:
- Resample to 48kHz if needed.
- Use a single FLAM instance loaded at startup.
- Cache text embeddings for a fixed prompt list.

## Step 5: Frontend streaming
Send audio chunks and render results:
- WebSocket for low latency.
- Display only labels above threshold for N consecutive chunks.

## Step 6: Performance tuning
- Benchmark on CPU and GPU.
- Add buffer recommendations based on measured throughput.

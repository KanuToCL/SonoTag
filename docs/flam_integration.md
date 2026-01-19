# FLAM Integration Guide

> **Last Updated**: January 19, 2026
> **Status**: ✅ Backend integration complete, wiring frontend in progress

This document covers how to set up and use OpenFLAM in SonoTag.

---

## What is FLAM?

**FLAM** (Frame-Wise Language-Audio Modeling) is a foundation language-audio model from Adobe Research (ICML 2025).

### Key Capabilities
- **Zero-shot sound event detection**: Detect sounds without training on specific classes
- **Large-scale audio retrieval**: Find audio matching natural language descriptions
- **Free-form text prompts**: You define what sounds to detect

### How It Works

FLAM is **NOT** a fixed-class classifier. It's a similarity model:

1. You provide **text prompts** (e.g., "water dripping", "dog barking")
2. FLAM computes **similarity scores** (-1 to +1) between audio and each prompt
3. Higher scores = better match

**Example**:
```
Audio: Water drops + person screaming

Prompts:              Score:
- water dripping      +0.027 👆 Best match
- screaming           +0.024
- water drops         +0.007
- speech              -0.182 (not a match)
```

---

## Prerequisites

- Python 3.10-3.12 (3.11 recommended)
- GPU optional but recommended for real-time inference
- OpenFLAM repo cloned in `openflam/`

---

## Step 1: Install OpenFLAM in the Backend venv

### macOS
```bash
source backend/.venv/bin/activate
pip install -e openflam
```

### Windows
```bat
call backend\.venv\Scripts\activate.bat
pip install -e openflam
```

This installs OpenFLAM and its dependencies (torch, librosa, transformers, etc.).

**Note**: If you used `install.command` or `install.bat`, the repo clone and install are handled automatically.

---

## Step 2: Smoke Test with a Local Audio File

Use the probe script to verify FLAM works:

### macOS
```bash
source backend/.venv/bin/activate
python backend/scripts/flam_probe.py --audio openflam/test/test_data/test_example.wav
```

### Windows
```bat
call backend\.venv\Scripts\activate.bat
python backend\scripts\flam_probe.py --audio openflam\test\test_data\test_example.wav
```

Expected output:
```
Loading FLAM model v1-base on cpu...
Loading audio: openflam/test/test_data/test_example.wav
Audio shape: 480000 samples, 10.00s @ 48000Hz

Similarity scores:
keyboard typing     : -0.0430
engine              : -0.1138
...
```

---

## Step 3: Test the /classify Endpoint

Start the backend:
```bash
source backend/.venv/bin/activate
uvicorn backend.app.main:app --reload --port 8000
```

Wait ~20 seconds for FLAM to load, then test:

### Test with Default Prompts
```bash
curl -X POST http://localhost:8000/classify \
  -F "audio=@openflam/test/test_data/test_example.wav" \
  | python3 -m json.tool
```

### Test with Custom Prompts
```bash
curl -X POST http://localhost:8000/classify \
  -F "audio=@openflam/test/test_data/test_example.wav" \
  -F "prompts_csv=water drops, water dripping, screaming, rain, music" \
  | python3 -m json.tool
```

Expected output:
```json
{
    "scores": {
        "water dripping": 0.0272,
        "screaming": 0.0244,
        "water drops": 0.0072,
        ...
    },
    "prompts": ["water drops", "water dripping", "screaming", "rain", "music"],
    "duration_s": 10.0,
    "sample_rate": 48000,
    "device": "cpu"
}
```

---

## Step 4: API Reference

### GET /model-status

Check if FLAM is loaded:
```bash
curl http://localhost:8000/model-status
```

Response:
```json
{
    "loaded": true,
    "device": "cpu",
    "prompts_cached": true,
    "prompt_count": 10
}
```

### GET /prompts

Get the default prompt list:
```bash
curl http://localhost:8000/prompts
```

Response:
```json
{
    "prompts": ["speech", "music", "applause", ...],
    "count": 10
}
```

### POST /classify

Classify audio against prompts:

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `audio` | File | Yes | Audio file (WAV, MP3, FLAC, etc.) |
| `prompts_csv` | String | No | Comma-separated custom prompts |

**Response**:
```json
{
    "scores": {"prompt1": 0.5, "prompt2": -0.2, ...},
    "prompts": ["prompt1", "prompt2", ...],
    "duration_s": 5.0,
    "sample_rate": 48000,
    "device": "cpu"
}
```

---

## Step 5: Frontend Integration

### Prompt Input

The frontend includes a textarea for custom prompts:
1. Enter comma-separated prompts (e.g., "water drops, screaming, rain")
2. Click "Update prompts"
3. Prompts are sent with each classify request

### API Utilities

Located in `frontend/src/api.ts`:

```typescript
// Classify audio with optional custom prompts
import { classifyAudio, audioSamplesToWavBlob } from './api';

const wavBlob = audioSamplesToWavBlob(samples, 48000);
const result = await classifyAudio(wavBlob, ['water drops', 'screaming']);

console.log(result.scores);
// { "water drops": 0.027, "screaming": 0.024, ... }
```

---

## Step 6: Performance Notes

### Inference Time (v1-base)

| Device | Audio Duration | Inference Time |
|--------|----------------|----------------|
| CPU (M1 Pro) | 5s | ~1.2s |
| CPU (M1 Pro) | 10s | ~1.5s |
| CUDA (RTX 3090) | 5s | ~0.1s |
| CUDA (RTX 3090) | 10s | ~0.15s |

### Memory Usage

| Component | Size |
|-----------|------|
| FLAM checkpoint | ~750MB |
| RoBERTa text encoder | ~500MB |
| HTSAT audio encoder | ~250MB |
| Total GPU/RAM | ~1.5GB |

### Recommendations

- Use **3-5 second audio chunks** for real-time classification
- **Cache text embeddings** for fixed prompt lists (already done in backend)
- Consider **GPU** for real-time (<100ms) classification
- **Batch requests** if processing multiple audio sources

---

## Step 7: Troubleshooting

### "FLAM model not loaded"
- Check backend logs for errors during startup
- Ensure OpenFLAM is installed: `pip install -e openflam`
- Ensure model weights are downloaded: check `openflam_ckpt/` directory

### "Failed to decode audio"
- Ensure file is a valid audio format (WAV, MP3, FLAC)
- Check file isn't corrupted
- Try converting to WAV with ffmpeg: `ffmpeg -i input.mp3 -ar 48000 output.wav`

### Slow inference
- CPU inference is ~10x slower than GPU
- Reduce audio chunk duration
- Consider upgrading to GPU or using smaller model variant

### Custom prompts not working
- Ensure prompts are comma-separated
- Check for leading/trailing whitespace
- Verify backend was restarted after code changes

---

## Model Weights Location

After first run, weights are cached in:
```
openflam_ckpt/
├── open_flam_oct17.pth           # 787MB - Main checkpoint
├── models--kechenadobe--OpenFLAM/  # Hugging Face cache
└── models--roberta-base/          # Text encoder
```

Total: ~1.9GB

---

## References

- [OpenFLAM Paper (ICML 2025)](https://openreview.net/forum?id=7fQohcFrxG)
- [OpenFLAM GitHub](https://github.com/adobe-research/openflam)
- [FLAM Demo](https://openflam.github.io/)

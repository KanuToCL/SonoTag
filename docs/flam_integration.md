# FLAM Integration Guide

> **Last Updated**: January 19, 2026
> **Status**: ✅ Fully integrated with live classification

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

### Audio Input Requirements

FLAM expects **exactly 480,000 samples** (10 seconds at 48kHz). The backend handles this automatically:
- **Longer audio**: Truncated to 10 seconds
- **Shorter audio**: **Tiled (repeated)** to fill 10 seconds - this maintains signal strength

> **Note**: We use tiling instead of zero-padding because padding with silence dilutes the detection signal.

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

### Test with Custom Prompts (Semicolon-Separated)
```bash
curl -X POST http://localhost:8000/classify \
  -F "audio=@openflam/test/test_data/test_example.wav" \
  -F "prompts=water drops; water dripping; screaming; rain; music" \
  | python3 -m json.tool
```

### Test with Compound Prompts
Compound prompts (with commas) describe sounds in multiple ways for better detection:
```bash
curl -X POST http://localhost:8000/classify \
  -F "audio=@openflam/test/test_data/test_example.wav" \
  -F "prompts=music; child singing; male speech, man speaking; child speech, kid speaking" \
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

Classify audio against prompts (global similarity):

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `audio` | File | Yes | Audio file (WAV, MP3, FLAC, etc.) |
| `prompts` | String | No | **Semicolon-separated** custom prompts. Commas allowed within prompts for compound descriptions (e.g., "male speech, man speaking") |

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

### POST /classify-local

Classify audio using FLAM's frame-wise local similarity (Eq. 7 from FLAM paper).
Returns per-frame detection scores for each prompt, properly calibrated using the learned per-text logit bias.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `audio` | File | Yes | Audio file (WAV, MP3, FLAC, etc.) |
| `prompts` | String | No | **Semicolon-separated** custom prompts |
| `method` | String | No | `unbiased` (default, Eq. 7) or `approximate` (Eq. 8) |

**Response**:
```json
{
    "frame_scores": {
        "speech": [0.1, 0.2, 0.8, 0.9, ...],
        "music": [0.3, 0.1, 0.05, 0.1, ...]
    },
    "global_scores": {"speech": 0.9, "music": 0.3},
    "prompts": ["speech", "music"],
    "num_frames": 20,
    "frame_duration_s": 0.5,
    "duration_s": 10.0,
    "sample_rate": 48000,
    "device": "cpu",
    "timing": {
        "read_ms": 1.2,
        "decode_ms": 150.3,
        "tensor_ms": 0.8,
        "local_similarity_ms": 1200.5,
        "total_ms": 1355.0
    }
}
```

**Use Cases**:
- Temporal sound event localization (when did the dog bark?)
- Visualization matching FLAM paper (heatmaps over time)
- Precise detection boundaries

### Robust Classifier Theory (Paper Section C.3)

The `method` parameter controls how FLAM calibrates predictions to handle **label imbalance** in training data.

**The Problem**: Training data has unequal representation:
- "Barking" might appear in 2% of positive frames
- "Meowing" might appear in 15% of positive frames

A naive classifier would be biased toward common sounds.

**The Solution**: Equation 22 from the paper defines a calibrated score:
```
s(x,l,y) = p(z=1|x,l,y) / (p(z=1|x,l,y) + p(z=1|y))
                ↑                           ↑
         raw prediction            learned bias β*(y)
```

This divides out the per-prompt bias learned during training, giving all prompts a unified decision boundary of 0.5.

**Method Comparison**:
| Method | Description | Speed | Accuracy |
|--------|-------------|-------|----------|
| `unbiased` | Full Eq. 7 with logit bias correction | Baseline | Best |
| `approximate` | Simplified Eq. 8 (assumes β* ≈ -8) | ~Same | Negligible difference |

In practice, β* ≈ -8, so the approximation is nearly identical to the full formula.

### Loudness Relabel Postprocessing (Paper Section C.4)

The FLAM paper describes a **temporal smoothing** algorithm to clean up noisy frame-wise predictions:

**Problem**: Raw predictions have brief dropouts and glitches:
```
Frame:    1  2  3  4  5  6  7  8  9  10 11 12 13 14 15
Raw:      ✓  ✓  ✓  ✗  ✓  ✓  ✓  ✓  ✓  ✗  ✗  ✓  ✗  ✗  ✗
                   ↑                          ↑
              short gap                  short spike
```

**Algorithm**:
1. **Fill short gaps**: Negative segments <200ms (10 frames) between positives → mark positive
2. **Remove short spikes**: Positive segments <40ms (2 frames) in long events → mark negative

**Parameters** (from paper):
| Parameter | Value | Description |
|-----------|-------|-------------|
| RMS window | 2400 samples | Window size at 48kHz |
| Hop size | 1200 samples | 50Hz frame rate |
| Min gap | 10 frames (200ms) | Gaps shorter than this get filled |
| Min spike | 2 frames (40ms) | Spikes shorter than this get removed |

**Result**: Cleaner event boundaries matching human perception.

> **Note**: This postprocessing is not yet implemented in the backend. It's documented here for future reference.

---

## Step 5: Frontend Integration

### Prompt Input

The frontend includes a textarea for custom prompts:
1. Enter **semicolon-separated** prompts (e.g., "water drops; screaming; rain")
2. Commas are allowed within prompts for compound descriptions (e.g., "male speech, man speaking")
3. Click "Update prompts"
4. Prompts are sent with each classify request

### Score Visualization

The frontend supports two display modes:

| Mode | Description |
|------|-------------|
| **Clamped (default)** | Matches paper visualization: negative→0, positive→value. Scale: 0.0 to 1.0 |
| **Relative (normalized)** | Min-max normalization: worst=0, best=1. Amplifies differences |

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
- Ensure prompts are **semicolon-separated** (not comma-separated)
- Commas within prompts are fine (e.g., "male speech, man speaking")
- Check for leading/trailing whitespace
- Verify backend was restarted after code changes

### Low scores / all scores near zero
- Check audio is actually reaching the microphone (check RMS in backend logs)
- Verify audio is not silent (check browser meter)
- Try tiling: shorter audio is repeated to fill 10 seconds
- Check prompts match the expected sounds

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

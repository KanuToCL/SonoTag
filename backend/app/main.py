import io
import json
import logging
import os
import platform
import re
import subprocess
from contextlib import asynccontextmanager
from typing import Optional

import librosa
import numpy as np
import psutil
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# =============================================================================
# Global State for FLAM Model
# =============================================================================

flam_model = None
text_embeddings = None
device = None

# Default prompts for audio classification
DEFAULT_PROMPTS = [
    "speech",
    "music",
    "applause",
    "silence",
    "car horn",
    "engine running",
    "dog barking",
    "glass breaking",
    "gunshot",
    "siren",
]

SAMPLE_RATE = 48000  # FLAM requires 48kHz
MAX_DURATION_SECONDS = 10  # Max audio duration per request
EXPECTED_SAMPLES = (
    SAMPLE_RATE * MAX_DURATION_SECONDS
)  # 480,000 samples - FLAM expects exactly this

# Loudness Relabel postprocessing parameters (Paper Section C.4)
# Frame rate for postprocessing: 50Hz (hop size 1200 at 48kHz)
POSTPROCESS_FRAME_RATE = 50.0  # Hz
MIN_GAP_FRAMES = 10  # 200ms - short gaps to fill between positive segments
MIN_SPIKE_FRAMES = 2  # 40ms - short spikes to remove in long events
MIN_EVENT_FRAMES = 10  # 200ms - minimum event length to apply spike removal


def postprocess_frame_scores(
    scores: list[float],
    threshold: float = 0.5,
    min_gap_frames: int = MIN_GAP_FRAMES,
    min_spike_frames: int = MIN_SPIKE_FRAMES,
    min_event_frames: int = MIN_EVENT_FRAMES,
) -> list[float]:
    """
    Apply Loudness Relabel postprocessing from FLAM paper (Section C.4).

    This temporal smoothing cleans up noisy frame-wise predictions by:
    1. Filling short gaps (<200ms) between positive segments (mark them as positive)
    2. Removing short spikes (<40ms) in long events (mark them as negative)

    Args:
        scores: Raw frame-wise scores (probabilities in [0, 1])
        threshold: Decision threshold (default 0.5 for calibrated probabilities)
        min_gap_frames: Gaps shorter than this get filled (default 10 = 200ms at 50Hz)
        min_spike_frames: Spikes shorter than this get removed (default 2 = 40ms at 50Hz)
        min_event_frames: Minimum event length to apply spike removal (default 10 = 200ms)

    Returns:
        Smoothed scores (same length as input)
    """
    if len(scores) == 0:
        return scores

    # Convert to binary predictions
    binary = [1 if s >= threshold else 0 for s in scores]
    n = len(binary)

    # =========================================================================
    # Step 1: Fill short gaps between positive segments
    # If a negative segment is shorter than min_gap_frames and lies between
    # positive segments, mark it as positive
    # =========================================================================
    i = 0
    while i < n:
        if binary[i] == 0:
            # Find the end of this negative segment
            gap_start = i
            while i < n and binary[i] == 0:
                i += 1
            gap_end = i
            gap_length = gap_end - gap_start

            # Check if this gap is between positive segments
            has_positive_before = gap_start > 0 and binary[gap_start - 1] == 1
            has_positive_after = gap_end < n and binary[gap_end] == 1

            # Fill short gaps between positive segments
            if (
                has_positive_before
                and has_positive_after
                and gap_length < min_gap_frames
            ):
                for j in range(gap_start, gap_end):
                    binary[j] = 1
        else:
            i += 1

    # =========================================================================
    # Step 2: Remove short spikes in long events
    # If a positive segment is shorter than min_spike_frames and the total
    # event (including neighboring positives) exceeds min_event_frames,
    # remove the spike
    # =========================================================================
    # First, find all positive segments
    positive_segments = []
    i = 0
    while i < n:
        if binary[i] == 1:
            seg_start = i
            while i < n and binary[i] == 1:
                i += 1
            seg_end = i
            positive_segments.append((seg_start, seg_end))
        else:
            i += 1

    # Calculate total positive frames in the event
    total_positive_frames = sum(end - start for start, end in positive_segments)

    # Remove short spikes only if total event is long enough
    if total_positive_frames > min_event_frames:
        for seg_start, seg_end in positive_segments:
            seg_length = seg_end - seg_start
            if seg_length < min_spike_frames:
                for j in range(seg_start, seg_end):
                    binary[j] = 0

    # =========================================================================
    # Convert binary back to smoothed scores
    # Use original scores where positive, 0 where marked negative
    # =========================================================================
    smoothed = []
    for i, (score, is_positive) in enumerate(zip(scores, binary)):
        if is_positive:
            # Keep original score (but ensure it's at least threshold)
            smoothed.append(max(score, threshold))
        else:
            # Mark as low confidence
            smoothed.append(min(score, threshold * 0.5))

    return smoothed


# =============================================================================
# Lifespan: Model Loading at Startup
# =============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load FLAM model at startup, cleanup on shutdown."""
    global flam_model, text_embeddings, device

    try:
        import openflam

        # Determine device (MPS not supported by FLAM, falls back to CPU)
        if torch.cuda.is_available():
            device = torch.device("cuda")
        else:
            device = torch.device("cpu")

        logger.info(f"Loading FLAM model on device: {device}")

        # Load model
        model_path = os.getenv("FLAM_MODEL_PATH", "openflam_ckpt")
        flam_model = openflam.OpenFLAM(
            model_name="v1-base",
            default_ckpt_path=model_path,
        ).to(device)

        # Pre-compute text embeddings for default prompts
        with torch.no_grad():
            text_embeddings = flam_model.get_text_features(DEFAULT_PROMPTS)

        logger.info(
            f"FLAM model loaded. Text embeddings cached for {len(DEFAULT_PROMPTS)} prompts."
        )

    except ImportError:
        logger.warning(
            "OpenFLAM not installed. Inference endpoints will return mock data."
        )
    except Exception as e:
        logger.error(f"Failed to load FLAM model: {e}")

    yield  # App runs here

    # Cleanup
    logger.info("Shutting down FLAM model...")
    flam_model = None
    text_embeddings = None


app = FastAPI(title="FLAM Backend", version="0.2.0", lifespan=lifespan)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecommendRequest(BaseModel):
    target_latency_s: Optional[float] = None


class RecommendResponse(BaseModel):
    recommended_buffer_s: float
    rationale: str


def _recommend_buffer_seconds(cores: int) -> float:
    if cores <= 4:
        return 10.0
    if cores <= 8:
        return 5.0
    return 2.0


def _run_command(command: list[str]) -> str:
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False,
            timeout=3,
        )
    except (FileNotFoundError, subprocess.SubprocessError, subprocess.TimeoutExpired):
        return ""
    return result.stdout.strip()


def _parse_memory_to_bytes(value: str) -> int | None:
    if not value:
        return None
    match = re.search(r"([\d\.]+)\s*([a-zA-Z]+)?", value)
    if not match:
        return None
    amount = match.group(1)
    unit = (match.group(2) or "").lower()
    try:
        number = float(amount)
    except ValueError:
        return None
    if unit in ("gib", "gb"):
        return int(number * 1024 * 1024 * 1024)
    if unit in ("mib", "mb"):
        return int(number * 1024 * 1024)
    return int(number)


def _merge_gpu_memory(gpus: list[dict], updates: list[dict]) -> list[dict]:
    if not gpus:
        return updates
    if not updates:
        return gpus
    for gpu in gpus:
        name = (gpu.get("name") or "").lower()
        for update in updates:
            update_name = (update.get("name") or "").lower()
            if not update_name or not name:
                continue
            if update_name in name or name in update_name:
                update_memory = update.get("memory_bytes")
                if update_memory:
                    current = gpu.get("memory_bytes")
                    if not current or update_memory > current:
                        gpu["memory_bytes"] = update_memory
    return gpus


def _get_nvidia_smi_gpus() -> list[dict]:
    command = ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"]
    output = _run_command(command)
    if not output:
        return []
    gpus = []
    for line in output.splitlines():
        parts = [part.strip() for part in line.split(",")]
        name = parts[0] if parts else None
        memory_text = parts[1] if len(parts) > 1 else ""
        gpus.append(
            {
                "name": name,
                "memory_bytes": _parse_memory_to_bytes(memory_text),
            }
        )
    return gpus


def _get_windows_video_controller() -> list[dict]:
    command = [
        "powershell",
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_VideoController | "
        "Select-Object Name, AdapterRAM | ConvertTo-Json -Compress",
    ]
    output = _run_command(command)
    if not output:
        return []
    try:
        data = json.loads(output)
    except json.JSONDecodeError:
        return []
    if isinstance(data, dict):
        data = [data]
    gpus = []
    for item in data:
        gpus.append(
            {
                "name": item.get("Name") if isinstance(item, dict) else None,
                "memory_bytes": (
                    item.get("AdapterRAM") if isinstance(item, dict) else None
                ),
            }
        )
    return gpus


def _get_windows_dedicated_memory() -> list[dict]:
    command = [
        "powershell",
        "-NoProfile",
        "-Command",
        "Get-CimInstance -Namespace root\\wmi -ClassName MSFT_VideoAdapter | "
        "Select-Object Name, DedicatedVideoMemory | ConvertTo-Json -Compress",
    ]
    output = _run_command(command)
    if not output:
        return []
    try:
        data = json.loads(output)
    except json.JSONDecodeError:
        return []
    if isinstance(data, dict):
        data = [data]
    gpus = []
    for item in data:
        gpus.append(
            {
                "name": item.get("Name") if isinstance(item, dict) else None,
                "memory_bytes": (
                    item.get("DedicatedVideoMemory") if isinstance(item, dict) else None
                ),
            }
        )
    return gpus


def _get_windows_gpus() -> list[dict]:
    gpus = _get_windows_video_controller()
    gpus = _merge_gpu_memory(gpus, _get_windows_dedicated_memory())
    gpus = _merge_gpu_memory(gpus, _get_nvidia_smi_gpus())
    return gpus


def _get_macos_gpus() -> list[dict]:
    command = ["system_profiler", "SPDisplaysDataType", "-json"]
    output = _run_command(command)
    if not output:
        return []
    try:
        data = json.loads(output)
    except json.JSONDecodeError:
        return []
    displays = data.get("SPDisplaysDataType", [])
    gpus = []
    for item in displays:
        gpus.append(
            {
                "name": item.get("sppci_model"),
                "memory_bytes": None,
            }
        )
    return gpus


def _get_linux_gpus() -> list[dict]:
    return _get_nvidia_smi_gpus()


def _get_gpu_info() -> list[dict]:
    system = platform.system().lower()
    if system == "windows":
        return _get_windows_gpus()
    if system == "darwin":
        return _get_macos_gpus()
    if system == "linux":
        return _get_linux_gpus()
    return []


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/system-info")
def system_info() -> dict:
    cpu_model = platform.processor()
    if not cpu_model:
        cpu_model = platform.uname().processor or platform.uname().machine

    memory = psutil.virtual_memory()
    gpus = _get_gpu_info()
    return {
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "cpu": {
            "logical_cores": psutil.cpu_count(logical=True),
            "physical_cores": psutil.cpu_count(logical=False),
            "model": cpu_model,
        },
        "memory": {
            "total_bytes": memory.total,
        },
        "gpus": gpus,
        "env": {
            "FLAM_MODEL_PATH": os.getenv("FLAM_MODEL_PATH", ""),
        },
    }


@app.post("/recommend-buffer", response_model=RecommendResponse)
def recommend_buffer(payload: RecommendRequest) -> RecommendResponse:
    cores = os.cpu_count() or 4
    recommended = _recommend_buffer_seconds(cores)
    rationale = "Heuristic based on CPU core count. Replace with a FLAM benchmark."
    return RecommendResponse(
        recommended_buffer_s=recommended,
        rationale=rationale,
    )


# =============================================================================
# Inference Endpoints
# =============================================================================


import time


class ClassifyResponse(BaseModel):
    """Response from audio classification."""

    scores: dict[str, float]
    prompts: list[str]
    duration_s: float
    sample_rate: int
    device: str
    timing: dict[str, float] | None = None  # Timing breakdown in milliseconds


class ClassifyLocalResponse(BaseModel):
    """Response from frame-wise audio classification using unbiased local similarity."""

    # Frame-wise scores: dict mapping prompt -> list of scores per frame
    frame_scores: dict[str, list[float]]
    # Smoothed frame-wise scores (after Loudness Relabel postprocessing)
    smoothed_frame_scores: dict[str, list[float]] | None = None
    # Aggregated global scores (max across frames)
    global_scores: dict[str, float]
    prompts: list[str]
    num_frames: int
    frame_duration_s: float  # Duration of each frame in seconds
    duration_s: float
    sample_rate: int
    device: str
    postprocessed: bool = False  # Whether Loudness Relabel was applied
    timing: dict[str, float] | None = None


class PromptsResponse(BaseModel):
    """Available prompts for classification."""

    prompts: list[str]
    count: int


@app.get("/prompts", response_model=PromptsResponse)
def get_prompts() -> PromptsResponse:
    """Get the current list of prompts used for classification."""
    return PromptsResponse(
        prompts=DEFAULT_PROMPTS,
        count=len(DEFAULT_PROMPTS),
    )


@app.get("/model-status")
def model_status() -> dict:
    """Check if FLAM model is loaded and ready."""
    return {
        "loaded": flam_model is not None,
        "device": str(device) if device else None,
        "prompts_cached": text_embeddings is not None,
        "prompt_count": len(DEFAULT_PROMPTS) if text_embeddings is not None else 0,
    }


@app.post("/classify", response_model=ClassifyResponse)
async def classify_audio(
    audio: UploadFile = File(..., description="Audio file (WAV, MP3, etc.)"),
    prompts: Optional[str] = Form(
        None,
        description="Semicolon-separated list of custom prompts. "
        "Use semicolons to allow commas within prompts "
        '(e.g., "music; child singing; male speech, man speaking")',
    ),
) -> ClassifyResponse:
    """
    Classify audio using FLAM model.

    Accepts audio files, resamples to 48kHz, and returns similarity scores
    for each prompt. Optionally accepts custom prompts as semicolon-separated string.

    Compound prompts (with commas) are supported, e.g.:
        "music; child singing; male speech, man speaking; child speech, kid speaking"

    Args:
        audio: Audio file to classify
        prompts: Optional semicolon-separated list of custom prompts
    """
    global flam_model, text_embeddings, device

    # Check if model is loaded
    if flam_model is None:
        raise HTTPException(
            status_code=503,
            detail="FLAM model not loaded. Check server logs.",
        )

    # Parse custom prompts or use defaults
    # Use semicolons as delimiter to allow commas within prompts
    # e.g., "music; child singing; male speech, man speaking"
    if prompts:
        prompt_list = [p.strip() for p in prompts.split(";") if p.strip()]
        if not prompt_list:
            prompt_list = DEFAULT_PROMPTS
            current_text_embeddings = text_embeddings
        else:
            # Compute text embeddings for custom prompts on-the-fly
            with torch.no_grad():
                current_text_embeddings = flam_model.get_text_features(prompt_list)
    else:
        prompt_list = DEFAULT_PROMPTS
        current_text_embeddings = text_embeddings

    if current_text_embeddings is None:
        raise HTTPException(
            status_code=503,
            detail="Text embeddings not available. Check server logs.",
        )

    # Start timing
    timing = {}
    t_start = time.perf_counter()

    # Read audio file
    try:
        audio_bytes = await audio.read()
        audio_buffer = io.BytesIO(audio_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read audio file: {e}",
        )

    t_after_read = time.perf_counter()
    timing["read_ms"] = round((t_after_read - t_start) * 1000, 2)

    # Load and resample audio to 48kHz
    try:
        audio_array, sr = librosa.load(audio_buffer, sr=SAMPLE_RATE, mono=True)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to decode audio: {e}. Ensure file is a valid audio format.",
        )

    t_after_decode = time.perf_counter()
    timing["decode_ms"] = round((t_after_decode - t_after_read) * 1000, 2)

    # Limit duration
    max_samples = int(SAMPLE_RATE * MAX_DURATION_SECONDS)
    if len(audio_array) > max_samples:
        audio_array = audio_array[:max_samples]

    duration_s = len(audio_array) / SAMPLE_RATE

    # CRITICAL: FLAM expects exactly 480,000 samples (10 seconds at 48kHz)
    # Instead of padding with silence (which dilutes the signal),
    # we REPEAT the audio to fill the 10-second window
    original_len = len(audio_array)
    if len(audio_array) < EXPECTED_SAMPLES:
        # Calculate how many times we need to repeat
        repeats_needed = int(np.ceil(EXPECTED_SAMPLES / len(audio_array)))
        # Tile the audio and truncate to exact length
        audio_array = np.tile(audio_array, repeats_needed)[:EXPECTED_SAMPLES]
        logger.info(
            f"Tiled audio from {original_len} to {EXPECTED_SAMPLES} samples "
            f"({original_len / SAMPLE_RATE:.2f}s repeated to fill 10.00s)"
        )

    # Debug: log audio statistics
    audio_min = float(np.min(audio_array))
    audio_max = float(np.max(audio_array))
    audio_mean = float(np.mean(audio_array))
    audio_std = float(np.std(audio_array))
    audio_rms = float(np.sqrt(np.mean(audio_array**2)))
    logger.info(
        f"Audio stats: samples={len(audio_array)}, "
        f"min={audio_min:.4f}, max={audio_max:.4f}, "
        f"mean={audio_mean:.6f}, std={audio_std:.4f}, rms={audio_rms:.4f}"
    )

    # Convert to tensor
    audio_tensor = torch.tensor(audio_array).unsqueeze(0).to(device)

    t_after_tensor = time.perf_counter()
    timing["tensor_ms"] = round((t_after_tensor - t_after_decode) * 1000, 2)

    # Run inference
    try:
        with torch.no_grad():
            t_before_audio = time.perf_counter()
            audio_features = flam_model.get_global_audio_features(audio_tensor)
            t_after_audio = time.perf_counter()
            timing["audio_embed_ms"] = round((t_after_audio - t_before_audio) * 1000, 2)

            # Compute cosine similarity using current text embeddings (custom or default)
            similarities = (current_text_embeddings @ audio_features.T).squeeze(1)

            t_after_similarity = time.perf_counter()
            timing["similarity_ms"] = round(
                (t_after_similarity - t_after_audio) * 1000, 2
            )

            # Convert to Python floats
            scores = {
                prompt: float(score)
                for prompt, score in zip(prompt_list, similarities.cpu().numpy())
            }
    except Exception as e:
        logger.error(f"Inference failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {e}",
        )

    t_end = time.perf_counter()
    timing["total_ms"] = round((t_end - t_start) * 1000, 2)

    return ClassifyResponse(
        scores=scores,
        prompts=prompt_list,
        duration_s=round(duration_s, 3),
        sample_rate=SAMPLE_RATE,
        device=str(device),
        timing=timing,
    )


@app.post("/classify-local", response_model=ClassifyLocalResponse)
async def classify_audio_local(
    audio: UploadFile = File(..., description="Audio file (WAV, MP3, etc.)"),
    prompts: Optional[str] = Form(
        None,
        description="Semicolon-separated list of custom prompts. "
        "Use semicolons to allow commas within prompts.",
    ),
    method: str = Form(
        "unbiased",
        description="Method for computing local similarity: 'unbiased' (Eq. 7) or 'approximate' (Eq. 8)",
    ),
    postprocess: bool = Form(
        True,
        description="Apply Loudness Relabel postprocessing (Paper C.4) to smooth frame-wise predictions",
    ),
    threshold: float = Form(
        0.5,
        description="Decision threshold for postprocessing (default 0.5 for calibrated probabilities)",
    ),
) -> ClassifyLocalResponse:
    """
    Classify audio using FLAM's frame-wise local similarity (Eq. 7 from paper).

    Returns per-frame detection scores for each prompt, properly calibrated using
    the learned per-text logit bias. This matches the paper's visualization.

    Frame duration: ~0.5 seconds per frame (for 10s audio = ~20 frames)

    Args:
        audio: Audio file to classify
        prompts: Optional semicolon-separated list of custom prompts
        method: 'unbiased' (default, uses logit bias correction) or 'approximate'
    """
    global flam_model, device

    # Check if model is loaded
    if flam_model is None:
        raise HTTPException(
            status_code=503,
            detail="FLAM model not loaded. Check server logs.",
        )

    # Parse custom prompts or use defaults
    if prompts:
        prompt_list = [p.strip() for p in prompts.split(";") if p.strip()]
        if not prompt_list:
            prompt_list = DEFAULT_PROMPTS
    else:
        prompt_list = DEFAULT_PROMPTS

    # Start timing
    timing = {}
    t_start = time.perf_counter()

    # Read audio file
    try:
        audio_bytes = await audio.read()
        audio_buffer = io.BytesIO(audio_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read audio file: {e}",
        )

    t_after_read = time.perf_counter()
    timing["read_ms"] = round((t_after_read - t_start) * 1000, 2)

    # Load and resample audio to 48kHz
    try:
        audio_array, sr = librosa.load(audio_buffer, sr=SAMPLE_RATE, mono=True)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to decode audio: {e}. Ensure file is a valid audio format.",
        )

    t_after_decode = time.perf_counter()
    timing["decode_ms"] = round((t_after_decode - t_after_read) * 1000, 2)

    # Limit duration
    max_samples = int(SAMPLE_RATE * MAX_DURATION_SECONDS)
    if len(audio_array) > max_samples:
        audio_array = audio_array[:max_samples]

    duration_s = len(audio_array) / SAMPLE_RATE

    # CRITICAL: FLAM expects exactly 480,000 samples (10 seconds at 48kHz)
    # Tile the audio to fill the 10-second window
    original_len = len(audio_array)
    if len(audio_array) < EXPECTED_SAMPLES:
        repeats_needed = int(np.ceil(EXPECTED_SAMPLES / len(audio_array)))
        audio_array = np.tile(audio_array, repeats_needed)[:EXPECTED_SAMPLES]
        logger.info(
            f"Tiled audio from {original_len} to {EXPECTED_SAMPLES} samples "
            f"({original_len / SAMPLE_RATE:.2f}s repeated to fill 10.00s)"
        )

    # Convert to tensor
    audio_tensor = torch.tensor(audio_array).unsqueeze(0).to(device)

    t_after_tensor = time.perf_counter()
    timing["tensor_ms"] = round((t_after_tensor - t_after_decode) * 1000, 2)

    # Run inference using get_local_similarity with cross_product=True
    try:
        with torch.no_grad():
            t_before_inference = time.perf_counter()

            # get_local_similarity with cross_product=True returns (batch, num_text, T)
            # where T is the number of time frames
            local_similarity = flam_model.get_local_similarity(
                audio=audio_tensor,
                text=prompt_list,
                method=method,
                cross_product=True,
            )

            t_after_inference = time.perf_counter()
            timing["local_similarity_ms"] = round(
                (t_after_inference - t_before_inference) * 1000, 2
            )

            # local_similarity shape: (1, num_prompts, num_frames)
            # Squeeze batch dimension
            local_sim_np = (
                local_similarity.squeeze(0).cpu().numpy()
            )  # (num_prompts, num_frames)

            num_frames = local_sim_np.shape[1]

            # Build frame_scores dict: prompt -> list of scores per frame
            frame_scores = {}
            global_scores = {}

            for i, prompt in enumerate(prompt_list):
                scores_per_frame = local_sim_np[i].tolist()
                frame_scores[prompt] = [round(s, 4) for s in scores_per_frame]

                # Global score: use MEAN across frames instead of MAX
                # MAX was inflating scores because any single high frame dominates
                # MEAN gives a more balanced view of overall detection confidence
                mean_score = float(np.mean(local_sim_np[i]))
                global_scores[prompt] = round(mean_score, 4)

            # Calculate frame duration (10s / num_frames)
            frame_duration_s = 10.0 / num_frames

            # Apply Loudness Relabel postprocessing if requested
            smoothed_frame_scores = None
            if postprocess:
                t_before_postprocess = time.perf_counter()
                smoothed_frame_scores = {}
                for prompt in prompt_list:
                    smoothed = postprocess_frame_scores(
                        frame_scores[prompt],
                        threshold=threshold,
                        min_gap_frames=MIN_GAP_FRAMES,
                        min_spike_frames=MIN_SPIKE_FRAMES,
                        min_event_frames=MIN_EVENT_FRAMES,
                    )
                    smoothed_frame_scores[prompt] = [round(s, 4) for s in smoothed]
                t_after_postprocess = time.perf_counter()
                timing["postprocess_ms"] = round(
                    (t_after_postprocess - t_before_postprocess) * 1000, 2
                )
                logger.info(
                    f"Applied Loudness Relabel postprocessing to {len(prompt_list)} prompts"
                )

    except Exception as e:
        logger.error(f"Local inference failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Local inference failed: {e}",
        )

    t_end = time.perf_counter()
    timing["total_ms"] = round((t_end - t_start) * 1000, 2)

    return ClassifyLocalResponse(
        frame_scores=frame_scores,
        smoothed_frame_scores=smoothed_frame_scores,
        global_scores=global_scores,
        prompts=prompt_list,
        num_frames=num_frames,
        frame_duration_s=round(frame_duration_s, 4),
        duration_s=round(duration_s, 3),
        sample_rate=SAMPLE_RATE,
        device=str(device),
        postprocessed=postprocess,
        timing=timing,
    )

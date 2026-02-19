import hashlib
import io
import json
import logging
import os
import platform
import re
import shutil
import subprocess
import tempfile
import time
from contextlib import asynccontextmanager
from typing import Optional

import librosa
import numpy as np
import psutil
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
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

        # Model path - check multiple locations
        model_path = os.getenv("FLAM_MODEL_PATH", None)

        # Try common locations
        possible_paths = [
            model_path,
            "openflam_ckpt",
            "../openflam_ckpt",
            os.path.join(os.path.dirname(__file__), "..", "..", "openflam_ckpt"),
            os.path.expanduser("~/.cache/openflam"),
        ]

        actual_path = None
        for p in possible_paths:
            if p and os.path.exists(p):
                actual_path = p
                break

        if actual_path is None:
            # Create cache directory and let HuggingFace download
            cache_dir = os.path.expanduser("~/.cache/openflam")
            os.makedirs(cache_dir, exist_ok=True)
            actual_path = cache_dir
            logger.info(f"Model checkpoint not found, will download to: {cache_dir}")

        logger.info(f"Using model path: {actual_path}")

        # Load model (will download from HuggingFace if not present)
        flam_model = openflam.OpenFLAM(
            model_name="v1-base",
            default_ckpt_path=actual_path,
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


# =============================================================================
# Debug Endpoint (for diagnosing deployment issues)
# =============================================================================


@app.get("/debug/youtube-env")
async def debug_youtube_env():
    """
    Debug endpoint to check YouTube download environment.
    Returns yt-dlp version, ffmpeg availability, and system info.
    """
    debug_info = {
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "yt_dlp": {},
        "ffmpeg": {},
        "temp_dir": {},
    }

    # Check yt-dlp
    try:
        import yt_dlp

        debug_info["yt_dlp"]["installed"] = True
        debug_info["yt_dlp"]["version"] = yt_dlp.version.__version__
    except ImportError:
        debug_info["yt_dlp"]["installed"] = False
        debug_info["yt_dlp"]["version"] = None
    except Exception as e:
        debug_info["yt_dlp"]["error"] = str(e)

    # Check ffmpeg
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        debug_info["ffmpeg"]["installed"] = result.returncode == 0
        if result.returncode == 0:
            first_line = result.stdout.split("\n")[0] if result.stdout else "unknown"
            debug_info["ffmpeg"]["version"] = first_line
        else:
            debug_info["ffmpeg"]["error"] = result.stderr[:200]
    except FileNotFoundError:
        debug_info["ffmpeg"]["installed"] = False
        debug_info["ffmpeg"]["error"] = "ffmpeg not found in PATH"
    except Exception as e:
        debug_info["ffmpeg"]["error"] = str(e)

    # Check temp directory
    temp_dir = tempfile.gettempdir()
    debug_info["temp_dir"]["path"] = temp_dir
    debug_info["temp_dir"]["writable"] = os.access(temp_dir, os.W_OK)
    debug_info["temp_dir"]["free_space_mb"] = round(
        shutil.disk_usage(temp_dir).free / (1024 * 1024), 2
    )

    return debug_info


@app.get("/debug/youtube-test")
async def debug_youtube_test(url: str = "https://www.youtube.com/watch?v=jNQXAC9IVRw"):
    """
    Attempt a real YouTube download with verbose output to diagnose failures.
    Uses a short video (first YouTube video ever, 19s) by default.
    Returns raw yt-dlp verbose logs showing exactly what YouTube returns.
    """
    import yt_dlp

    test_results = {
        "test_url": url,
        "yt_dlp_version": yt_dlp.version.__version__,
        "strategies": [],
        "summary": None,
    }

    player_client_strategies = [
        ["android", "web"],
        ["ios", "web"],
        ["tv", "web"],
    ]

    temp_dir = tempfile.mkdtemp(prefix="sonotag_debug_")

    class VerboseLogger:
        """Capture yt-dlp's verbose output into a list."""

        def __init__(self):
            self.messages = []

        def debug(self, msg):
            self.messages.append(f"[debug] {msg}")

        def info(self, msg):
            self.messages.append(f"[info] {msg}")

        def warning(self, msg):
            self.messages.append(f"[warn] {msg}")

        def error(self, msg):
            self.messages.append(f"[error] {msg}")

    for strategy in player_client_strategies:
        verbose_log = VerboseLogger()
        strategy_result = {
            "player_client": strategy,
            "success": False,
            "error": None,
            "error_type": None,
            "verbose_log_lines": 0,
            "verbose_log_tail": [],
        }

        ydl_opts = {
            "format": "bestaudio[filesize<5M]/bestaudio/best",
            "outtmpl": os.path.join(temp_dir, f"test_{'_'.join(strategy)}.%(ext)s"),
            "verbose": True,
            "quiet": False,
            "no_warnings": False,
            "logger": verbose_log,
            "socket_timeout": 15,
            "extractor_args": {"youtube": {"player_client": strategy}},
            "skip_download": True,  # Only extract info, don't download the file
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                strategy_result["success"] = True
                strategy_result["video_title"] = info.get("title", "Unknown")
                strategy_result["formats_available"] = len(info.get("formats", []))
        except Exception as e:
            strategy_result["error"] = str(e)[:500]
            strategy_result["error_type"] = type(e).__name__

        strategy_result["verbose_log_lines"] = len(verbose_log.messages)
        strategy_result["verbose_log_tail"] = verbose_log.messages[-30:]

        test_results["strategies"].append(strategy_result)

    # Also test actual download with the best strategy (android+web)
    download_test = {"strategy": ["android", "web"], "success": False}
    dl_logger = VerboseLogger()
    dl_opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(temp_dir, "dl_test.%(ext)s"),
        "verbose": True,
        "quiet": False,
        "logger": dl_logger,
        "socket_timeout": 15,
        "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
    }
    try:
        with yt_dlp.YoutubeDL(dl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            download_test["success"] = True
            download_test["title"] = info.get("title", "Unknown")
            # Check if file was actually written
            files = [f for f in os.listdir(temp_dir) if f.startswith("dl_test")]
            download_test["files_written"] = files
            if files:
                fpath = os.path.join(temp_dir, files[0])
                download_test["file_size_bytes"] = os.path.getsize(fpath)
    except Exception as e:
        download_test["error"] = str(e)[:500]
        download_test["error_type"] = type(e).__name__
    download_test["verbose_log_tail"] = dl_logger.messages[-15:]
    test_results["actual_download_test"] = download_test

    # Clean up
    shutil.rmtree(temp_dir, ignore_errors=True)

    # Summary
    successes = [s for s in test_results["strategies"] if s["success"]]
    if successes:
        test_results["summary"] = (
            f"{len(successes)}/{len(player_client_strategies)} strategies succeeded. Best: {successes[0]['player_client']}"
        )
    else:
        test_results["summary"] = (
            f"ALL {len(player_client_strategies)} strategies FAILED. YouTube is blocking this server's IP."
        )

    return test_results


@app.get("/debug/strategy-health")
async def debug_strategy_health():
    """
    Returns the current health status of YouTube player_client strategies.
    Shows success/failure rates, current ordering, and consecutive failures.
    """
    return {
        "tracker": "StrategyHealthTracker",
        "current_order": youtube_strategy_tracker.get_ordered_strategies(),
        "strategies": youtube_strategy_tracker.get_health_report(),
        "config": {
            "decay_interval_hours": StrategyHealthTracker.DECAY_INTERVAL_S / 3600,
            "consecutive_fail_threshold": StrategyHealthTracker.CONSECUTIVE_FAIL_THRESHOLD,
        },
    }


# =============================================================================
# Unified Download Helper (multi-platform: YouTube, Vimeo, SoundCloud, etc.)
# =============================================================================

PLATFORM_PATTERNS = {
    "youtube": [r"(youtube\.com|youtu\.be|m\.youtube\.com)"],
    "vimeo": [r"vimeo\.com"],
    "soundcloud": [r"soundcloud\.com"],
}


def detect_platform(url: str) -> str:
    """Detect which platform a URL belongs to."""
    for platform_name, patterns in PLATFORM_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, url):
                return platform_name
    return "unknown"


# =============================================================================
# Strategy Health Tracker (Reactive Learning)
# =============================================================================


class StrategyHealthTracker:
    """
    Tracks success/failure of yt-dlp player_client strategies and dynamically
    reorders them so the most reliable strategy is tried first.

    Reactive learning: every real download attempt updates the tracker.
    No background jobs, no persistence across restarts. Counters decay
    every DECAY_INTERVAL_S seconds so "dead" strategies get retried.
    """

    DECAY_INTERVAL_S = 6 * 3600  # 6 hours
    CONSECUTIVE_FAIL_THRESHOLD = 3  # deprioritize after N consecutive failures

    def __init__(self, strategies: list[list[str]]):
        self._strategies = [tuple(s) for s in strategies]
        self._stats: dict[tuple, dict] = {}
        self._last_decay = time.time()
        for s in self._strategies:
            self._stats[s] = {
                "successes": 0,
                "failures": 0,
                "consecutive_failures": 0,
                "last_success": None,
                "last_failure": None,
            }

    def record_success(self, strategy: list[str]) -> None:
        key = tuple(strategy)
        if key not in self._stats:
            return
        self._stats[key]["successes"] += 1
        self._stats[key]["consecutive_failures"] = 0
        self._stats[key]["last_success"] = time.time()
        logger.info(
            f"[StrategyHealthTracker] {strategy} succeeded (total: {self._stats[key]['successes']})"
        )

    def record_failure(self, strategy: list[str]) -> None:
        key = tuple(strategy)
        if key not in self._stats:
            return
        self._stats[key]["failures"] += 1
        self._stats[key]["consecutive_failures"] += 1
        self._stats[key]["last_failure"] = time.time()
        logger.warning(
            f"[StrategyHealthTracker] {strategy} failed "
            f"(consecutive: {self._stats[key]['consecutive_failures']}, total: {self._stats[key]['failures']})"
        )

    def get_ordered_strategies(self) -> list[list[str]]:
        """Return strategies ordered by reliability (best first)."""
        self._maybe_decay()

        def sort_key(s: tuple) -> tuple:
            stats = self._stats[s]
            total = stats["successes"] + stats["failures"]
            if total == 0:
                # Untested strategies get neutral priority (between good and bad)
                return (1, 0)
            success_rate = stats["successes"] / total
            # Heavily deprioritize strategies with many consecutive failures
            if stats["consecutive_failures"] >= self.CONSECUTIVE_FAIL_THRESHOLD:
                return (0, success_rate)
            return (2, success_rate)

        ordered = sorted(self._stats.keys(), key=sort_key, reverse=True)
        return [list(s) for s in ordered]

    def get_health_report(self) -> dict:
        """Return current health stats for all strategies (for debug endpoint)."""
        report = {}
        ordered = self.get_ordered_strategies()
        for i, strategy in enumerate(ordered):
            key = tuple(strategy)
            stats = self._stats[key]
            total = stats["successes"] + stats["failures"]
            report[str(strategy)] = {
                "rank": i + 1,
                "successes": stats["successes"],
                "failures": stats["failures"],
                "consecutive_failures": stats["consecutive_failures"],
                "success_rate": (
                    round(stats["successes"] / total, 3) if total > 0 else None
                ),
                "last_success": stats["last_success"],
                "last_failure": stats["last_failure"],
            }
        return report

    def _maybe_decay(self) -> None:
        """Decay failure counters periodically so dead strategies get retried."""
        now = time.time()
        if now - self._last_decay < self.DECAY_INTERVAL_S:
            return
        self._last_decay = now
        for stats in self._stats.values():
            stats["failures"] = max(0, stats["failures"] // 2)
            stats["consecutive_failures"] = max(0, stats["consecutive_failures"] // 2)
        logger.info("[StrategyHealthTracker] Decayed failure counters (6h interval)")


# Global tracker instance for YouTube strategies
youtube_strategy_tracker = StrategyHealthTracker(
    [
        ["android", "web"],
        ["ios", "web"],
        ["tv", "web"],
    ]
)


def build_youtube_failure_detail(last_error: Exception | None) -> dict:
    """
    Build a diagnostic, user-facing error when all YouTube strategies fail.
    Returns a structured dict with actionable info for the frontend to display.
    """
    health = youtube_strategy_tracker.get_health_report()
    error_str = str(last_error).lower() if last_error else ""

    # Classify the failure type
    if "sign in" in error_str or "bot" in error_str or "confirm" in error_str:
        failure_type = "bot_detection"
        user_message = (
            "YouTube is blocking downloads from this server due to bot detection."
        )
    elif "no video formats" in error_str or "sabr" in error_str:
        failure_type = "format_unavailable"
        user_message = (
            "YouTube changed its streaming protocol and no compatible format was found."
        )
    elif "drm" in error_str:
        failure_type = "drm_protected"
        user_message = "This video uses DRM protection and cannot be downloaded."
    elif "private" in error_str or "unavailable" in error_str:
        failure_type = "video_unavailable"
        user_message = "This video is private, unavailable, or region-locked."
    else:
        failure_type = "unknown"
        user_message = "YouTube download failed for an unexpected reason."

    healthy = sum(1 for s in health.values() if s.get("consecutive_failures", 0) < 3)
    total = len(health)

    return {
        "error": user_message,
        "failure_type": failure_type,
        "suggestion": (
            "Try Vimeo or SoundCloud \u2014 they work reliably from this server."
            if failure_type in ("bot_detection", "format_unavailable")
            else "Try a different video URL."
        ),
        "strategies_healthy": f"{healthy}/{total}",
        "technical_detail": str(last_error)[:300] if last_error else None,
    }


async def download_from_url(
    url: str,
    output_dir: str,
    audio_only: bool = True,
) -> dict:
    """
    Download audio/video from any supported platform using yt-dlp.

    Returns:
        {
            platform: str,
            title: str,
            duration: float,
            file_path: str,
            thumbnail_url: str | None,
            has_video: bool,
        }
    """
    try:
        import yt_dlp
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="yt-dlp not installed. Run: pip install yt-dlp",
        )

    platform_name = detect_platform(url)

    if audio_only:
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(output_dir, "audio.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
        }
    else:
        ydl_opts = {
            "format": "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
            "merge_output_format": "mp4",
            "outtmpl": os.path.join(output_dir, "video.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
        }

    # Platform-specific yt-dlp tweaks
    if platform_name == "youtube":
        # Use the health tracker to get strategies ordered by reliability
        player_client_strategies = youtube_strategy_tracker.get_ordered_strategies()
        logger.info(
            f"[download_from_url] YouTube strategy order: {player_client_strategies}"
        )
    else:
        # Vimeo, SoundCloud, and others: no special strategy needed
        player_client_strategies = [None]

    last_error = None
    info = None
    for strategy in player_client_strategies:
        try:
            if strategy is not None:
                ydl_opts["extractor_args"] = {"youtube": {"player_client": strategy}}
            logger.info(
                f"[download_from_url] platform={platform_name}, strategy={strategy}, audio_only={audio_only}"
            )
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
            last_error = None
            if strategy is not None:
                youtube_strategy_tracker.record_success(strategy)
            break
        except Exception as e:
            last_error = e
            if strategy is not None:
                youtube_strategy_tracker.record_failure(strategy)
            logger.warning(
                f"[download_from_url] Strategy {strategy} failed: {type(e).__name__}: {e}"
            )
            # Clean partial downloads before retry
            for f in os.listdir(output_dir):
                fpath = os.path.join(output_dir, f)
                if os.path.isfile(fpath):
                    os.remove(fpath)
            continue

    if last_error is not None or info is None:
        logger.error(
            f"[download_from_url] All strategies failed for '{url}': {last_error}"
        )
        if platform_name == "youtube":
            failure_detail = build_youtube_failure_detail(last_error)
            raise HTTPException(status_code=502, detail=failure_detail)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to download from {platform_name.title()}: {last_error}",
        )

    title = info.get("title", "Unknown")
    duration = info.get("duration", 0) or 0
    thumbnail_url = info.get("thumbnail") or info.get("thumbnails", [{}])[-1].get("url")

    # SoundCloud (and other audio-only platforms) never have video
    has_video = platform_name not in ("soundcloud",) and not audio_only

    # Find the downloaded file
    prefix = "audio." if audio_only else "video."
    file_path = None
    for f in os.listdir(output_dir):
        if f.startswith(prefix) and not f.endswith(".part"):
            file_path = os.path.join(output_dir, f)
            break

    if not file_path:
        files_found = os.listdir(output_dir)
        logger.error(
            f"[download_from_url] No file found in {output_dir}: {files_found}"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Downloaded file not found. Files: {files_found}",
        )

    return {
        "platform": platform_name,
        "title": title,
        "duration": duration,
        "file_path": file_path,
        "thumbnail_url": thumbnail_url,
        "has_video": has_video,
    }


# =============================================================================
# Unified Analysis Endpoint (multi-platform)
# =============================================================================


class AnalyzeUrlRequest(BaseModel):
    """Request for multi-platform audio analysis."""

    url: str
    prompts: Optional[str] = None
    chunk_duration_s: float = 10.0
    max_duration_s: float = 60.0


class AnalyzeUrlChunkResult(BaseModel):
    chunk_index: int
    start_time_s: float
    end_time_s: float
    global_scores: dict[str, float]
    frame_scores: dict[str, list[float]]


class AnalyzeUrlResponse(BaseModel):
    platform: str
    title: str
    duration_s: float
    analyzed_duration_s: float
    num_chunks: int
    prompts: list[str]
    chunks: list[AnalyzeUrlChunkResult]
    aggregated_scores: dict[str, float]
    timing: dict[str, float]


@app.post("/analyze-url", response_model=AnalyzeUrlResponse)
async def analyze_url(request: AnalyzeUrlRequest) -> AnalyzeUrlResponse:
    """
    Analyze audio from any supported URL (YouTube, Vimeo, SoundCloud, etc.).
    Downloads audio, splits into chunks, and runs FLAM inference.
    """
    global flam_model, device

    if flam_model is None:
        raise HTTPException(status_code=503, detail="FLAM model not loaded.")

    if request.prompts:
        prompt_list = [p.strip() for p in request.prompts.split(";") if p.strip()]
        if not prompt_list:
            prompt_list = DEFAULT_PROMPTS
    else:
        prompt_list = DEFAULT_PROMPTS

    timing: dict[str, float] = {}
    t_start = time.perf_counter()

    temp_dir = tempfile.mkdtemp(prefix="sonotag_url_")
    try:
        t_dl = time.perf_counter()
        dl = await download_from_url(request.url, temp_dir, audio_only=True)
        timing["download_ms"] = round((time.perf_counter() - t_dl) * 1000, 2)

        logger.info(
            f"[analyze-url] {dl['platform']}: {dl['title']} ({dl['duration']}s)"
        )

        t_load = time.perf_counter()
        try:
            full_audio, _sr = librosa.load(dl["file_path"], sr=SAMPLE_RATE, mono=True)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load audio: {e}")
        timing["load_ms"] = round((time.perf_counter() - t_load) * 1000, 2)

        actual_duration = len(full_audio) / SAMPLE_RATE
        max_samples = int(min(request.max_duration_s, actual_duration) * SAMPLE_RATE)
        if len(full_audio) > max_samples:
            full_audio = full_audio[:max_samples]
            actual_duration = len(full_audio) / SAMPLE_RATE

        chunk_samples = int(request.chunk_duration_s * SAMPLE_RATE)
        chunk_results: list[AnalyzeUrlChunkResult] = []

        t_inf = time.perf_counter()
        for i, start_sample in enumerate(range(0, len(full_audio), chunk_samples)):
            end_sample = min(start_sample + chunk_samples, len(full_audio))
            chunk_audio = full_audio[start_sample:end_sample]

            if len(chunk_audio) < EXPECTED_SAMPLES:
                repeats_needed = int(np.ceil(EXPECTED_SAMPLES / len(chunk_audio)))
                chunk_audio = np.tile(chunk_audio, repeats_needed)[:EXPECTED_SAMPLES]

            audio_tensor = torch.tensor(chunk_audio).unsqueeze(0).to(device)

            with torch.no_grad():
                local_similarity = flam_model.get_local_similarity(
                    audio=audio_tensor,
                    text=prompt_list,
                    method="unbiased",
                    cross_product=True,
                )
                local_sim_np = local_similarity.squeeze(0).cpu().numpy()

                frame_scores: dict[str, list[float]] = {}
                global_scores: dict[str, float] = {}
                for j, prompt in enumerate(prompt_list):
                    scores_per_frame = local_sim_np[j].tolist()
                    frame_scores[prompt] = [round(s, 4) for s in scores_per_frame]
                    global_scores[prompt] = round(float(np.mean(local_sim_np[j])), 4)

            chunk_results.append(
                AnalyzeUrlChunkResult(
                    chunk_index=i,
                    start_time_s=round(start_sample / SAMPLE_RATE, 2),
                    end_time_s=round(end_sample / SAMPLE_RATE, 2),
                    global_scores=global_scores,
                    frame_scores=frame_scores,
                )
            )

        timing["inference_ms"] = round((time.perf_counter() - t_inf) * 1000, 2)

        aggregated_scores = {}
        for prompt in prompt_list:
            all_chunk = [c.global_scores[prompt] for c in chunk_results]
            aggregated_scores[prompt] = round(float(np.mean(all_chunk)), 4)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    timing["total_ms"] = round((time.perf_counter() - t_start) * 1000, 2)

    return AnalyzeUrlResponse(
        platform=dl["platform"],
        title=dl["title"],
        duration_s=round(dl["duration"], 2),
        analyzed_duration_s=round(actual_duration, 2),
        num_chunks=len(chunk_results),
        prompts=prompt_list,
        chunks=chunk_results,
        aggregated_scores=aggregated_scores,
        timing=timing,
    )


# =============================================================================
# Unified Prepare-Video / Prepare-Audio Endpoint (multi-platform)
# =============================================================================


class PrepareMediaRequest(BaseModel):
    url: str


class PrepareMediaResponse(BaseModel):
    video_id: str
    title: str
    duration_s: float
    video_url: str  # /stream-video/{id} or empty for audio-only
    audio_url: str  # /stream-audio/{id} for audio-only platforms
    thumbnail_url: str  # Album art for SoundCloud
    has_video: bool
    platform: str
    ready: bool


@app.post("/prepare-video", response_model=PrepareMediaResponse)
async def prepare_video(request: PrepareMediaRequest) -> PrepareMediaResponse:
    """
    Prepare media for playback from any supported URL.
    For video platforms (YouTube, Vimeo): downloads video → /stream-video/{id}
    For audio-only (SoundCloud): downloads audio → /stream-audio/{id} + album art
    """
    url = (request.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="No URL provided")

    platform_name = detect_platform(url)
    audio_only = platform_name == "soundcloud"
    video_id = hashlib.md5(url.encode()).hexdigest()[:12]

    # Check cache
    if video_id in _prepared_videos:
        cached = _prepared_videos[video_id]
        return PrepareMediaResponse(
            video_id=video_id,
            title=cached["title"],
            duration_s=cached["duration_s"],
            video_url=f"/stream-video/{video_id}" if cached.get("has_video") else "",
            audio_url=(
                f"/stream-audio/{video_id}" if not cached.get("has_video") else ""
            ),
            thumbnail_url=cached.get("thumbnail_url", ""),
            has_video=cached.get("has_video", True),
            platform=cached.get("platform", "unknown"),
            ready=True,
        )

    media_dir = os.path.join(tempfile.gettempdir(), f"sonotag_media_{video_id}")
    os.makedirs(media_dir, exist_ok=True)

    dl = await download_from_url(url, media_dir, audio_only=audio_only)

    _prepared_videos[video_id] = {
        "title": dl["title"],
        "duration_s": dl["duration"],
        "file_path": dl["file_path"],
        "dir_path": media_dir,
        "has_video": dl["has_video"],
        "thumbnail_url": dl.get("thumbnail_url", ""),
        "platform": dl["platform"],
    }

    logger.info(
        f"[prepare-video] {dl['platform']}: {dl['title']} ({dl['duration']}s) has_video={dl['has_video']}"
    )

    return PrepareMediaResponse(
        video_id=video_id,
        title=dl["title"],
        duration_s=dl["duration"],
        video_url=f"/stream-video/{video_id}" if dl["has_video"] else "",
        audio_url=f"/stream-audio/{video_id}" if not dl["has_video"] else "",
        thumbnail_url=dl.get("thumbnail_url", "") or "",
        has_video=dl["has_video"],
        platform=dl["platform"],
        ready=True,
    )


# =============================================================================
# Audio Streaming (for SoundCloud and other audio-only platforms)
# =============================================================================


@app.get("/stream-audio/{video_id}")
async def stream_audio(video_id: str):
    """Stream audio for audio-only platforms (SoundCloud, etc.)."""
    if video_id not in _prepared_videos:
        raise HTTPException(
            status_code=404, detail="Audio not found. Please prepare it first."
        )

    info = _prepared_videos[video_id]
    file_path = info["file_path"]

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file not found on disk.")

    ext = os.path.splitext(file_path)[1].lower()
    content_type_map = {
        ".mp3": "audio/mpeg",
        ".opus": "audio/opus",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".wav": "audio/wav",
        ".webm": "audio/webm",
        ".flac": "audio/flac",
    }
    content_type = content_type_map.get(ext, "audio/mpeg")

    return FileResponse(
        file_path,
        media_type=content_type,
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
        },
    )


# =============================================================================
# YouTube Analysis Endpoint (legacy — aliases to /analyze-url)
# =============================================================================


class YouTubeAnalysisRequest(BaseModel):
    """Request for YouTube audio analysis."""

    url: str
    prompts: Optional[str] = None  # Semicolon-separated prompts
    chunk_duration_s: float = 10.0  # Duration of each chunk to analyze
    max_duration_s: float = 60.0  # Maximum video duration to analyze


class YouTubeChunkResult(BaseModel):
    """Result for a single chunk of YouTube audio."""

    chunk_index: int
    start_time_s: float
    end_time_s: float
    global_scores: dict[str, float]
    frame_scores: dict[str, list[float]]


class YouTubeAnalysisResponse(BaseModel):
    """Response from YouTube audio analysis."""

    video_title: str
    video_duration_s: float
    analyzed_duration_s: float
    num_chunks: int
    prompts: list[str]
    chunks: list[YouTubeChunkResult]
    aggregated_scores: dict[str, float]  # Mean across all chunks
    timing: dict[str, float]


@app.post("/analyze-youtube", response_model=YouTubeAnalysisResponse)
async def analyze_youtube(request: YouTubeAnalysisRequest) -> YouTubeAnalysisResponse:
    """
    Analyze audio from a YouTube video using FLAM.

    Downloads the audio using yt-dlp, splits into chunks, and runs FLAM inference
    on each chunk. Returns per-chunk and aggregated scores.

    Args:
        request: YouTube URL and analysis parameters
    """
    global flam_model, device

    import shutil
    import tempfile

    # Check if model is loaded
    if flam_model is None:
        raise HTTPException(
            status_code=503,
            detail="FLAM model not loaded. Check server logs.",
        )

    # Check if yt-dlp is available
    try:
        import yt_dlp
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="yt-dlp not installed. Run: pip install yt-dlp",
        )

    # Parse prompts
    if request.prompts:
        prompt_list = [p.strip() for p in request.prompts.split(";") if p.strip()]
        if not prompt_list:
            prompt_list = DEFAULT_PROMPTS
    else:
        prompt_list = DEFAULT_PROMPTS

    timing = {}
    t_start = time.perf_counter()

    # Create temp directory for audio
    temp_dir = tempfile.mkdtemp(prefix="sonotag_yt_")

    try:
        # Download audio using yt-dlp
        t_download_start = time.perf_counter()

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(temp_dir, "audio.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
        }

        video_title = "Unknown"
        video_duration = 0.0

        # Try download with multiple player_client strategies
        # Uses StrategyHealthTracker for dynamic ordering based on success/failure
        player_client_strategies = youtube_strategy_tracker.get_ordered_strategies()
        last_error = None
        for strategy in player_client_strategies:
            try:
                ydl_opts["extractor_args"] = {"youtube": {"player_client": strategy}}
                logger.info(f"[analyze-youtube] Trying player_client={strategy}")
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(request.url, download=True)
                    video_title = info.get("title", "Unknown")
                    video_duration = info.get("duration", 0) or 0
                youtube_strategy_tracker.record_success(strategy)
                last_error = None
                break
            except Exception as e:
                last_error = e
                youtube_strategy_tracker.record_failure(strategy)
                logger.warning(
                    f"[analyze-youtube] Strategy {strategy} failed: {type(e).__name__}: {e}"
                )
                for f in os.listdir(temp_dir):
                    fpath = os.path.join(temp_dir, f)
                    if os.path.isfile(fpath):
                        os.remove(fpath)
                continue

        if last_error is not None:
            logger.error(
                f"yt-dlp failed all strategies for URL '{request.url}': {last_error}"
            )
            failure_detail = build_youtube_failure_detail(last_error)
            raise HTTPException(status_code=502, detail=failure_detail)

        t_download_end = time.perf_counter()
        timing["download_ms"] = round((t_download_end - t_download_start) * 1000, 2)

        logger.info(f"Downloaded YouTube audio: {video_title} ({video_duration}s)")

        # Find the downloaded audio file (could be any format without FFmpeg)
        audio_file = None
        for f in os.listdir(temp_dir):
            if f.startswith("audio.") and not f.endswith(".part"):
                audio_file = os.path.join(temp_dir, f)
                break

        if not audio_file:
            # List files for debugging
            files_in_dir = os.listdir(temp_dir)
            logger.error(f"Files in temp dir: {files_in_dir}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to find downloaded audio file. Files found: {files_in_dir}",
            )

        # Load audio
        t_load_start = time.perf_counter()
        try:
            full_audio, sr = librosa.load(audio_file, sr=SAMPLE_RATE, mono=True)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load audio: {e}",
            )
        t_load_end = time.perf_counter()
        timing["load_ms"] = round((t_load_end - t_load_start) * 1000, 2)

        actual_duration = len(full_audio) / SAMPLE_RATE
        logger.info(f"Loaded audio: {actual_duration:.2f}s at {SAMPLE_RATE}Hz")

        # Limit to max duration
        max_samples = int(min(request.max_duration_s, actual_duration) * SAMPLE_RATE)
        if len(full_audio) > max_samples:
            full_audio = full_audio[:max_samples]
            actual_duration = len(full_audio) / SAMPLE_RATE

        # Split into chunks
        chunk_samples = int(request.chunk_duration_s * SAMPLE_RATE)
        chunks = []
        chunk_results = []

        t_inference_start = time.perf_counter()

        for i, start_sample in enumerate(range(0, len(full_audio), chunk_samples)):
            end_sample = min(start_sample + chunk_samples, len(full_audio))
            chunk_audio = full_audio[start_sample:end_sample]

            # Tile if needed (FLAM expects 10s = 480,000 samples)
            if len(chunk_audio) < EXPECTED_SAMPLES:
                repeats_needed = int(np.ceil(EXPECTED_SAMPLES / len(chunk_audio)))
                chunk_audio = np.tile(chunk_audio, repeats_needed)[:EXPECTED_SAMPLES]

            # Convert to tensor
            audio_tensor = torch.tensor(chunk_audio).unsqueeze(0).to(device)

            # Run FLAM inference
            with torch.no_grad():
                local_similarity = flam_model.get_local_similarity(
                    audio=audio_tensor,
                    text=prompt_list,
                    method="unbiased",
                    cross_product=True,
                )

                local_sim_np = local_similarity.squeeze(0).cpu().numpy()

                frame_scores = {}
                global_scores = {}

                for j, prompt in enumerate(prompt_list):
                    scores_per_frame = local_sim_np[j].tolist()
                    frame_scores[prompt] = [round(s, 4) for s in scores_per_frame]
                    global_scores[prompt] = round(float(np.mean(local_sim_np[j])), 4)

            chunk_results.append(
                YouTubeChunkResult(
                    chunk_index=i,
                    start_time_s=round(start_sample / SAMPLE_RATE, 2),
                    end_time_s=round(end_sample / SAMPLE_RATE, 2),
                    global_scores=global_scores,
                    frame_scores=frame_scores,
                )
            )

        t_inference_end = time.perf_counter()
        timing["inference_ms"] = round((t_inference_end - t_inference_start) * 1000, 2)

        # Compute aggregated scores (mean across all chunks)
        aggregated_scores = {}
        for prompt in prompt_list:
            all_chunk_scores = [c.global_scores[prompt] for c in chunk_results]
            aggregated_scores[prompt] = round(float(np.mean(all_chunk_scores)), 4)

    finally:
        # Cleanup temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)

    t_end = time.perf_counter()
    timing["total_ms"] = round((t_end - t_start) * 1000, 2)

    return YouTubeAnalysisResponse(
        video_title=video_title,
        video_duration_s=round(video_duration, 2),
        analyzed_duration_s=round(actual_duration, 2),
        num_chunks=len(chunk_results),
        prompts=prompt_list,
        chunks=chunk_results,
        aggregated_scores=aggregated_scores,
        timing=timing,
    )


# =============================================================================
# YouTube Video Streaming (for live playback + FLAM analysis)
# =============================================================================

# Store prepared videos in memory (simple cache)
_prepared_videos: dict[str, dict] = {}


class PrepareVideoRequest(BaseModel):
    """Request to prepare a YouTube video for playback."""

    url: str


class PrepareVideoResponse(BaseModel):
    """Response after preparing a YouTube video."""

    video_id: str
    title: str
    duration_s: float
    video_url: str  # URL to stream the video
    ready: bool


@app.post("/prepare-youtube-video", response_model=PrepareVideoResponse)
async def prepare_youtube_video(request: PrepareVideoRequest) -> PrepareVideoResponse:
    """
    Prepare a YouTube video for local playback.

    Downloads the video using yt-dlp and stores it for streaming.
    Returns a local URL that can be used in a <video> element.
    """
    logger.debug(f"[prepare-youtube-video] Request received, url: {request.url}")
    # Validate URL
    url = (request.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="No URL provided")

    if not re.match(
        r"^https?://(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)/", url
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL. Please provide a valid youtube.com or youtu.be link.",
        )

    try:
        import yt_dlp
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="yt-dlp not installed. Run: pip install yt-dlp",
        )

    # Create a hash of the URL for the video ID
    video_id = hashlib.md5(request.url.encode()).hexdigest()[:12]
    logger.debug(f"[prepare-youtube-video] video_id={video_id}")

    # Check if already prepared
    if video_id in _prepared_videos:
        info = _prepared_videos[video_id]
        logger.debug(f"[prepare-youtube-video] Cache hit: {info['title']}")
        return PrepareVideoResponse(
            video_id=video_id,
            title=info["title"],
            duration_s=info["duration_s"],
            video_url=f"/stream-video/{video_id}",
            ready=True,
        )

    # Create temp directory for this video
    video_dir = os.path.join(tempfile.gettempdir(), f"sonotag_video_{video_id}")
    os.makedirs(video_dir, exist_ok=True)
    logger.debug(f"[prepare-youtube-video] Downloading to {video_dir}")

    # Download video with audio using yt-dlp
    # Relaxed format: android client may return limited formats, so fallback broadly
    ydl_opts = {
        "format": "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
        "merge_output_format": "mp4",
        "outtmpl": os.path.join(video_dir, "video.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
    }

    # Try download with multiple player_client strategies
    # Uses StrategyHealthTracker for dynamic ordering based on success/failure
    player_client_strategies = youtube_strategy_tracker.get_ordered_strategies()
    last_error = None
    for strategy in player_client_strategies:
        try:
            ydl_opts["extractor_args"] = {"youtube": {"player_client": strategy}}
            logger.info(f"[prepare-youtube-video] Trying player_client={strategy}")
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(request.url, download=True)
                video_title = info.get("title", "Unknown")
                video_duration = info.get("duration", 0) or 0
            youtube_strategy_tracker.record_success(strategy)
            last_error = None
            break
        except Exception as e:
            last_error = e
            youtube_strategy_tracker.record_failure(strategy)
            logger.warning(
                f"[prepare-youtube-video] Strategy {strategy} failed: {type(e).__name__}: {e}"
            )
            # Clean up any partial downloads before retry
            for f in os.listdir(video_dir):
                fpath = os.path.join(video_dir, f)
                if os.path.isfile(fpath):
                    os.remove(fpath)
            continue

    if last_error is not None:
        logger.error(
            f"yt-dlp failed all strategies for URL '{request.url}': {last_error}"
        )
        failure_detail = build_youtube_failure_detail(last_error)
        raise HTTPException(status_code=502, detail=failure_detail)

    # Find the downloaded video file
    video_file = None
    dir_contents = os.listdir(video_dir)
    logger.debug(f"[prepare-youtube-video] Directory contents: {dir_contents}")
    for f in dir_contents:
        if f.startswith("video.") and not f.endswith(".part"):
            video_file = os.path.join(video_dir, f)
            break

    if not video_file:
        logger.error(f"No video file found in {video_dir}")
        raise HTTPException(
            status_code=500,
            detail="Failed to find downloaded video file",
        )

    logger.debug(f"[prepare-youtube-video] Found video file: {video_file}")

    # Store video info
    _prepared_videos[video_id] = {
        "title": video_title,
        "duration_s": video_duration,
        "file_path": video_file,
        "dir_path": video_dir,
    }

    logger.info(f"Prepared YouTube video: {video_title} ({video_duration}s)")

    return PrepareVideoResponse(
        video_id=video_id,
        title=video_title,
        duration_s=video_duration,
        video_url=f"/stream-video/{video_id}",
        ready=True,
    )


@app.get("/stream-video/{video_id}")
async def stream_video(video_id: str):
    """
    Stream a prepared YouTube video.

    This endpoint serves the video file for playback in a <video> element.
    """
    logger.debug(f"[stream-video] video_id={video_id}")
    if video_id not in _prepared_videos:
        raise HTTPException(
            status_code=404,
            detail="Video not found. Please prepare it first.",
        )

    video_info = _prepared_videos[video_id]
    video_file = video_info["file_path"]
    logger.debug(f"[stream-video] Serving: {video_file}")

    if not os.path.exists(video_file):
        raise HTTPException(
            status_code=404,
            detail="Video file not found on disk.",
        )

    # Determine content type from extension
    ext = os.path.splitext(video_file)[1].lower()
    content_type_map = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mkv": "video/x-matroska",
        ".mov": "video/quicktime",
    }
    content_type = content_type_map.get(ext, "video/mp4")

    return FileResponse(
        video_file,
        media_type=content_type,
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
        },
    )


@app.delete("/cleanup-video/{video_id}")
async def cleanup_video(video_id: str):
    """
    Clean up a prepared video to free disk space.
    """
    if video_id not in _prepared_videos:
        return {"status": "not_found"}

    video_info = _prepared_videos.pop(video_id)
    dir_path = video_info.get("dir_path")

    if dir_path and os.path.exists(dir_path):
        shutil.rmtree(dir_path, ignore_errors=True)

    return {"status": "cleaned_up", "video_id": video_id}


# =============================================================================
# Static File Serving (for Railway deployment)
# =============================================================================

# Serve React frontend static files when deployed
# The frontend is built and copied to backend/static during Railway build
from fastapi.staticfiles import StaticFiles

static_dir = os.path.join(os.path.dirname(__file__), "..", "static")

if os.path.exists(static_dir):
    # Mount assets directory for JS, CSS, images
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_react_app():
        """Serve the React app's index.html."""
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Frontend not found")

    # Catch-all route for client-side routing (must be last)
    @app.get("/{path:path}")
    async def serve_react_routes(path: str):
        """
        Serve static files or fall back to index.html for client-side routing.
        This must be defined after all API routes.
        """
        # Skip API routes
        if (
            path.startswith("api/")
            or path
            in [
                "health",
                "model-status",
                "prompts",
                "system-info",
                "recommend-buffer",
                "classify",
                "classify-local",
                "analyze-youtube",
                "analyze-url",
                "prepare-youtube-video",
                "prepare-video",
                "cleanup-video",
            ]
            or path.startswith("stream-video/")
            or path.startswith("stream-audio/")
            or path.startswith("cleanup-video/")
        ):
            raise HTTPException(status_code=404, detail="Not found")

        # Try to serve the exact file
        file_path = os.path.join(static_dir, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)

        # Fall back to index.html for client-side routing
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)

        raise HTTPException(status_code=404, detail="Not found")

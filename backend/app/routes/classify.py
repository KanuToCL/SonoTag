import io
import logging
import time
from typing import Optional

import librosa
import numpy as np
import torch
from app.constants import (
    DEFAULT_PROMPTS,
    EXPECTED_SAMPLES,
    MAX_DURATION_SECONDS,
    MIN_EVENT_FRAMES,
    MIN_GAP_FRAMES,
    MIN_SPIKE_FRAMES,
    SAMPLE_RATE,
)
from app.models.responses import (
    ClassifyLocalResponse,
    ClassifyResponse,
    PromptsResponse,
)
from app.services.flam import postprocess_frame_scores
from app.state.model import get_device, get_flam_model, get_text_embeddings
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/prompts", response_model=PromptsResponse)
def get_prompts() -> PromptsResponse:
    """Get the current list of prompts used for classification."""
    return PromptsResponse(
        prompts=DEFAULT_PROMPTS,
        count=len(DEFAULT_PROMPTS),
    )


@router.get("/model-status")
def model_status() -> dict:
    """Check if FLAM model is loaded and ready."""
    flam_model = get_flam_model()
    device = get_device()
    text_embeddings = get_text_embeddings()
    return {
        "loaded": flam_model is not None,
        "device": str(device) if device else None,
        "prompts_cached": text_embeddings is not None,
        "prompt_count": len(DEFAULT_PROMPTS) if text_embeddings is not None else 0,
    }


@router.post("/classify", response_model=ClassifyResponse)
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
    flam_model = get_flam_model()
    device = get_device()
    text_embeddings = get_text_embeddings()

    if flam_model is None:
        raise HTTPException(
            status_code=503,
            detail="FLAM model not loaded. Check server logs.",
        )

    if prompts:
        prompt_list = [p.strip() for p in prompts.split(";") if p.strip()]
        if not prompt_list:
            prompt_list = DEFAULT_PROMPTS
            current_text_embeddings = text_embeddings
        else:
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

    timing = {}
    t_start = time.perf_counter()

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

    try:
        audio_array, sr = librosa.load(audio_buffer, sr=SAMPLE_RATE, mono=True)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to decode audio: {e}. Ensure file is a valid audio format.",
        )

    t_after_decode = time.perf_counter()
    timing["decode_ms"] = round((t_after_decode - t_after_read) * 1000, 2)

    max_samples = int(SAMPLE_RATE * MAX_DURATION_SECONDS)
    if len(audio_array) > max_samples:
        audio_array = audio_array[:max_samples]

    duration_s = len(audio_array) / SAMPLE_RATE

    original_len = len(audio_array)
    if len(audio_array) < EXPECTED_SAMPLES:
        repeats_needed = int(np.ceil(EXPECTED_SAMPLES / len(audio_array)))
        audio_array = np.tile(audio_array, repeats_needed)[:EXPECTED_SAMPLES]
        logger.info(
            f"Tiled audio from {original_len} to {EXPECTED_SAMPLES} samples "
            f"({original_len / SAMPLE_RATE:.2f}s repeated to fill 10.00s)"
        )

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

    audio_tensor = torch.tensor(audio_array).unsqueeze(0).to(device)

    t_after_tensor = time.perf_counter()
    timing["tensor_ms"] = round((t_after_tensor - t_after_decode) * 1000, 2)

    try:
        with torch.no_grad():
            t_before_audio = time.perf_counter()
            audio_features = flam_model.get_global_audio_features(audio_tensor)
            t_after_audio = time.perf_counter()
            timing["audio_embed_ms"] = round((t_after_audio - t_before_audio) * 1000, 2)

            similarities = (current_text_embeddings @ audio_features.T).squeeze(1)

            t_after_similarity = time.perf_counter()
            timing["similarity_ms"] = round(
                (t_after_similarity - t_after_audio) * 1000, 2
            )

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


@router.post("/classify-local", response_model=ClassifyLocalResponse)
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
    flam_model = get_flam_model()
    device = get_device()

    if flam_model is None:
        raise HTTPException(
            status_code=503,
            detail="FLAM model not loaded. Check server logs.",
        )

    if prompts:
        prompt_list = [p.strip() for p in prompts.split(";") if p.strip()]
        if not prompt_list:
            prompt_list = DEFAULT_PROMPTS
    else:
        prompt_list = DEFAULT_PROMPTS

    timing = {}
    t_start = time.perf_counter()

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

    try:
        audio_array, sr = librosa.load(audio_buffer, sr=SAMPLE_RATE, mono=True)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to decode audio: {e}. Ensure file is a valid audio format.",
        )

    t_after_decode = time.perf_counter()
    timing["decode_ms"] = round((t_after_decode - t_after_read) * 1000, 2)

    max_samples = int(SAMPLE_RATE * MAX_DURATION_SECONDS)
    if len(audio_array) > max_samples:
        audio_array = audio_array[:max_samples]

    duration_s = len(audio_array) / SAMPLE_RATE

    original_len = len(audio_array)
    if len(audio_array) < EXPECTED_SAMPLES:
        repeats_needed = int(np.ceil(EXPECTED_SAMPLES / len(audio_array)))
        audio_array = np.tile(audio_array, repeats_needed)[:EXPECTED_SAMPLES]
        logger.info(
            f"Tiled audio from {original_len} to {EXPECTED_SAMPLES} samples "
            f"({original_len / SAMPLE_RATE:.2f}s repeated to fill 10.00s)"
        )

    audio_tensor = torch.tensor(audio_array).unsqueeze(0).to(device)

    t_after_tensor = time.perf_counter()
    timing["tensor_ms"] = round((t_after_tensor - t_after_decode) * 1000, 2)

    try:
        with torch.no_grad():
            t_before_inference = time.perf_counter()

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

            local_sim_np = local_similarity.squeeze(0).cpu().numpy()

            num_frames = local_sim_np.shape[1]

            frame_scores = {}
            global_scores = {}

            for i, prompt in enumerate(prompt_list):
                scores_per_frame = local_sim_np[i].tolist()
                frame_scores[prompt] = [round(s, 4) for s in scores_per_frame]

                mean_score = float(np.mean(local_sim_np[i]))
                global_scores[prompt] = round(mean_score, 4)

            frame_duration_s = 10.0 / num_frames

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

import logging
import os

import numpy as np
import torch
from app.constants import (
    DEFAULT_PROMPTS,
    EXPECTED_SAMPLES,
    MIN_EVENT_FRAMES,
    MIN_GAP_FRAMES,
    MIN_SPIKE_FRAMES,
    SAMPLE_RATE,
)
from app.state.model import (
    get_device,
    get_flam_model,
    set_device,
    set_flam_model,
    set_text_embeddings,
)

logger = logging.getLogger(__name__)


def load_model() -> None:
    """Load FLAM model at startup. Called from the lifespan context manager."""
    try:
        import openflam

        # Determine device (MPS not supported by FLAM, falls back to CPU)
        if torch.cuda.is_available():
            device = torch.device("cuda")
        else:
            device = torch.device("cpu")

        set_device(device)
        logger.info(f"Loading FLAM model on device: {device}")

        # Model path - check multiple locations
        model_path = os.getenv("FLAM_MODEL_PATH", None)

        possible_paths = [
            model_path,
            "openflam_ckpt",
            "../openflam_ckpt",
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "openflam_ckpt"),
            os.path.expanduser("~/.cache/openflam"),
        ]

        actual_path = None
        for p in possible_paths:
            if p and os.path.exists(p):
                actual_path = p
                break

        if actual_path is None:
            cache_dir = os.path.expanduser("~/.cache/openflam")
            os.makedirs(cache_dir, exist_ok=True)
            actual_path = cache_dir
            logger.info(f"Model checkpoint not found, will download to: {cache_dir}")

        logger.info(f"Using model path: {actual_path}")

        model = openflam.OpenFLAM(
            model_name="v1-base",
            default_ckpt_path=actual_path,
        ).to(device)

        set_flam_model(model)

        # Pre-compute text embeddings for default prompts
        with torch.no_grad():
            text_embeddings = model.get_text_features(DEFAULT_PROMPTS)

        set_text_embeddings(text_embeddings)

        logger.info(
            f"FLAM model loaded. Text embeddings cached for {len(DEFAULT_PROMPTS)} prompts."
        )

    except ImportError:
        logger.warning(
            "OpenFLAM not installed. Inference endpoints will return mock data."
        )
    except Exception as e:
        logger.error(f"Failed to load FLAM model: {e}")


def unload_model() -> None:
    """Clean up model resources on shutdown."""
    logger.info("Shutting down FLAM model...")
    set_flam_model(None)
    set_text_embeddings(None)


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

    # Step 1: Fill short gaps between positive segments
    i = 0
    while i < n:
        if binary[i] == 0:
            gap_start = i
            while i < n and binary[i] == 0:
                i += 1
            gap_end = i
            gap_length = gap_end - gap_start

            has_positive_before = gap_start > 0 and binary[gap_start - 1] == 1
            has_positive_after = gap_end < n and binary[gap_end] == 1

            if (
                has_positive_before
                and has_positive_after
                and gap_length < min_gap_frames
            ):
                for j in range(gap_start, gap_end):
                    binary[j] = 1
        else:
            i += 1

    # Step 2: Remove short spikes in long events
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

    total_positive_frames = sum(end - start for start, end in positive_segments)

    if total_positive_frames > min_event_frames:
        for seg_start, seg_end in positive_segments:
            seg_length = seg_end - seg_start
            if seg_length < min_spike_frames:
                for j in range(seg_start, seg_end):
                    binary[j] = 0

    # Convert binary back to smoothed scores
    smoothed = []
    for i, (score, is_positive) in enumerate(zip(scores, binary)):
        if is_positive:
            smoothed.append(max(score, threshold))
        else:
            smoothed.append(min(score, threshold * 0.5))

    return smoothed

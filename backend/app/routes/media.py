import hashlib
import logging
import os
import shutil
import tempfile
import time

import librosa
import numpy as np
import torch
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.constants import DEFAULT_PROMPTS, EXPECTED_SAMPLES, SAMPLE_RATE
from app.models.requests import AnalyzeUrlRequest, PrepareMediaRequest
from app.models.responses import (
    AnalyzeUrlChunkResult,
    AnalyzeUrlResponse,
    PrepareMediaResponse,
)
from app.services.download import download_from_url
from app.services.system import detect_platform
from app.state.model import get_device, get_flam_model, get_prepared_videos

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/analyze-url", response_model=AnalyzeUrlResponse)
async def analyze_url(request: AnalyzeUrlRequest) -> AnalyzeUrlResponse:
    """
    Analyze audio from any supported URL (YouTube, Vimeo, SoundCloud, etc.).
    Downloads audio, splits into chunks, and runs FLAM inference.
    """
    flam_model = get_flam_model()
    device = get_device()

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


@router.post("/prepare-video", response_model=PrepareMediaResponse)
async def prepare_video(request: PrepareMediaRequest) -> PrepareMediaResponse:
    """
    Prepare media for playback from any supported URL.
    For video platforms (YouTube, Vimeo): downloads video → /stream-video/{id}
    For audio-only (SoundCloud): downloads audio → /stream-audio/{id} + album art
    """
    _prepared_videos = get_prepared_videos()

    url = (request.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="No URL provided")

    platform_name = detect_platform(url)
    audio_only = platform_name == "soundcloud"
    video_id = hashlib.md5(url.encode()).hexdigest()[:12]

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


@router.get("/stream-audio/{video_id}")
async def stream_audio(video_id: str):
    """Stream audio for audio-only platforms (SoundCloud, etc.)."""
    _prepared_videos = get_prepared_videos()

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

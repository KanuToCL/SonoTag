import hashlib
import logging
import os
import re
import shutil
import tempfile
import time

import librosa
import numpy as np
import torch
from app.constants import DEFAULT_PROMPTS, EXPECTED_SAMPLES, SAMPLE_RATE
from app.models.requests import PrepareVideoRequest, YouTubeAnalysisRequest
from app.models.responses import (
    PrepareVideoResponse,
    YouTubeAnalysisResponse,
    YouTubeChunkResult,
)
from app.services.download import (
    build_youtube_failure_detail,
    StrategyHealthTracker,
    youtube_strategy_tracker,
)
from app.state.model import get_device, get_flam_model, get_prepared_videos
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/analyze-youtube", response_model=YouTubeAnalysisResponse)
async def analyze_youtube(request: YouTubeAnalysisRequest) -> YouTubeAnalysisResponse:
    """
    Analyze audio from a YouTube video using FLAM.

    Downloads the audio using yt-dlp, splits into chunks, and runs FLAM inference
    on each chunk. Returns per-chunk and aggregated scores.

    Args:
        request: YouTube URL and analysis parameters
    """
    flam_model = get_flam_model()
    device = get_device()

    if flam_model is None:
        raise HTTPException(
            status_code=503,
            detail="FLAM model not loaded. Check server logs.",
        )

    try:
        import yt_dlp
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="yt-dlp not installed. Run: pip install yt-dlp",
        )

    if request.prompts:
        prompt_list = [p.strip() for p in request.prompts.split(";") if p.strip()]
        if not prompt_list:
            prompt_list = DEFAULT_PROMPTS
    else:
        prompt_list = DEFAULT_PROMPTS

    timing = {}
    t_start = time.perf_counter()

    temp_dir = tempfile.mkdtemp(prefix="sonotag_yt_")

    try:
        t_download_start = time.perf_counter()

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(temp_dir, "audio.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
        }

        video_title = "Unknown"
        video_duration = 0.0

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

        audio_file = None
        for f in os.listdir(temp_dir):
            if f.startswith("audio.") and not f.endswith(".part"):
                audio_file = os.path.join(temp_dir, f)
                break

        if not audio_file:
            files_in_dir = os.listdir(temp_dir)
            logger.error(f"Files in temp dir: {files_in_dir}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to find downloaded audio file. Files found: {files_in_dir}",
            )

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

        max_samples = int(min(request.max_duration_s, actual_duration) * SAMPLE_RATE)
        if len(full_audio) > max_samples:
            full_audio = full_audio[:max_samples]
            actual_duration = len(full_audio) / SAMPLE_RATE

        chunk_samples = int(request.chunk_duration_s * SAMPLE_RATE)
        chunks = []
        chunk_results = []

        t_inference_start = time.perf_counter()

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

        aggregated_scores = {}
        for prompt in prompt_list:
            all_chunk_scores = [c.global_scores[prompt] for c in chunk_results]
            aggregated_scores[prompt] = round(float(np.mean(all_chunk_scores)), 4)

    finally:
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


@router.post("/prepare-youtube-video", response_model=PrepareVideoResponse)
async def prepare_youtube_video(request: PrepareVideoRequest) -> PrepareVideoResponse:
    """
    Prepare a YouTube video for local playback.

    Downloads the video using yt-dlp and stores it for streaming.
    Returns a local URL that can be used in a <video> element.
    """
    _prepared_videos = get_prepared_videos()

    logger.debug(f"[prepare-youtube-video] Request received, url: {request.url}")
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

    video_id = hashlib.md5(request.url.encode()).hexdigest()[:12]
    logger.debug(f"[prepare-youtube-video] video_id={video_id}")

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

    video_dir = os.path.join(tempfile.gettempdir(), f"sonotag_video_{video_id}")
    os.makedirs(video_dir, exist_ok=True)
    logger.debug(f"[prepare-youtube-video] Downloading to {video_dir}")

    ydl_opts = {
        "format": "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
        "merge_output_format": "mp4",
        "outtmpl": os.path.join(video_dir, "video.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
    }

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


@router.get("/stream-video/{video_id}")
async def stream_video(video_id: str):
    """
    Stream a prepared YouTube video.

    This endpoint serves the video file for playback in a <video> element.
    """
    _prepared_videos = get_prepared_videos()

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


@router.delete("/cleanup-video/{video_id}")
async def cleanup_video(video_id: str):
    """
    Clean up a prepared video to free disk space.
    """
    _prepared_videos = get_prepared_videos()

    if video_id not in _prepared_videos:
        return {"status": "not_found"}

    video_info = _prepared_videos.pop(video_id)
    dir_path = video_info.get("dir_path")

    if dir_path and os.path.exists(dir_path):
        shutil.rmtree(dir_path, ignore_errors=True)

    return {"status": "cleaned_up", "video_id": video_id}

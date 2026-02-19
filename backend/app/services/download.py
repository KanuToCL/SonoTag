import logging
import os
import time

from app.services.system import detect_platform
from fastapi import HTTPException

logger = logging.getLogger(__name__)


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
                return (1, 0)
            success_rate = stats["successes"] / total
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


def build_youtube_failure_detail(last_error: Exception | None) -> str:
    """
    Build a diagnostic, user-facing error message when all YouTube strategies fail.
    Returns a human-readable string (FastAPI detail must be string for frontend compat).
    """
    error_str = str(last_error).lower() if last_error else ""

    if "sign in" in error_str or "bot" in error_str or "confirm" in error_str:
        user_message = (
            "YouTube is blocking downloads from this server due to bot detection."
        )
        suggestion = "Try Vimeo or SoundCloud — they work reliably from this server."
    elif "no video formats" in error_str or "sabr" in error_str:
        user_message = (
            "YouTube changed its streaming protocol and no compatible format was found."
        )
        suggestion = "Try Vimeo or SoundCloud — they work reliably from this server."
    elif "drm" in error_str:
        user_message = "This video uses DRM protection and cannot be downloaded."
        suggestion = "Try a different video URL."
    elif "private" in error_str or "unavailable" in error_str:
        user_message = "This video is private, unavailable, or region-locked."
        suggestion = "Try a different video URL."
    else:
        user_message = "YouTube download failed for an unexpected reason."
        suggestion = "Try again later, or use Vimeo / SoundCloud instead."

    return f"{user_message} {suggestion}"


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

    if platform_name == "youtube":
        player_client_strategies = youtube_strategy_tracker.get_ordered_strategies()
        logger.info(
            f"[download_from_url] YouTube strategy order: {player_client_strategies}"
        )
    else:
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

    has_video = platform_name not in ("soundcloud",) and not audio_only

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

import os
import platform
import shutil
import subprocess
import tempfile

from fastapi import APIRouter

from app.services.download import StrategyHealthTracker, youtube_strategy_tracker

router = APIRouter()


@router.get("/debug/youtube-env")
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

    try:
        import yt_dlp

        debug_info["yt_dlp"]["installed"] = True
        debug_info["yt_dlp"]["version"] = yt_dlp.version.__version__
    except ImportError:
        debug_info["yt_dlp"]["installed"] = False
        debug_info["yt_dlp"]["version"] = None
    except Exception as e:
        debug_info["yt_dlp"]["error"] = str(e)

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

    temp_dir = tempfile.gettempdir()
    debug_info["temp_dir"]["path"] = temp_dir
    debug_info["temp_dir"]["writable"] = os.access(temp_dir, os.W_OK)
    debug_info["temp_dir"]["free_space_mb"] = round(
        shutil.disk_usage(temp_dir).free / (1024 * 1024), 2
    )

    return debug_info


@router.get("/debug/youtube-test")
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
            "skip_download": True,
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

    shutil.rmtree(temp_dir, ignore_errors=True)

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


@router.get("/debug/strategy-health")
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

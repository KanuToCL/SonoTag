import json
import platform
import re
import subprocess

import psutil


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


def get_gpu_info() -> list[dict]:
    system = platform.system().lower()
    if system == "windows":
        return _get_windows_gpus()
    if system == "darwin":
        return _get_macos_gpus()
    if system == "linux":
        return _get_linux_gpus()
    return []


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


def recommend_buffer_seconds(cores: int) -> float:
    if cores <= 4:
        return 10.0
    if cores <= 8:
        return 5.0
    return 2.0

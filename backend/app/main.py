from typing import Optional
import json
import os
import platform
import re
import subprocess

import psutil
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="FLAM Backend", version="0.1.0")

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
                "memory_bytes": item.get("AdapterRAM")
                if isinstance(item, dict)
                else None,
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
                "memory_bytes": item.get("DedicatedVideoMemory")
                if isinstance(item, dict)
                else None,
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

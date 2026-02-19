import os
import platform

import psutil
from app.models.requests import RecommendRequest
from app.models.responses import RecommendResponse
from app.services.system import get_gpu_info, recommend_buffer_seconds
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/system-info")
def system_info() -> dict:
    cpu_model = platform.processor()
    if not cpu_model:
        cpu_model = platform.uname().processor or platform.uname().machine

    memory = psutil.virtual_memory()
    gpus = get_gpu_info()
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


@router.post("/recommend-buffer", response_model=RecommendResponse)
def recommend_buffer(payload: RecommendRequest) -> RecommendResponse:
    cores = os.cpu_count() or 4
    recommended = recommend_buffer_seconds(cores)
    rationale = "Heuristic based on CPU core count. Replace with a FLAM benchmark."
    return RecommendResponse(
        recommended_buffer_s=recommended,
        rationale=rationale,
    )

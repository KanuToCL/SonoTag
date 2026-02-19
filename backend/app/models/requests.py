from typing import Optional

from pydantic import BaseModel


class RecommendRequest(BaseModel):
    target_latency_s: Optional[float] = None


class YouTubeAnalysisRequest(BaseModel):
    """Request for YouTube audio analysis."""

    url: str
    prompts: Optional[str] = None  # Semicolon-separated prompts
    chunk_duration_s: float = 10.0  # Duration of each chunk to analyze
    max_duration_s: float = 60.0  # Maximum video duration to analyze


class PrepareVideoRequest(BaseModel):
    """Request to prepare a YouTube video for playback."""

    url: str


class AnalyzeUrlRequest(BaseModel):
    """Request for multi-platform audio analysis."""

    url: str
    prompts: Optional[str] = None
    chunk_duration_s: float = 10.0
    max_duration_s: float = 60.0


class PrepareMediaRequest(BaseModel):
    url: str

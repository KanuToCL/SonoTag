from pydantic import BaseModel


class RecommendResponse(BaseModel):
    recommended_buffer_s: float
    rationale: str


class ClassifyResponse(BaseModel):
    """Response from audio classification."""

    scores: dict[str, float]
    prompts: list[str]
    duration_s: float
    sample_rate: int
    device: str
    timing: dict[str, float] | None = None  # Timing breakdown in milliseconds


class ClassifyLocalResponse(BaseModel):
    """Response from frame-wise audio classification using unbiased local similarity."""

    # Frame-wise scores: dict mapping prompt -> list of scores per frame
    frame_scores: dict[str, list[float]]
    # Smoothed frame-wise scores (after Loudness Relabel postprocessing)
    smoothed_frame_scores: dict[str, list[float]] | None = None
    # Aggregated global scores (max across frames)
    global_scores: dict[str, float]
    prompts: list[str]
    num_frames: int
    frame_duration_s: float  # Duration of each frame in seconds
    duration_s: float
    sample_rate: int
    device: str
    postprocessed: bool = False  # Whether Loudness Relabel was applied
    timing: dict[str, float] | None = None


class PromptsResponse(BaseModel):
    """Available prompts for classification."""

    prompts: list[str]
    count: int


class YouTubeChunkResult(BaseModel):
    """Result for a single chunk of YouTube audio."""

    chunk_index: int
    start_time_s: float
    end_time_s: float
    global_scores: dict[str, float]
    frame_scores: dict[str, list[float]]


class YouTubeAnalysisResponse(BaseModel):
    """Response from YouTube audio analysis."""

    video_title: str
    video_duration_s: float
    analyzed_duration_s: float
    num_chunks: int
    prompts: list[str]
    chunks: list[YouTubeChunkResult]
    aggregated_scores: dict[str, float]  # Mean across all chunks
    timing: dict[str, float]


class AnalyzeUrlChunkResult(BaseModel):
    chunk_index: int
    start_time_s: float
    end_time_s: float
    global_scores: dict[str, float]
    frame_scores: dict[str, list[float]]


class AnalyzeUrlResponse(BaseModel):
    platform: str
    title: str
    duration_s: float
    analyzed_duration_s: float
    num_chunks: int
    prompts: list[str]
    chunks: list[AnalyzeUrlChunkResult]
    aggregated_scores: dict[str, float]
    timing: dict[str, float]


class PrepareVideoResponse(BaseModel):
    """Response after preparing a YouTube video."""

    video_id: str
    title: str
    duration_s: float
    video_url: str  # URL to stream the video
    ready: bool


class PrepareMediaResponse(BaseModel):
    video_id: str
    title: str
    duration_s: float
    video_url: str  # /stream-video/{id} or empty for audio-only
    audio_url: str  # /stream-audio/{id} for audio-only platforms
    thumbnail_url: str  # Album art for SoundCloud
    has_video: bool
    platform: str
    ready: bool

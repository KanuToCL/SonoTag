// =============================================================================
// API Response Types
// =============================================================================

export interface ClassifyResponse {
  scores: Record<string, number>;
  prompts: string[];
  duration_s: number;
  sample_rate: number;
  device: string;
  timing?: {
    read_ms: number;
    decode_ms: number;
    tensor_ms: number;
    audio_embed_ms: number;
    similarity_ms: number;
    total_ms: number;
  };
}

/**
 * Response from frame-wise audio classification using unbiased local similarity.
 * This matches the FLAM paper's Eq. 7 visualization.
 */
export interface ClassifyLocalResponse {
  // Frame-wise scores: dict mapping prompt -> list of scores per frame
  frame_scores: Record<string, number[]>;
  // Aggregated global scores (max across frames)
  global_scores: Record<string, number>;
  prompts: string[];
  num_frames: number;
  frame_duration_s: number; // Duration of each frame in seconds (~0.5s)
  duration_s: number;
  sample_rate: number;
  device: string;
  timing?: {
    read_ms: number;
    decode_ms: number;
    tensor_ms: number;
    local_similarity_ms: number;
    total_ms: number;
  };
}

export interface PromptsResponse {
  prompts: string[];
  count: number;
}

export interface ModelStatusResponse {
  loaded: boolean;
  device: string | null;
  prompts_cached: boolean;
  prompt_count: number;
}

export interface BackendCpuInfo {
  logical_cores?: number;
  physical_cores?: number;
  model?: string;
}

export interface BackendMemoryInfo {
  total_bytes?: number;
}

export interface BackendGpuInfo {
  name?: string;
  memory_bytes?: number;
}

export interface BackendInfo {
  platform?: string;
  python_version?: string;
  cpu?: BackendCpuInfo;
  cpu_count?: number;
  memory?: BackendMemoryInfo;
  gpus?: BackendGpuInfo[];
  env?: {
    FLAM_MODEL_PATH?: string;
  };
}

export interface RecommendResponse {
  recommended_buffer_s: number;
  rationale: string;
}

// =============================================================================
// Frontend State Types
// =============================================================================

export interface CategoryBand {
  label: string;
  start: number;
  end: number;
}

export interface HeatColorStop {
  stop: number;
  color: [number, number, number];
}

export interface Recommendation {
  buffer: number | null;
  rationale: string;
  source: string;
}

export interface BrowserInfo {
  userAgent: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number;
  language: string;
}

export interface FreqRange {
  min: number;
  max: number;
}

export type PermissionState = "unknown" | "granted" | "denied";
export type MonitoringStatus = "idle" | "running" | "stopped";

// =============================================================================
// Classification State
// =============================================================================

export interface ClassificationResult {
  scores: Record<string, number>;
  timestamp: number;
}

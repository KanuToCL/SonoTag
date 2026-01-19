// =============================================================================
// API Response Types
// =============================================================================

export interface ClassifyResponse {
  scores: Record<string, number>;
  prompts: string[];
  duration_s: number;
  sample_rate: number;
  device: string;
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

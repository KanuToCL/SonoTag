// Buffer size for audio capture
export const DEFAULT_BUFFER_SECONDS = 2;
export const VIDEO_BUFFER_SECONDS = 2;
export const MIN_BUFFER_SECONDS = 1;
export const MAX_BUFFER_SECONDS = 10;

// Target sample rate for FLAM
export const TARGET_SAMPLE_RATE = 48000;

// Minimum interval between classification requests (ms)
export const CLASSIFY_INTERVAL_MS = 500;

// Sliding speed control
export const DEFAULT_SLIDE_SPEED = 2;
export const MIN_SLIDE_SPEED = 1;
export const MAX_SLIDE_SPEED = 5;

// Frame skip map: speed → draw every Nth frame
export const FRAME_SKIP_MAP: Record<number, number> = {
  1: 6,
  2: 4,
  3: 2,
  4: 1,
  5: 1,
};

// Maximum prompts to show before collapsing
export const MAX_VISIBLE_PROMPTS = 10;

// Feature flags
export const DEBUG_YT = false;
export const ENABLE_CLASSIC_VIEW = false;

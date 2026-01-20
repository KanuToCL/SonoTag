import type {
  ClassifyResponse,
  ClassifyLocalResponse,
  ModelStatusResponse,
  PromptsResponse,
  YouTubeAnalysisResponse,
  PrepareVideoResponse,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? '' // Same origin in production (Railway all-in-one)
    : 'http://localhost:8000');

/**
 * Check if the FLAM model is loaded and ready
 */
export async function getModelStatus(): Promise<ModelStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/model-status`);
  if (!response.ok) {
    throw new Error(`Failed to get model status: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get the list of prompts used for classification
 */
export async function getPrompts(): Promise<PromptsResponse> {
  const response = await fetch(`${API_BASE_URL}/prompts`);
  if (!response.ok) {
    throw new Error(`Failed to get prompts: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Classify audio using the FLAM model
 * @param audioBlob - Audio file as Blob
 * @param customPrompts - Optional array of custom prompts to use instead of defaults
 */
export async function classifyAudio(
  audioBlob: Blob,
  customPrompts?: string[]
): Promise<ClassifyResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");

  // If custom prompts provided, add as semicolon-separated string
  // Semicolons allow commas within prompts (e.g., "male speech, man speaking")
  if (customPrompts && customPrompts.length > 0) {
    formData.append("prompts", customPrompts.join("; "));
  }

  const response = await fetch(`${API_BASE_URL}/classify`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail || `Classification failed: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Convert Float32Array audio samples to WAV blob
 */
export function audioSamplesToWavBlob(
  samples: Float32Array,
  sampleRate: number
): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Classify audio using FLAM's frame-wise local similarity (Eq. 7 from paper).
 * Returns per-frame detection scores for each prompt, properly calibrated using
 * the learned per-text logit bias.
 *
 * @param audioBlob - Audio file as Blob
 * @param customPrompts - Optional array of custom prompts to use instead of defaults
 * @param method - 'unbiased' (default, uses logit bias correction) or 'approximate'
 */
export async function classifyAudioLocal(
  audioBlob: Blob,
  customPrompts?: string[],
  method: "unbiased" | "approximate" = "unbiased"
): Promise<ClassifyLocalResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");

  // If custom prompts provided, add as semicolon-separated string
  if (customPrompts && customPrompts.length > 0) {
    formData.append("prompts", customPrompts.join("; "));
  }

  formData.append("method", method);

  const response = await fetch(`${API_BASE_URL}/classify-local`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail || `Local classification failed: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Create a resampler for audio context sample rate to target rate
 */
export function resampleAudio(
  samples: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate) {
    return samples;
  }

  const ratio = fromRate / toRate;
  const newLength = Math.round(samples.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
    const t = srcIndex - srcIndexFloor;
    result[i] = samples[srcIndexFloor] * (1 - t) + samples[srcIndexCeil] * t;
  }

  return result;
}

/**
 * Analyze audio from a YouTube video using FLAM.
 * Downloads the audio, splits into chunks, and runs FLAM inference on each chunk.
 *
 * @param url - YouTube video URL
 * @param customPrompts - Optional array of custom prompts to use instead of defaults
 * @param chunkDurationS - Duration of each chunk to analyze (default 10s)
 * @param maxDurationS - Maximum video duration to analyze (default 60s)
 */
export async function analyzeYouTube(
  url: string,
  customPrompts?: string[],
  chunkDurationS: number = 10.0,
  maxDurationS: number = 60.0
): Promise<YouTubeAnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/analyze-youtube`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      prompts: customPrompts ? customPrompts.join("; ") : null,
      chunk_duration_s: chunkDurationS,
      max_duration_s: maxDurationS,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail || `YouTube analysis failed: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Prepare a YouTube video for local playback with FLAM analysis.
 * Downloads the video and returns a local URL for streaming.
 *
 * @param url - YouTube video URL
 */
export async function prepareYouTubeVideo(
  url: string
): Promise<PrepareVideoResponse> {
  const response = await fetch(`${API_BASE_URL}/prepare-youtube-video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail || `Failed to prepare video: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get the streaming URL for a prepared video.
 */
export function getVideoStreamUrl(videoId: string): string {
  return `${API_BASE_URL}/stream-video/${videoId}`;
}

/**
 * Clean up a prepared video to free disk space.
 */
export async function cleanupVideo(videoId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/cleanup-video/${videoId}`, {
    method: "DELETE",
  });
}

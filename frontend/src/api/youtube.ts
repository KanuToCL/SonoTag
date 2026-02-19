import type { YouTubeAnalysisResponse, PrepareVideoResponse } from "../types";
import { API_BASE_URL, DEBUG_API } from "./client";

export async function analyzeYouTube(
  url: string,
  customPrompts?: string[],
  chunkDurationS: number = 10.0,
  maxDurationS: number = 60.0
): Promise<YouTubeAnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/analyze-youtube`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

export async function prepareYouTubeVideo(
  url: string
): Promise<PrepareVideoResponse> {
  if (DEBUG_API) console.log('[api] prepareYouTubeVideo →', url);
  const response = await fetch(`${API_BASE_URL}/prepare-youtube-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (DEBUG_API) console.error('[api] prepareYouTubeVideo FAILED:', response.status, error);
    throw new Error(
      error.detail || `Failed to prepare video: ${response.statusText}`
    );
  }

  return response.json();
}

export function getVideoStreamUrl(videoId: string): string {
  const url = `${API_BASE_URL}/stream-video/${videoId}`;
  if (DEBUG_API) console.log('[api] getVideoStreamUrl:', url);
  return url;
}

export async function cleanupVideo(videoId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/cleanup-video/${videoId}`, {
    method: "DELETE",
  });
}

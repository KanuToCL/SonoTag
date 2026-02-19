import type { AnalyzeUrlResponse, PrepareMediaResponse } from "../types";
import { API_BASE_URL, DEBUG_API } from "./client";

export async function analyzeUrl(
  url: string,
  customPrompts?: string[],
  chunkDurationS: number = 10.0,
  maxDurationS: number = 60.0
): Promise<AnalyzeUrlResponse> {
  const response = await fetch(`${API_BASE_URL}/analyze-url`, {
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
    throw new Error(error.detail || `Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

export async function prepareMedia(
  url: string
): Promise<PrepareMediaResponse> {
  if (DEBUG_API) console.log("[api] prepareMedia →", url);
  const response = await fetch(`${API_BASE_URL}/prepare-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (DEBUG_API) console.error("[api] prepareMedia FAILED:", response.status, error);
    throw new Error(error.detail || `Failed to prepare media: ${response.statusText}`);
  }

  return response.json();
}

export function getAudioStreamUrl(videoId: string): string {
  return `${API_BASE_URL}/stream-audio/${videoId}`;
}

import type { ClassifyResponse, ClassifyLocalResponse } from "../types";
import { API_BASE_URL, DEBUG_API } from "./client";

export async function classifyAudio(
  audioBlob: Blob,
  customPrompts?: string[]
): Promise<ClassifyResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");

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

export async function classifyAudioLocal(
  audioBlob: Blob,
  customPrompts?: string[],
  method: "unbiased" | "approximate" = "unbiased"
): Promise<ClassifyLocalResponse> {
  if (DEBUG_API) console.log('[api] classifyAudioLocal → blob:', audioBlob.size, 'bytes');
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");

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

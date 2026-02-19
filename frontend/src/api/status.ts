import type { ModelStatusResponse, PromptsResponse } from "../types";
import { API_BASE_URL } from "./client";

export async function getModelStatus(): Promise<ModelStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/model-status`);
  if (!response.ok) {
    throw new Error(`Failed to get model status: ${response.statusText}`);
  }
  return response.json();
}

export async function getPrompts(): Promise<PromptsResponse> {
  const response = await fetch(`${API_BASE_URL}/prompts`);
  if (!response.ok) {
    throw new Error(`Failed to get prompts: ${response.statusText}`);
  }
  return response.json();
}

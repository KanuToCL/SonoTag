import { useEffect, useState } from "react";
import type { BackendInfo, BrowserInfo, ModelStatusResponse, Recommendation } from "../types";
import { getModelStatus } from "../api";
import { fallbackRecommendation } from "../utils/math";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseBackendInfoParams {
  browserInfo: BrowserInfo;
  apiBaseUrl: string;
}

export interface UseBackendInfoReturn {
  backendInfo: BackendInfo | null;
  backendError: string;
  recommendation: Recommendation;
  modelStatus: ModelStatusResponse | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBackendInfo({ browserInfo, apiBaseUrl }: UseBackendInfoParams): UseBackendInfoReturn {
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);
  const [backendError, setBackendError] = useState<string>("");
  const [recommendation, setRecommendation] = useState<Recommendation>({
    buffer: null,
    rationale: "",
    source: "",
  });
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadBackendInfo = async (): Promise<void> => {
      try {
        const response = await fetch(`${apiBaseUrl}/system-info`);
        if (!response.ok) {
          throw new Error("Backend not ready");
        }
        const data: BackendInfo = await response.json();
        if (!cancelled) {
          setBackendInfo(data);
        }
      } catch {
        if (!cancelled) {
          setBackendError("Backend unavailable. Using browser-only info.");
        }
      }
    };

    const loadRecommendation = async (): Promise<void> => {
      try {
        const response = await fetch(`${apiBaseUrl}/recommend-buffer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_latency_s: 2.0 }),
        });
        if (!response.ok) {
          throw new Error("Recommendation not available");
        }
        const data = await response.json();
        if (!cancelled) {
          setRecommendation({
            buffer: data.recommended_buffer_s,
            rationale: data.rationale,
            source: "backend",
          });
        }
      } catch {
        if (!cancelled) {
          const fallback = fallbackRecommendation(
            browserInfo.hardwareConcurrency,
            browserInfo.deviceMemory
          );
          setRecommendation({
            buffer: fallback,
            rationale: "Browser heuristic based on core count and memory.",
            source: "browser",
          });
        }
      }
    };

    const loadModelStatus = async (): Promise<void> => {
      try {
        const status = await getModelStatus();
        if (!cancelled) {
          setModelStatus(status);
        }
      } catch {
        if (!cancelled) {
          setModelStatus(null);
        }
      }
    };

    loadBackendInfo();
    loadRecommendation();
    loadModelStatus();

    return () => {
      cancelled = true;
    };
  }, [browserInfo.deviceMemory, browserInfo.hardwareConcurrency, apiBaseUrl]);

  return {
    backendInfo,
    backendError,
    recommendation,
    modelStatus,
  };
}

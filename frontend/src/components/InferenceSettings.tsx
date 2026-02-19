import type { ModelStatusResponse } from "../types";
import {
  MIN_BUFFER_SECONDS,
  MAX_BUFFER_SECONDS,
  MIN_SLIDE_SPEED,
  MAX_SLIDE_SPEED,
} from "../constants/audio";
import { CollapsibleHeader } from "./CollapsibleHeader";

export interface TimingBreakdown {
  read_ms: number;
  decode_ms: number;
  tensor_ms: number;
  audio_embed_ms: number;
  similarity_ms: number;
  total_ms: number;
}

export interface InferenceSettingsProps {
  isCollapsed: boolean;
  onToggle: () => void;
  bufferSeconds: number;
  onSetBufferSeconds: (s: number) => void;
  slideSpeed: number;
  onSetSlideSpeed: (s: number) => void;
  modelStatus: ModelStatusResponse | null;
  lastInferenceTime: number | null;
  inferenceCount: number;
  timingBreakdown: TimingBreakdown | null;
}

export function InferenceSettings({
  isCollapsed,
  onToggle,
  bufferSeconds,
  onSetBufferSeconds,
  slideSpeed,
  onSetSlideSpeed,
  modelStatus,
  lastInferenceTime,
  inferenceCount,
  timingBreakdown,
}: InferenceSettingsProps) {
  return (
    <section className="block">
      <CollapsibleHeader
        title="Inference Settings"
        isCollapsed={isCollapsed}
        onToggle={onToggle}
      />
      {!isCollapsed && (
        <div className="stack" style={{ marginTop: "14px" }}>
          <label className="label" htmlFor="buffer-slider">
            Audio buffer: {bufferSeconds}s
          </label>
          <input
            id="buffer-slider"
            type="range"
            min={MIN_BUFFER_SECONDS}
            max={MAX_BUFFER_SECONDS}
            step={1}
            value={bufferSeconds}
            onChange={(e) => onSetBufferSeconds(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div className="info-line" style={{ fontSize: "0.75rem" }}>
            <span>{MIN_BUFFER_SECONDS}s (faster)</span>
            <span>{MAX_BUFFER_SECONDS}s (more context)</span>
          </div>

          <div className="info-line" style={{ marginTop: "0.5rem" }}>
            <span>Model status</span>
            <span style={{ color: modelStatus?.loaded ? "#5ce3a2" : "#ff6b6b" }}>
              {modelStatus?.loaded ? `ready (${modelStatus.device})` : "loading..."}
            </span>
          </div>

          {lastInferenceTime !== null && (
            <div className="info-line">
              <span>Last inference</span>
              <span>{(lastInferenceTime / 1000).toFixed(2)}s</span>
            </div>
          )}

          <div className="info-line">
            <span>Inferences</span>
            <span>{inferenceCount}</span>
          </div>

          {timingBreakdown && (
            <div style={{
              marginTop: "0.75rem",
              padding: "0.5rem",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "4px",
              fontSize: "0.75rem",
            }}>
              <div className="section-label" style={{ marginBottom: "0.25rem" }}>
                Timing Breakdown (backend)
              </div>
              <div className="info-line">
                <span>Read file</span>
                <span>{timingBreakdown.read_ms.toFixed(1)}ms</span>
              </div>
              <div className="info-line">
                <span>Decode/resample</span>
                <span>{timingBreakdown.decode_ms.toFixed(1)}ms</span>
              </div>
              <div className="info-line">
                <span>To tensor</span>
                <span>{timingBreakdown.tensor_ms.toFixed(1)}ms</span>
              </div>
              <div className="info-line">
                <span style={{ fontWeight: 600 }}>Audio embed (FLAM)</span>
                <span style={{ fontWeight: 600, color: "#ff7a3d" }}>
                  {timingBreakdown.audio_embed_ms.toFixed(1)}ms
                </span>
              </div>
              <div className="info-line">
                <span>Similarity</span>
                <span>{timingBreakdown.similarity_ms.toFixed(1)}ms</span>
              </div>
              <div className="info-line" style={{ borderTop: "1px solid #333", paddingTop: "0.25rem", marginTop: "0.25rem" }}>
                <span style={{ fontWeight: 600 }}>Backend total</span>
                <span style={{ fontWeight: 600 }}>{timingBreakdown.total_ms.toFixed(1)}ms</span>
              </div>
            </div>
          )}

          <p className="muted" style={{ marginTop: "0.5rem" }}>
            Shorter buffer = faster updates but less context for FLAM.
            Restart monitoring to apply buffer changes.
          </p>

          <label className="label" htmlFor="slide-speed-slider" style={{ marginTop: "0.75rem" }}>
            Slide speed: {slideSpeed}px/frame
          </label>
          <input
            id="slide-speed-slider"
            type="range"
            min={MIN_SLIDE_SPEED}
            max={MAX_SLIDE_SPEED}
            step={1}
            value={slideSpeed}
            onChange={(e) => onSetSlideSpeed(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div className="info-line" style={{ fontSize: "0.75rem" }}>
            <span>{MIN_SLIDE_SPEED} (slower/zoomed)</span>
            <span>{MAX_SLIDE_SPEED} (faster/compressed)</span>
          </div>
        </div>
      )}
    </section>
  );
}

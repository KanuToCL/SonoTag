import type { RefObject } from "react";
import type { ColorTheme } from "../types/themes";
import { COLOR_THEMES } from "../types/themes";
import type { FreqRange, ModelStatusResponse } from "../types";
import { MAX_VISIBLE_PROMPTS } from "../constants/audio";
import { formatHz } from "../utils/format";
import { getColorFromStops } from "../utils/color";
import { normalizeScoresMinMax, clampScoresToPositive } from "../utils/math";

export interface ClassicVisualizationProps {
  // Scores
  prompts: string[];
  classificationScores: Record<string, number>;
  normalizeScores: boolean;
  sortByScore: boolean;
  scoresExpanded: boolean;
  onSetScoresExpanded: (expanded: boolean) => void;
  isClassifying: boolean;
  // Freq range
  freqRange: FreqRange;
  nyquist: number;
  freqAxisLabels: string[];
  onHandleFreqMinChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onHandleFreqMaxChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSetFullRange: () => void;
  // Canvas refs
  spectrogramRef: RefObject<HTMLCanvasElement | null>;
  heatmapRef: RefObject<HTMLCanvasElement | null>;
  // Inference
  modelStatus: ModelStatusResponse | null;
  bufferSeconds: number;
  lastInferenceTime: number | null;
  inferenceCount: number;
  // Color theme
  colorTheme: ColorTheme;
}

export function ClassicVisualization({
  prompts,
  classificationScores,
  normalizeScores,
  sortByScore,
  scoresExpanded,
  onSetScoresExpanded,
  isClassifying,
  freqRange,
  nyquist,
  freqAxisLabels,
  onHandleFreqMinChange,
  onHandleFreqMaxChange,
  onSetFullRange,
  spectrogramRef,
  heatmapRef,
  modelStatus,
  bufferSeconds,
  lastInferenceTime,
  inferenceCount,
  colorTheme,
}: ClassicVisualizationProps) {
  return (
    <section className="panel visual">
      <div className="figure">
        <div className="figure-header">
          <span className="figure-title">Audio spectrogram</span>
          <span className="figure-meta">live</span>
        </div>
        <div className="figure-controls">
          <span className="control-label">Display range (Hz)</span>
          <div className="freq-controls">
            <input
              type="number"
              min="0"
              max={Math.round(nyquist)}
              value={Math.round(freqRange.min)}
              onChange={onHandleFreqMinChange}
            />
            <span className="control-sep">to</span>
            <input
              type="number"
              min="0"
              max={Math.round(nyquist)}
              value={Math.round(freqRange.max)}
              onChange={onHandleFreqMaxChange}
            />
            <button type="button" className="ghost" onClick={onSetFullRange}>
              Full
            </button>
          </div>
          <span className="control-hint">
            Nyquist: {formatHz(nyquist, true)}
          </span>
        </div>
        <div className="spectrogram-frame">
          <div className="freq-axis">
            {freqAxisLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <canvas
            ref={spectrogramRef}
            width={960}
            height={280}
            className="plot-canvas"
          />
        </div>
      </div>

      <div className="figure">
        <div className="figure-header">
          <span className="figure-title">FLAM output</span>
          <span className="figure-meta">
            {isClassifying ? "classifying..." : "live scores"}
          </span>
        </div>

        {/* Scrolling heatmap visualization */}
        {(() => {
          const heatmapHeight = Math.max(240, prompts.length * 12);
          return (
            <div className="heatmap-wrap" style={{ height: heatmapHeight }}>
              <canvas
                ref={heatmapRef}
                width={960}
                height={heatmapHeight}
                className="plot-canvas"
              />
              <div className="heatmap-labels" style={{ height: heatmapHeight }}>
                {prompts.map((prompt) => (
                  <span key={prompt}>{prompt}</span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Expand/Collapse button */}
        {prompts.length > MAX_VISIBLE_PROMPTS && (
          <button
            type="button"
            onClick={() => onSetScoresExpanded(!scoresExpanded)}
            style={{
              width: "100%",
              padding: "0.5rem",
              marginTop: "0.5rem",
              marginBottom: "0.5rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid #333",
              borderRadius: "4px",
              color: "#aaa",
              cursor: "pointer",
              fontSize: "0.8rem"
            }}
          >
            {scoresExpanded
              ? `▲ Collapse (showing ${prompts.length} prompts)`
              : `▼ Expand all ${prompts.length} prompts (showing ${MAX_VISIBLE_PROMPTS})`}
          </button>
        )}

        {/* Numerical scores display */}
        <div className="scores-panel" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "0.5rem",
          padding: "0.75rem",
          background: "rgba(0,0,0,0.3)",
          borderRadius: "6px",
          marginBottom: "0.75rem",
          fontSize: "0.8rem",
          maxHeight: scoresExpanded ? "none" : "320px",
          overflowY: scoresExpanded ? "visible" : "auto"
        }}>
          {(() => {
            const displayScores = Object.keys(classificationScores).length > 0
              ? (normalizeScores
                  ? normalizeScoresMinMax(classificationScores)
                  : clampScoresToPositive(classificationScores))
              : null;

            let sortedPrompts = [...prompts];
            if (sortByScore && Object.keys(classificationScores).length > 0) {
              sortedPrompts.sort((a, b) => {
                const scoreA = classificationScores[a] ?? -Infinity;
                const scoreB = classificationScores[b] ?? -Infinity;
                return scoreB - scoreA;
              });
            }
            const visiblePrompts = scoresExpanded
              ? sortedPrompts
              : sortedPrompts.slice(0, MAX_VISIBLE_PROMPTS);

            return visiblePrompts.map((prompt) => {
              const rawScore = classificationScores[prompt];
              const hasScore = rawScore !== undefined;

              let displayIntensity = 0;
              if (hasScore && displayScores) {
                displayIntensity = displayScores[prompt] ?? 0;
              }

              const isTop = hasScore && rawScore === Math.max(...Object.values(classificationScores));

              return (
                <div
                  key={prompt}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    padding: "0.5rem",
                    background: isTop ? "rgba(255, 122, 61, 0.2)" : "rgba(255,255,255,0.05)",
                    borderRadius: "4px",
                    border: isTop ? "1px solid rgba(255, 122, 61, 0.5)" : "1px solid transparent"
                  }}
                >
                  <span style={{
                    color: isTop ? "#ff7a3d" : "#aaa",
                    fontWeight: isTop ? 600 : 400
                  }}>
                    {prompt}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{
                      flex: 1,
                      height: "6px",
                      background: "#1a1a1a",
                      borderRadius: "3px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${displayIntensity * 100}%`,
                        height: "100%",
                        background: getColorFromStops(displayIntensity, COLOR_THEMES[colorTheme].stops),
                        transition: "width 0.3s ease"
                      }} />
                    </div>
                    <span style={{
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      color: hasScore ? "#fff" : "#555",
                      minWidth: "3.5rem",
                      textAlign: "right"
                    }}>
                      {hasScore ? (rawScore > 0 ? "+" : "") + rawScore.toFixed(3) : "---"}
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        <p className="figure-note muted">
          {modelStatus?.loaded
            ? `✅ FLAM ready on ${modelStatus.device}`
            : "⏳ Waiting for FLAM model..."}
          {" | "}Buffer: {bufferSeconds}s
          {lastInferenceTime !== null && ` | Last: ${(lastInferenceTime / 1000).toFixed(2)}s`}
          {inferenceCount > 0 && ` | #${inferenceCount}`}
        </p>
      </div>
    </section>
  );
}

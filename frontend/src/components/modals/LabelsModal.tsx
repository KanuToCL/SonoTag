// =============================================================================
// LabelsModal — extracted from App.tsx
// =============================================================================

import type { MouseEvent as ReactMouseEvent } from "react";
import type { ColorTheme } from "../../types/themes";
import { COLOR_THEMES } from "../../types/themes";
import { normalizeScoresMinMax, clampScoresToPositive } from "../../utils/math";
import { getColorFromStops } from "../../utils/color";

export interface LabelsModalProps {
  show: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  height: number;
  onDragStart: (e: ReactMouseEvent) => void;
  onResizeStart: (e: ReactMouseEvent) => void;
  classificationScores: Record<string, number>;
  normalizeScores: boolean;
  prompts: string[];
  colorTheme: ColorTheme;
}

export function LabelsModal({
  show,
  onClose,
  position,
  height,
  onDragStart,
  onResizeStart,
  classificationScores,
  normalizeScores,
  prompts,
  colorTheme,
}: LabelsModalProps) {
  if (!show) return null;

  return (
    <div
      className="floating-video-modal floating-labels-modal"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: 280,
        height,
        zIndex: 501,
        background: "rgba(15, 20, 30, 0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Drag handle */}
      <div
        className="modal-drag-handle"
        onMouseDown={(e) => {
          onDragStart(e);
        }}
        style={{
          height: "28px",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          cursor: "grab",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            Labels
          </span>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: "14px",
            padding: "2px 4px",
          }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Labels list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}>
        {(() => {
          const displayScores = Object.keys(classificationScores).length > 0
            ? (normalizeScores
                ? normalizeScoresMinMax(classificationScores)
                : clampScoresToPositive(classificationScores))
            : null;

          let sortedPrompts = [...prompts];
          if (Object.keys(classificationScores).length > 0) {
            sortedPrompts.sort((a, b) => {
              const scoreA = classificationScores[a] ?? -Infinity;
              const scoreB = classificationScores[b] ?? -Infinity;
              return scoreB - scoreA;
            });
          }

          return sortedPrompts.map((prompt) => {
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
                  gap: "3px",
                  padding: "6px 8px",
                  background: isTop ? `${getColorFromStops(0.8, COLOR_THEMES[colorTheme].stops)}22` : "rgba(255,255,255,0.03)",
                  borderRadius: "4px",
                  border: isTop ? `1px solid ${getColorFromStops(0.8, COLOR_THEMES[colorTheme].stops)}66` : "1px solid transparent",
                }}
              >
                <span style={{
                  color: isTop ? getColorFromStops(0.9, COLOR_THEMES[colorTheme].stops) : "#aaa",
                  fontWeight: isTop ? 600 : 400,
                  fontSize: "11px",
                }}>
                  {prompt}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    flex: 1,
                    height: "4px",
                    background: "#1a1a1a",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${displayIntensity * 100}%`,
                      height: "100%",
                      background: getColorFromStops(displayIntensity, COLOR_THEMES[colorTheme].stops),
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                  <span style={{
                    fontFamily: "monospace",
                    fontSize: "9px",
                    color: hasScore ? "#fff" : "#555",
                    minWidth: "36px",
                    textAlign: "right",
                  }}>
                    {hasScore ? (rawScore > 0 ? "+" : "") + rawScore.toFixed(2) : "---"}
                  </span>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={(e) => {
          onResizeStart(e);
        }}
        style={{
          height: "8px",
          cursor: "ns-resize",
          background: "rgba(15, 21, 32, 0.9)",
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div style={{
          width: "40px",
          height: "3px",
          borderRadius: "2px",
          background: "rgba(255, 255, 255, 0.2)",
        }} />
      </div>
    </div>
  );
}

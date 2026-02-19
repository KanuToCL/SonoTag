// =============================================================================
// PromptsModal — extracted from App.tsx
// =============================================================================

import type { MouseEvent as ReactMouseEvent } from "react";
import type { InputMode } from "../../types/app";
import {
  DEFAULT_PROMPTS,
  DIALOG_MOVIE_PROMPTS,
  ACTION_MOVIE_PROMPTS,
  SPORTS_PROMPTS,
  MUSIC_DECOMPOSITION_PROMPTS,
  SC_TECHNO_PROMPTS,
  SC_CLASSICAL_PROMPTS,
  SC_ROCK_PROMPTS,
  SC_JAZZ_PROMPTS,
  SC_HIPHOP_PROMPTS,
  SC_INSTRUMENTS_PROMPTS,
  SC_80S_CLASSICS_PROMPTS,
} from "../../constants/prompts";

export interface PromptsModalProps {
  show: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  height: number;
  onDragStart: (e: ReactMouseEvent) => void;
  onResizeStart: (e: ReactMouseEvent) => void;
  promptsModalInput: string;
  setPromptsModalInput: (value: string) => void;
  inputMode: InputMode;
  onApply: (newPrompts: string[], rawInput: string) => void;
  currentPrompts: string[];
}

export function PromptsModal({
  show,
  onClose,
  position,
  height,
  onDragStart,
  onResizeStart,
  promptsModalInput,
  setPromptsModalInput,
  inputMode,
  onApply,
  currentPrompts,
}: PromptsModalProps) {
  if (!show) return null;

  return (
    <div
      className="floating-video-modal floating-labels-modal"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: 320,
        height,
        zIndex: 502,
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
          Prompts
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

      {/* Presets section */}
      <div style={{
        padding: "8px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
      }}>
        <span style={{ fontSize: "9px", color: "var(--muted)", width: "100%", marginBottom: "4px" }}>
          PRESETS
        </span>
        {[
          { name: "Default", prompts: DEFAULT_PROMPTS },
          { name: "Dialog", prompts: DIALOG_MOVIE_PROMPTS },
          { name: "Action", prompts: ACTION_MOVIE_PROMPTS },
          { name: "Sports", prompts: SPORTS_PROMPTS },
          { name: "Music", prompts: MUSIC_DECOMPOSITION_PROMPTS },
        ].map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => {
              setPromptsModalInput(preset.prompts.join("; "));
            }}
            style={{
              padding: "4px 10px",
              fontSize: "10px",
              background: promptsModalInput === preset.prompts.join("; ")
                ? "rgba(255, 122, 61, 0.2)"
                : "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              color: promptsModalInput === preset.prompts.join("; ")
                ? "var(--accent)"
                : "var(--muted)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {preset.name}
          </button>
        ))}
          {inputMode === "soundcloud" && (
            <>
              {[
                { name: "Techno", prompts: SC_TECHNO_PROMPTS },
                { name: "Rock", prompts: SC_ROCK_PROMPTS },
                { name: "Jazz", prompts: SC_JAZZ_PROMPTS },
                { name: "Classical", prompts: SC_CLASSICAL_PROMPTS },
                { name: "Hip-Hop", prompts: SC_HIPHOP_PROMPTS },
                { name: "80s", prompts: SC_80S_CLASSICS_PROMPTS },
                { name: "Instruments", prompts: SC_INSTRUMENTS_PROMPTS },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setPromptsModalInput(preset.prompts.join("; "))}
                  style={{
                    padding: "4px 10px",
                    fontSize: "10px",
                    background: promptsModalInput === preset.prompts.join("; ") ? "rgba(255, 122, 61, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    color: promptsModalInput === preset.prompts.join("; ") ? "var(--accent)" : "var(--muted)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </>
          )}

      </div>

      {/* Prompts textarea */}
      <div style={{
        flex: 1,
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        overflow: "hidden",
      }}>
        <textarea
          value={promptsModalInput}
          onChange={(e) => setPromptsModalInput(e.target.value)}
          placeholder="Enter prompts separated by semicolons..."
          style={{
            flex: 1,
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "4px",
            padding: "8px",
            fontSize: "11px",
            color: "var(--text)",
            resize: "none",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => {
              const newPrompts = promptsModalInput
                .split(";")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
              if (newPrompts.length > 0) {
                onApply(newPrompts, promptsModalInput);
              }
            }}
            style={{
              flex: 1,
              padding: "8px",
              fontSize: "11px",
              fontWeight: 500,
              background: "rgba(255, 122, 61, 0.2)",
              border: "1px solid var(--accent)",
              borderRadius: "4px",
              color: "var(--accent)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setPromptsModalInput(currentPrompts.join("; "));
            }}
            style={{
              padding: "8px 12px",
              fontSize: "11px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              color: "var(--muted)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={(e) => {
          onResizeStart(e);
        }}
        style={{
          height: "8px",
          cursor: "ns-resize",
          background: "transparent",
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

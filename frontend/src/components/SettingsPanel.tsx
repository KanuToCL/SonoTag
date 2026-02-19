import type { ChangeEvent } from "react";
import type { ColorTheme } from "../types/themes";
import { COLOR_THEMES } from "../types/themes";
import {
  MIN_BUFFER_SECONDS,
  MAX_BUFFER_SECONDS,
  MIN_SLIDE_SPEED,
  MAX_SLIDE_SPEED,
} from "../constants/audio";
import { getColorFromStops } from "../utils/color";
import { formatBytes, formatHz } from "../utils/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimingBreakdown {
  read_ms: number;
  decode_ms: number;
  tensor_ms: number;
  audio_embed_ms: number;
  similarity_ms: number;
  total_ms: number;
}

export interface SettingsPanelProps {
  // Open / close
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  // Sound categories / prompts
  prompts: string[];
  setPrompts: (prompts: string[]) => void;
  promptInput: string;
  setPromptInput: (value: string) => void;
  setClassificationScores: (scores: Record<string, number>) => void;

  // Detection mode
  normalizeScores: boolean;
  setNormalizeScores: (value: boolean) => void;
  sortByScore: boolean;
  setSortByScore: (value: boolean) => void;

  // Color theme
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;

  // Inference
  bufferSeconds: number;
  setBufferSeconds: (value: number) => void;
  slideSpeed: number;
  setSlideSpeed: (value: number) => void;

  // Frequency range
  freqMin: number;
  freqMax: number;
  handleFreqMinChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleFreqMaxChange: (event: ChangeEvent<HTMLInputElement>) => void;
  setFullRange: () => void;
  nyquist: number;

  // Timing
  timingBreakdown: TimingBreakdown | null;

  // System info
  sampleRate: number | null;
  hostCpuModel: string | null;
  hostCpuLogical: number | null;
  hostMemoryBytes: number | null;
  hostPlatform: string | null;
  browserPlatform: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsPanel({
  settingsOpen,
  setSettingsOpen,
  prompts,
  setPrompts,
  promptInput,
  setPromptInput,
  setClassificationScores,
  normalizeScores,
  setNormalizeScores,
  sortByScore,
  setSortByScore,
  colorTheme,
  setColorTheme,
  bufferSeconds,
  setBufferSeconds,
  slideSpeed,
  setSlideSpeed,
  freqMin,
  freqMax,
  handleFreqMinChange,
  handleFreqMaxChange,
  setFullRange,
  nyquist,
  timingBreakdown,
  sampleRate,
  hostCpuModel,
  hostCpuLogical,
  hostMemoryBytes,
  hostPlatform,
  browserPlatform,
}: SettingsPanelProps) {
  return (
    <div
      className={`settings-overlay ${settingsOpen ? "open" : ""}`}
      onClick={() => setSettingsOpen(false)}
    >
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button
            type="button"
            className="settings-close"
            onClick={() => setSettingsOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="settings-content">
          {/* Sound Categories */}
          <div className="settings-section">
            <h3>Sound Categories</h3>
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="speech; music; gunshot; ..."
            />
            <button
              type="button"
              onClick={() => {
                const parsed = promptInput
                  .split(";")
                  .map((p) => p.trim())
                  .filter((p) => p.length > 0);
                const seen = new Set<string>();
                const uniquePrompts: string[] = [];
                for (const prompt of parsed) {
                  const lowerPrompt = prompt.toLowerCase();
                  if (!seen.has(lowerPrompt)) {
                    seen.add(lowerPrompt);
                    uniquePrompts.push(prompt);
                  }
                }
                if (uniquePrompts.length > 0) {
                  setPrompts(uniquePrompts);
                  setPromptInput(uniquePrompts.join("; "));
                  setClassificationScores({});
                }
              }}
            >
              Update Prompts
            </button>
            <p
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                margin: 0,
              }}
            >
              {prompts.length} active • Use semicolons to separate
            </p>
          </div>

          {/* Detection Mode */}
          <div className="settings-section">
            <h3>Detection Mode</h3>
            <div className="settings-row">
              <label>Relative mode (min-max)</label>
              <input
                type="checkbox"
                checked={normalizeScores}
                onChange={(e) => setNormalizeScores(e.target.checked)}
              />
            </div>
            <div className="settings-row">
              <label>Sort by score</label>
              <input
                type="checkbox"
                checked={sortByScore}
                onChange={(e) => setSortByScore(e.target.checked)}
              />
            </div>
          </div>

          {/* Color Theme */}
          <div className="settings-section">
            <h3>Color Theme</h3>
            <div className="theme-selector">
              {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  className={`theme-option ${colorTheme === theme ? "active" : ""}`}
                  onClick={() => setColorTheme(theme)}
                  style={{
                    background:
                      colorTheme === theme
                        ? `linear-gradient(135deg, ${getColorFromStops(0.3, COLOR_THEMES[theme].stops)}, ${getColorFromStops(0.7, COLOR_THEMES[theme].stops)})`
                        : "rgba(15, 21, 32, 0.8)",
                  }}
                >
                  {COLOR_THEMES[theme].name}
                </button>
              ))}
            </div>
          </div>

          {/* Inference Settings */}
          <div className="settings-section">
            <h3>Inference</h3>
            <div className="settings-row">
              <label>Buffer duration</label>
              <input
                type="range"
                min={MIN_BUFFER_SECONDS}
                max={MAX_BUFFER_SECONDS}
                value={bufferSeconds}
                onChange={(e) => setBufferSeconds(Number(e.target.value))}
              />
              <span className="value">{bufferSeconds}s</span>
            </div>
            <div className="settings-row">
              <label>Slide speed</label>
              <input
                type="range"
                min={MIN_SLIDE_SPEED}
                max={MAX_SLIDE_SPEED}
                value={slideSpeed}
                onChange={(e) => setSlideSpeed(Number(e.target.value))}
              />
              <span className="value">{slideSpeed}</span>
            </div>
          </div>

          {/* Frequency Range */}
          <div className="settings-section">
            <h3>Frequency Range</h3>
            <div className="settings-row">
              <label>Min Hz</label>
              <input
                type="number"
                value={freqMin}
                onChange={handleFreqMinChange}
                style={{ width: "80px", padding: "6px 8px", fontSize: "12px" }}
              />
            </div>
            <div className="settings-row">
              <label>Max Hz</label>
              <input
                type="number"
                value={freqMax}
                onChange={handleFreqMaxChange}
                style={{ width: "80px", padding: "6px 8px", fontSize: "12px" }}
              />
            </div>
            <button
              type="button"
              className="ghost"
              onClick={setFullRange}
              style={{ fontSize: "12px" }}
            >
              Full Range ({formatHz(nyquist, true)})
            </button>
          </div>

          {/* Timing */}
          {timingBreakdown && (
            <div className="settings-section">
              <h3>Last Inference Timing</h3>
              <div className="timing-grid">
                <span className="timing-label">Read</span>
                <span className="timing-value">
                  {timingBreakdown.read_ms.toFixed(1)}ms
                </span>
                <span className="timing-label">Decode</span>
                <span className="timing-value">
                  {timingBreakdown.decode_ms.toFixed(1)}ms
                </span>
                <span className="timing-label">FLAM</span>
                <span className="timing-value highlight">
                  {timingBreakdown.audio_embed_ms.toFixed(1)}ms
                </span>
                <span className="timing-label">Total</span>
                <span className="timing-value">
                  {timingBreakdown.total_ms.toFixed(1)}ms
                </span>
              </div>
            </div>
          )}

          {/* System Info */}
          <div className="settings-section">
            <h3>System</h3>
            <div className="system-info-grid">
              <span>CPU</span>
              <span>{hostCpuModel || `${hostCpuLogical} threads`}</span>
              <span>Memory</span>
              <span>{formatBytes(hostMemoryBytes)}</span>
              <span>Platform</span>
              <span>{hostPlatform || browserPlatform}</span>
              <span>Sample Rate</span>
              <span>{sampleRate ? `${sampleRate} Hz` : "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

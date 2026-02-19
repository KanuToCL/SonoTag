import type { InputMode, MonitoringStatus } from "../types/app";
import type { ModelStatusResponse, PrepareVideoResponse, PrepareMediaResponse } from "../types";
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
} from "../constants/prompts";
import {
  MIN_BUFFER_SECONDS,
  MAX_BUFFER_SECONDS,
  ENABLE_CLASSIC_VIEW,
} from "../constants/audio";

export interface ImmersiveFooterProps {
  inputMode: InputMode;
  status: MonitoringStatus;
  // YouTube state
  youtubeUrl: string;
  youtubeVideo: PrepareVideoResponse | null;
  youtubeAnalyzing: boolean;
  youtubePreparing: boolean;
  youtubeError: string;
  onSetYoutubeUrl: (url: string) => void;
  onPrepareYoutube: () => void;
  // SoundCloud state
  soundcloudUrl: string;
  soundcloudMedia: PrepareMediaResponse | null;
  soundcloudAnalyzing: boolean;
  soundcloudPreparing: boolean;
  soundcloudError: string;
  onSetSoundcloudUrl: (url: string) => void;
  onPrepareSoundcloud: () => void;
  // Microphone
  levelPercent: number;
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
  // Webcam
  webcamActive: boolean;
  onToggleWebcam: () => void;
  // Prompts / Presets
  prompts: string[];
  musicDecomposition: boolean;
  onSetPrompts: (prompts: string[]) => void;
  onSetPromptInput: (input: string) => void;
  onSetClassificationScores: (scores: Record<string, number>) => void;
  onSetMusicDecomposition: (enabled: boolean) => void;
  // Buffer
  bufferSeconds: number;
  onSetBufferSeconds: (seconds: number) => void;
  // Model status / inference
  modelStatus: ModelStatusResponse | null;
  inferenceCount: number;
  lastInferenceTime: number | null;
  // Layout
  onSetLayoutMode: (mode: "immersive" | "classic") => void;
}

export function ImmersiveFooter({
  inputMode,
  status,
  youtubeUrl,
  youtubeVideo,
  youtubeAnalyzing,
  youtubePreparing,
  youtubeError,
  onSetYoutubeUrl,
  onPrepareYoutube,
  soundcloudUrl,
  soundcloudMedia,
  soundcloudAnalyzing,
  soundcloudPreparing,
  soundcloudError,
  onSetSoundcloudUrl,
  onPrepareSoundcloud,
  levelPercent,
  onStartMonitoring,
  onStopMonitoring,
  webcamActive,
  onToggleWebcam,
  prompts,
  musicDecomposition,
  onSetPrompts,
  onSetPromptInput,
  onSetClassificationScores,
  onSetMusicDecomposition,
  bufferSeconds,
  onSetBufferSeconds,
  modelStatus,
  inferenceCount,
  lastInferenceTime,
  onSetLayoutMode,
}: ImmersiveFooterProps) {
  return (
    <footer className="immersive-footer">
      {/* Video Player / Mic Status */}
      <div className="footer-section">
        {inputMode === "youtube" && youtubeVideo ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Video playing</span>
            {youtubeAnalyzing && (
              <span style={{ fontSize: "11px", color: "var(--success)" }}>● Analyzing</span>
            )}
          </div>
        ) : inputMode === "soundcloud" && soundcloudMedia ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>{soundcloudMedia.title}</span>
            {soundcloudAnalyzing && (
              <span style={{ fontSize: "11px", color: "var(--success)" }}>● Analyzing</span>
            )}
          </div>
        ) : inputMode === "soundcloud" ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
            <input
              type="text"
              value={soundcloudUrl}
              onChange={(e) => onSetSoundcloudUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && soundcloudUrl.trim() && !soundcloudPreparing) {
                  onPrepareSoundcloud();
                }
              }}
              placeholder="Paste SoundCloud URL and press Enter..."
              style={{
                flex: 1,
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                padding: "7px 12px",
                fontSize: "12px",
                color: "var(--text)",
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              type="button"
              disabled={soundcloudPreparing || !soundcloudUrl.trim()}
              onClick={() => {
                if (!soundcloudUrl.trim() || soundcloudPreparing) return;
                onPrepareSoundcloud();
              }}
              style={{
                background: "var(--accent)",
                border: "none",
                borderRadius: "6px",
                padding: "7px 16px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#000",
                cursor: soundcloudPreparing || !soundcloudUrl.trim() ? "default" : "pointer",
                opacity: soundcloudPreparing || !soundcloudUrl.trim() ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {soundcloudPreparing ? "Loading..." : "Load"}
            </button>
            {soundcloudError && (
              <span style={{ fontSize: "11px", color: "#f04040", whiteSpace: "nowrap" }}>{soundcloudError}</span>
            )}
          </div>
        ) : inputMode === "youtube" ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => onSetYoutubeUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && youtubeUrl.trim() && !youtubePreparing) {
                  onPrepareYoutube();
                }
              }}
              placeholder="Paste YouTube URL and press Enter..."
              style={{
                flex: 1,
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "6px",
                padding: "7px 12px",
                fontSize: "12px",
                color: "var(--text)",
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              type="button"
              disabled={youtubePreparing || !youtubeUrl.trim()}
              onClick={() => {
                if (!youtubeUrl.trim() || youtubePreparing) return;
                onPrepareYoutube();
              }}
              style={{
                background: "var(--accent)",
                border: "none",
                borderRadius: "6px",
                padding: "7px 16px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#000",
                cursor: youtubePreparing || !youtubeUrl.trim() ? "default" : "pointer",
                opacity: youtubePreparing || !youtubeUrl.trim() ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {youtubePreparing ? "Loading..." : "Load"}
            </button>
            {youtubeError && (
              <span style={{ fontSize: "11px", color: "#f04040", whiteSpace: "nowrap" }}>{youtubeError}</span>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Microphone</span>
            {status === "running" ? (
              <button type="button" className="ghost" onClick={onStopMonitoring} style={{ padding: "6px 12px", fontSize: "12px" }}>
                Stop
              </button>
            ) : (
              <button type="button" onClick={onStartMonitoring} style={{ padding: "6px 12px", fontSize: "12px" }}>
                Start
              </button>
            )}
            <div style={{ width: "60px", height: "6px", background: "rgba(10,16,24,0.8)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${levelPercent}%`, height: "100%", background: "linear-gradient(90deg, #ff7a3d, #2ad1ff)" }} />
            </div>
            <button
              type="button"
              onClick={onToggleWebcam}
              className="ghost"
              style={{
                padding: "6px 12px",
                fontSize: "12px",
              }}
            >
              {webcamActive ? "Stop Camera" : "Camera"}
            </button>
          </div>
        )}
      </div>

      <div className="footer-divider" />

      {/* Preset Buttons — swap based on input mode */}
      <div className="footer-section">
        {inputMode === "soundcloud" ? (
          <>
            <button
              type="button"
              className={`preset-btn ${prompts === SC_TECHNO_PROMPTS ? "active" : ""}`}
              onClick={() => {
                onSetPrompts(SC_TECHNO_PROMPTS);
                onSetPromptInput(SC_TECHNO_PROMPTS.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(false);
              }}
            >
              Techno
            </button>
            <button
              type="button"
              className={`preset-btn ${prompts === SC_ROCK_PROMPTS ? "active" : ""}`}
              onClick={() => {
                onSetPrompts(SC_ROCK_PROMPTS);
                onSetPromptInput(SC_ROCK_PROMPTS.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(false);
              }}
            >
              Rock
            </button>
            <button
              type="button"
              className={`preset-btn ${prompts === SC_JAZZ_PROMPTS ? "active" : ""}`}
              onClick={() => {
                onSetPrompts(SC_JAZZ_PROMPTS);
                onSetPromptInput(SC_JAZZ_PROMPTS.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(false);
              }}
            >
              Jazz
            </button>
            <button
              type="button"
              className={`preset-btn ${prompts === SC_CLASSICAL_PROMPTS ? "active" : ""}`}
              onClick={() => {
                onSetPrompts(SC_CLASSICAL_PROMPTS);
                onSetPromptInput(SC_CLASSICAL_PROMPTS.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(false);
              }}
            >
              Classical
            </button>
            <button
              type="button"
              className={`preset-btn ${prompts === SC_HIPHOP_PROMPTS ? "active" : ""}`}
              onClick={() => {
                onSetPrompts(SC_HIPHOP_PROMPTS);
                onSetPromptInput(SC_HIPHOP_PROMPTS.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(false);
              }}
            >
              Hip-Hop
            </button>
            <button
              type="button"
              className={`preset-btn ${prompts === SC_80S_CLASSICS_PROMPTS ? "active" : ""}`}
              onClick={() => {
                onSetPrompts(SC_80S_CLASSICS_PROMPTS);
                onSetPromptInput(SC_80S_CLASSICS_PROMPTS.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(false);
              }}
            >
              80s
            </button>
            <button
              type="button"
              className={`preset-btn ${prompts === SC_INSTRUMENTS_PROMPTS ? "active" : ""}`}
              onClick={() => {
                onSetPrompts(SC_INSTRUMENTS_PROMPTS);
                onSetPromptInput(SC_INSTRUMENTS_PROMPTS.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(true);
              }}
            >
              Instruments
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`preset-btn ${prompts === DIALOG_MOVIE_PROMPTS ? "active" : ""}`}
              onClick={() => {
                onSetPrompts(DIALOG_MOVIE_PROMPTS);
                onSetPromptInput(DIALOG_MOVIE_PROMPTS.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(false);
              }}
            >
              Dialog
            </button>
            <button
              type="button"
              className={`preset-btn ${prompts === ACTION_MOVIE_PROMPTS ? "active" : ""}`}
              onClick={() => {
                onSetPrompts(ACTION_MOVIE_PROMPTS);
                onSetPromptInput(ACTION_MOVIE_PROMPTS.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(false);
              }}
            >
              Action
            </button>
            <button
              type="button"
              className={`preset-btn ${prompts === SPORTS_PROMPTS ? "active" : ""}`}
              onClick={() => {
                onSetPrompts(SPORTS_PROMPTS);
                onSetPromptInput(SPORTS_PROMPTS.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(false);
              }}
            >
              Sports
            </button>
            <button
              type="button"
              className={`preset-btn ${musicDecomposition ? "active" : ""}`}
              onClick={() => {
                onSetPrompts(MUSIC_DECOMPOSITION_PROMPTS);
                onSetPromptInput(MUSIC_DECOMPOSITION_PROMPTS.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(true);
              }}
            >
              Music
            </button>
          </>
        )}
      </div>

      <div className="footer-divider" />

      {/* Buffer Control */}
      <div className="footer-section">
        <div className="compact-control">
          <label>Buffer</label>
          <input
            type="range"
            min={MIN_BUFFER_SECONDS}
            max={MAX_BUFFER_SECONDS}
            value={bufferSeconds}
            onChange={(e) => onSetBufferSeconds(Number(e.target.value))}
          />
          <span className="value">{bufferSeconds}s</span>
        </div>
      </div>

      <div className="footer-section grow" />

      {/* Model Status */}
      <div className="footer-section">
        <div className={`model-badge ${modelStatus?.loaded ? "ready" : ""}`}>
          <span className="badge-dot" />
          <span>{modelStatus?.loaded ? `FLAM (${modelStatus.device})` : "Loading..."}</span>
        </div>
        {inferenceCount > 0 && (
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            #{inferenceCount} | {lastInferenceTime ? `${(lastInferenceTime / 1000).toFixed(1)}s` : "—"}
          </span>
        )}
      </div>

      {/* Layout Toggle */}
      {ENABLE_CLASSIC_VIEW && (
        <div className="footer-section">
          <button
            type="button"
            className="preset-btn"
            onClick={() => onSetLayoutMode("classic")}
            title="Switch to Classic layout"
          >
            Classic View
          </button>
        </div>
      )}
    </footer>
  );
}

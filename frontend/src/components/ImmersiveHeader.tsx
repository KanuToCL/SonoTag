import type { InputMode, MonitoringStatus } from "../types/app";

export interface ImmersiveHeaderProps {
  inputMode: InputMode;
  status: MonitoringStatus;
  youtubeAnalyzing: boolean;
  vimeoAnalyzing: boolean;
  soundcloudAnalyzing: boolean;
  settingsOpen: boolean;
  showAboutModal: boolean;
  onSetInputMode: (mode: InputMode) => void;
  onSetSettingsOpen: (open: boolean) => void;
  onSetShowAboutModal: (show: boolean) => void;
  onClearAll: () => void;
  onStopMonitoring: () => void;
  onStopYoutubeAnalyzing: () => void;
  onStopVimeoAnalyzing: () => void;
  onStopSoundcloudAnalyzing: () => void;
  onSetBufferSeconds: (seconds: number) => void;
  defaultBufferSeconds: number;
  videoBufferSeconds: number;
}

export function ImmersiveHeader({
  inputMode,
  status,
  youtubeAnalyzing,
  vimeoAnalyzing,
  soundcloudAnalyzing,
  onSetInputMode,
  onSetSettingsOpen,
  onSetShowAboutModal,
  onClearAll,
  onStopMonitoring,
  onStopYoutubeAnalyzing,
  onStopVimeoAnalyzing,
  onStopSoundcloudAnalyzing,
  onSetBufferSeconds,
  defaultBufferSeconds,
  videoBufferSeconds,
}: ImmersiveHeaderProps) {
  return (
    <header className="immersive-header">
      <div className="logo">
        <span>SonoTag</span>
      </div>

      <div className="controls-row">
        {/* Mode Tabs */}
        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab ${inputMode === "youtube" ? "active" : ""}`}
            onClick={() => {
              onSetInputMode("youtube");
              onSetBufferSeconds(videoBufferSeconds);
              if (status === "running") onStopMonitoring();
              onStopSoundcloudAnalyzing();
            }}
          >
            YouTube
          </button>
          <button
            type="button"
            className={`mode-tab ${inputMode === "vimeo" ? "active" : ""}`}
            onClick={() => {
              onSetInputMode("vimeo");
              onSetBufferSeconds(videoBufferSeconds);
              if (status === "running") onStopMonitoring();
              onStopYoutubeAnalyzing();
              onStopSoundcloudAnalyzing();
            }}
          >
            Vimeo
          </button>
          <button
            type="button"
            className={`mode-tab ${inputMode === "soundcloud" ? "active" : ""}`}
            onClick={() => {
              onSetInputMode("soundcloud");
              onSetBufferSeconds(videoBufferSeconds);
              if (status === "running") onStopMonitoring();
              onStopYoutubeAnalyzing();
              onStopVimeoAnalyzing();
            }}
          >
            SoundCloud
          </button>
          <button
            type="button"
            className={`mode-tab ${inputMode === "microphone" ? "active" : ""}`}
            onClick={() => {
              onSetInputMode("microphone");
              onSetBufferSeconds(defaultBufferSeconds);
              onStopYoutubeAnalyzing();
              onStopVimeoAnalyzing();
              onStopSoundcloudAnalyzing();
            }}
          >
            Microphone
          </button>
        </div>

        {/* Settings Button */}
        <button
          type="button"
          className="settings-btn"
          onClick={() => onSetSettingsOpen(true)}
          title="Settings"
        >
          ⚙️
        </button>

        {/* About Button */}
        <button
          type="button"
          className="settings-btn"
          onClick={() => onSetShowAboutModal(true)}
          title="About SonoTag"
        >
          ℹ️
        </button>

        {/* Clear Button */}
        <button
          type="button"
          className="settings-btn"
          onClick={onClearAll}
          title="Clear scores, spectrogram, and stats"
          style={{ fontSize: "11px", width: "auto", padding: "0 10px" }}
        >
          Clear
        </button>

        {/* Status */}
        <div className="status-indicator">
          <span className={`status-dot ${(youtubeAnalyzing || vimeoAnalyzing || soundcloudAnalyzing || status === "running") ? "active" : ""}`} />
            <span>{youtubeAnalyzing || vimeoAnalyzing || soundcloudAnalyzing ? "Analyzing" : status === "running" ? "Recording" : "Idle"}</span>
        </div>
      </div>
    </header>
  );
}

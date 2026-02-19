// =============================================================================
// VideoModal — extracted from App.tsx
// Handles YouTube, Vimeo video player and SoundCloud audio player modals.
// =============================================================================

import type { RefObject, MouseEvent as ReactMouseEvent } from "react";
import type { PrepareVideoResponse, PrepareMediaResponse } from "../../types";
import { getVideoStreamUrl, getAudioStreamUrl } from "../../api";
import { DEBUG_YT } from "../../constants/audio";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface VideoModalProps {
  // Visibility
  showVideoModal: boolean;

  // Draggable state
  position: { x: number; y: number };
  size: { width: number; height: number };
  onDragStart: (e: ReactMouseEvent) => void;
  onResizeStart: (e: ReactMouseEvent) => void;

  // YouTube
  youtubeVideo: PrepareVideoResponse | null;
  youtubeAnalyzing: boolean;
  showVideoModalSearch: boolean;
  videoModalSearchUrl: string;
  youtubePreparing: boolean;
  onToggleLabels: () => void;
  showLabelsModal: boolean;
  onToggleVideoSearch: () => void;
  onVideoSearchUrlChange: (url: string) => void;
  onCloseYoutubeVideo: () => void;
  onLoadYoutubeVideo: (url: string) => Promise<void>;

  // YouTube video element refs/callbacks
  videoRef: RefObject<HTMLVideoElement | null>;
  onVideoPlay: () => void;
  onVideoPause: () => void;
  onVideoEnded: () => void;
  onVideoError: (e: React.SyntheticEvent<HTMLVideoElement>) => void;

  // Vimeo
  vimeoMedia: PrepareMediaResponse | null;
  vimeoAnalyzing: boolean;
  vimeoVideoRef: RefObject<HTMLVideoElement | null>;
  onVimeoPlay: () => void;
  onVimeoPause: () => void;
  onVimeoEnded: () => void;
  onVimeoError: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onCloseVimeo: () => void;

  // SoundCloud
  soundcloudMedia: PrepareMediaResponse | null;
  soundcloudAnalyzing: boolean;
  showScModalSearch: boolean;
  scModalSearchUrl: string;
  soundcloudPreparing: boolean;
  onToggleScSearch: () => void;
  onScSearchUrlChange: (url: string) => void;
  onCloseSoundcloud: () => void;
  onLoadSoundcloudTrack: (url: string) => Promise<void>;
  onClearScores: () => void;

  // SoundCloud audio player
  soundcloudAudioRef: RefObject<HTMLAudioElement | null>;
  onScPlay: () => void;
  onScPause: () => void;
  onScEnded: () => void;
  onScTimeUpdate: () => void;
  onScLoadedMetadata: () => void;
  onScError: () => void;

  // Custom SC player controls
  scIsPlaying: boolean;
  scCurrentTime: number;
  scDuration: number;
  scVolume: number;
  scIsSeeking: boolean;
  onScPlayPause: () => void;
  onScSeek: (time: number) => void;
  onScSeekStart: () => void;
  onScSeekEnd: (time: number) => void;
  onScVolumeToggle: () => void;
  onScVolumeChange: (vol: number) => void;

  // Mode
  inputMode: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VideoModal({
  showVideoModal,
  position,
  size,
  onDragStart,
  onResizeStart,
  youtubeVideo,
  youtubeAnalyzing,
  showVideoModalSearch,
  videoModalSearchUrl,
  youtubePreparing,
  onToggleLabels,
  showLabelsModal,
  onToggleVideoSearch,
  onVideoSearchUrlChange,
  onCloseYoutubeVideo,
  onLoadYoutubeVideo,
  videoRef,
  onVideoPlay,
  onVideoPause,
  onVideoEnded,
  onVideoError,
  vimeoMedia,
  vimeoAnalyzing,
  vimeoVideoRef,
  onVimeoPlay,
  onVimeoPause,
  onVimeoEnded,
  onVimeoError,
  onCloseVimeo,
  soundcloudMedia,
  soundcloudAnalyzing,
  showScModalSearch,
  scModalSearchUrl,
  soundcloudPreparing,
  onToggleScSearch,
  onScSearchUrlChange,
  onCloseSoundcloud,
  onLoadSoundcloudTrack,
  onClearScores,
  soundcloudAudioRef,
  onScPlay,
  onScPause,
  onScEnded,
  onScTimeUpdate,
  onScLoadedMetadata,
  onScError,
  scIsPlaying,
  scCurrentTime,
  scDuration,
  scVolume,
  scIsSeeking,
  onScPlayPause,
  onScSeek,
  onScSeekStart,
  onScSeekEnd,
  onScVolumeToggle,
  onScVolumeChange,
  inputMode,
}: VideoModalProps) {
  // ── YouTube Video Modal ──────────────────────────────────────────────────
  if (inputMode === "youtube" && youtubeVideo) {
    return (
      <div
        className="floating-video-modal"
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          zIndex: 500,
          background: "rgba(15, 20, 30, 0.55)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          visibility: showVideoModal ? "visible" : "hidden",
          opacity: showVideoModal ? 1 : 0,
          transition: "opacity 0.2s ease, visibility 0.2s ease",
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
          <span style={{ fontSize: "11px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {youtubeVideo.title}
          </span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "8px" }}>
            {youtubeAnalyzing && (
              <span style={{ fontSize: "9px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", animation: "pulse 2s ease infinite" }} />
                Live
              </span>
            )}
            <button
              type="button"
              onClick={onToggleLabels}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                background: showLabelsModal ? "rgba(255, 255, 255, 0.1)" : "transparent",
                border: "none",
                color: showLabelsModal ? "var(--text)" : "var(--muted)",
                cursor: "pointer",
                fontSize: "12px",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
              title="Toggle labels panel"
            >
              Labels
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onToggleVideoSearch}
              style={{
                background: showVideoModalSearch ? "rgba(255, 255, 255, 0.1)" : "transparent",
                border: "none",
                color: showVideoModalSearch ? "var(--text)" : "var(--muted)",
                cursor: "pointer",
                fontSize: "14px",
                padding: "2px 4px",
                display: "flex",
                alignItems: "center",
              }}
              title="Search new video"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onCloseYoutubeVideo}
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
        </div>

        {/* Inline search input */}
        {showVideoModalSearch && (
          <div
            style={{
              padding: "8px 10px",
              background: "rgba(15, 21, 32, 0.95)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={videoModalSearchUrl}
              onChange={(e) => onVideoSearchUrlChange(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && videoModalSearchUrl.trim()) {
                  await onLoadYoutubeVideo(videoModalSearchUrl);
                }
              }}
              placeholder="Paste YouTube URL..."
              style={{
                flex: 1,
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "4px",
                padding: "6px 10px",
                fontSize: "12px",
                color: "var(--text)",
                outline: "none",
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={async () => {
                if (!videoModalSearchUrl.trim()) return;
                await onLoadYoutubeVideo(videoModalSearchUrl);
              }}
              disabled={youtubePreparing || !videoModalSearchUrl.trim()}
              style={{
                background: "var(--accent)",
                border: "none",
                borderRadius: "4px",
                padding: "6px 12px",
                fontSize: "11px",
                color: "#000",
                cursor: "pointer",
                opacity: youtubePreparing || !videoModalSearchUrl.trim() ? 0.5 : 1,
              }}
            >
              {youtubePreparing ? "..." : "Load"}
            </button>
          </div>
        )}

        {/* Video element */}
        <video
          ref={videoRef}
          src={getVideoStreamUrl(youtubeVideo.video_id)}
          controls
          crossOrigin="anonymous"
          style={{
            width: "100%",
            flex: 1,
            background: "#000",
            display: "block",
            minHeight: 0,
          }}
          onPlay={onVideoPlay}
          onPause={onVideoPause}
          onEnded={onVideoEnded}
          onError={onVideoError}
        />

        {/* Resize handle */}
        <div
          onMouseDown={(e) => {
            onResizeStart(e);
          }}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "16px",
            height: "16px",
            cursor: "nwse-resize",
            background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%)",
          }}
        />
      </div>
    );
  }

  // ── Vimeo Video Modal ─────────────────────────────────────────────────
  if (inputMode === "vimeo" && vimeoMedia) {
    return (
      <div
        className="floating-video-modal"
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          zIndex: 500,
          background: "rgba(15, 20, 30, 0.55)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          visibility: showVideoModal ? "visible" : "hidden",
          opacity: showVideoModal ? 1 : 0,
          transition: "opacity 0.2s ease, visibility 0.2s ease",
          borderRadius: "8px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="modal-drag-handle"
          onMouseDown={(e) => { onDragStart(e); }}
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
          <span style={{ fontSize: "11px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {vimeoMedia.title}
          </span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "8px" }}>
            {vimeoAnalyzing && (
              <span style={{ fontSize: "9px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", animation: "pulse 2s ease infinite" }} />
                Live
              </span>
            )}
            <button
              type="button"
              onClick={onToggleLabels}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                background: showLabelsModal ? "rgba(255, 255, 255, 0.1)" : "transparent",
                border: "none",
                color: showLabelsModal ? "var(--text)" : "var(--muted)",
                cursor: "pointer",
                fontSize: "12px",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
              title="Toggle labels panel"
            >
              Labels
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onCloseVimeo}
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
        </div>

        <video
          ref={vimeoVideoRef}
          src={getVideoStreamUrl(vimeoMedia.video_id)}
          controls
          crossOrigin="anonymous"
          style={{
            width: "100%",
            flex: 1,
            background: "#000",
            display: "block",
            minHeight: 0,
          }}
          onPlay={onVimeoPlay}
          onPause={onVimeoPause}
          onEnded={onVimeoEnded}
          onError={onVimeoError}
        />

        <div
          onMouseDown={(e) => { onResizeStart(e); }}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "16px",
            height: "16px",
            cursor: "nwse-resize",
            background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%)",
          }}
        />
      </div>
    );
  }

  // ── SoundCloud Player Modal ────────────────────────────────────────────
  if (inputMode === "soundcloud" && soundcloudMedia) {
    return (
      <div
        className="floating-video-modal"
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          zIndex: 500,
          background: "rgba(15, 20, 30, 0.55)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          visibility: showVideoModal ? "visible" : "hidden",
          opacity: showVideoModal ? 1 : 0,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "opacity 0.2s ease, visibility 0.2s ease",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
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
            <span style={{ fontSize: "11px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {soundcloudMedia.title}
            </span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "8px" }}>
              {soundcloudAnalyzing && (
                <span style={{ fontSize: "9px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", animation: "pulse 2s ease infinite" }} />
                  Live
                </span>
              )}
              <button
                type="button"
                onClick={onToggleLabels}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  background: showLabelsModal ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  border: "none",
                  color: showLabelsModal ? "var(--text)" : "var(--muted)",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
                title="Toggle labels panel"
              >
                Labels
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={onClearScores}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
                title="Clear scores, spectrogram, and stats"
              >
                Clear
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={onToggleScSearch}
                style={{
                  background: showScModalSearch ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  border: "none",
                  color: showScModalSearch ? "var(--text)" : "var(--muted)",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "2px 4px",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Search new track"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={onCloseSoundcloud}
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
          </div>

          {/* Search input */}
          {showScModalSearch && (
            <div style={{
              display: "flex", gap: "6px", padding: "6px 10px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(0,0,0,0.3)", flexShrink: 0,
            }}>
              <input
                type="text"
                value={scModalSearchUrl}
                onChange={(e) => onScSearchUrlChange(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && scModalSearchUrl.trim() && !soundcloudPreparing) {
                    await onLoadSoundcloudTrack(scModalSearchUrl);
                  }
                }}
                placeholder="Paste SoundCloud URL..."
                autoFocus
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "4px", padding: "4px 8px", fontSize: "11px", color: "var(--text)",
                  outline: "none", minWidth: 0,
                }}
              />
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={async () => {
                  if (!scModalSearchUrl.trim() || soundcloudPreparing) return;
                  await onLoadSoundcloudTrack(scModalSearchUrl);
                }}
                disabled={soundcloudPreparing || !scModalSearchUrl.trim()}
                style={{
                  background: "var(--accent)", border: "none", borderRadius: "4px",
                  padding: "4px 10px", fontSize: "11px", color: "#000", cursor: "pointer",
                  opacity: soundcloudPreparing || !scModalSearchUrl.trim() ? 0.5 : 1,
                }}
              >
                {soundcloudPreparing ? "..." : "Load"}
              </button>
            </div>
          )}


        {/* Album art */}
        {soundcloudMedia.thumbnail_url && (
          <img
            src={soundcloudMedia.thumbnail_url}
            alt={soundcloudMedia.title}
            style={{
              width: "100%",
              flex: 1,
              objectFit: "cover",
              background: "transparent",
              display: "block",
              minHeight: 0,
            }}
          />
        )}

        {/* Hidden audio element */}
        <audio
          ref={soundcloudAudioRef}
          src={getAudioStreamUrl(soundcloudMedia.video_id)}
          crossOrigin="anonymous"
          style={{ display: "none" }}
          onPlay={onScPlay}
          onPause={onScPause}
          onEnded={onScEnded}
          onTimeUpdate={onScTimeUpdate}
          onLoadedMetadata={onScLoadedMetadata}
          onError={onScError}
        />

        {/* Custom player controls */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "8px 12px", background: "rgba(0, 0, 0, 0.5)",
          borderTop: "1px solid rgba(255, 255, 255, 0.06)", flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onScPlayPause}
            style={{
              width: "32px", height: "32px", borderRadius: "50%", border: "none",
              background: "rgba(255, 255, 255, 0.1)", color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", flexShrink: 0, transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
          >
            {scIsPlaying ? "⏸" : "▶"}
          </button>

          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Sora', monospace", minWidth: "36px", flexShrink: 0 }}>
            {Math.floor(scCurrentTime / 60)}:{String(Math.floor(scCurrentTime % 60)).padStart(2, "0")}
          </span>

          <div
            style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", cursor: "pointer", position: "relative", minWidth: 0 }}
            onClick={(e) => {
              if (!scDuration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              onScSeek(ratio * scDuration);
            }}
            onMouseDown={(e) => {
              onScSeekStart();
              const bar = e.currentTarget;
              const onMove = (ev: MouseEvent) => {
                if (!scDuration) return;
                const rect = bar.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                onScSeek(ratio * scDuration);
              };
              const onUp = (ev: MouseEvent) => {
                if (scDuration) {
                  const rect = bar.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                  onScSeekEnd(ratio * scDuration);
                }
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${scDuration ? (scCurrentTime / scDuration) * 100 : 0}%`, background: "var(--accent)", borderRadius: "2px", transition: scIsSeeking ? "none" : "width 0.1s linear" }} />
            <div style={{ position: "absolute", top: "-4px", left: `${scDuration ? (scCurrentTime / scDuration) * 100 : 0}%`, width: "12px", height: "12px", borderRadius: "50%", background: "#fff", transform: "translateX(-50%)", boxShadow: "0 1px 4px rgba(0,0,0,0.4)", opacity: 0.9, transition: scIsSeeking ? "none" : "left 0.1s linear" }} />
          </div>

          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "'Sora', monospace", minWidth: "36px", flexShrink: 0, textAlign: "right" }}>
            {Math.floor(scDuration / 60)}:{String(Math.floor(scDuration % 60)).padStart(2, "0")}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <button
              type="button"
              onClick={onScVolumeToggle}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "14px", padding: "2px", lineHeight: 1 }}
            >
              {scVolume === 0 ? "🔇" : scVolume < 0.5 ? "🔉" : "🔊"}
            </button>
            <input
              type="range"
              min={0} max={1} step={0.05}
              value={scVolume}
              onChange={(e) => onScVolumeChange(Number(e.target.value))}
              style={{ width: "50px", height: "3px", accentColor: "var(--accent)", cursor: "pointer" }}
            />
          </div>
        </div>


        {/* Resize handle */}
        <div
          onMouseDown={(e) => {
            onResizeStart(e);
          }}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "16px",
            height: "16px",
            cursor: "nwse-resize",
            background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%)",
          }}
        />
      </div>
    );
  }

  return null;
}

import type { RefObject } from "react";
import type { InputMode, MonitoringStatus } from "../../types/app";
import type { PrepareVideoResponse, PrepareMediaResponse } from "../../types";
import {
  VIDEO_BUFFER_SECONDS,
  DEFAULT_BUFFER_SECONDS,
} from "../../constants/audio";
import { cleanupVideo } from "../../api";

export interface ModeTabsProps {
  inputMode: InputMode;
  status: MonitoringStatus;
  youtubeVideo: PrepareVideoResponse | null;
  onSetInputMode: (mode: InputMode) => void;
  onSetBufferSeconds: (s: number) => void;
  onStopMonitoring: () => Promise<void>;
  onSetYoutubeAnalyzing: (a: boolean) => void;
  onSetYoutubeVideo: (v: PrepareVideoResponse | null) => void;
  videoAudioBufferRef: RefObject<Float32Array[]>;
  videoScriptProcessorRef: RefObject<ScriptProcessorNode | null>;
  videoSourceRef: RefObject<MediaElementAudioSourceNode | null>;
  videoAnalyserRef: RefObject<AnalyserNode | null>;
  videoAudioContextRef: RefObject<AudioContext | null>;
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "0.75rem",
  background: active ? "rgba(255, 122, 61, 0.2)" : "transparent",
  border: "none",
  borderBottom: active ? "2px solid #ff7a3d" : "2px solid transparent",
  color: active ? "#ff7a3d" : "#888",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: active ? 600 : 400,
});

export function ModeTabs({
  inputMode,
  status,
  youtubeVideo,
  onSetInputMode,
  onSetBufferSeconds,
  onStopMonitoring,
  onSetYoutubeAnalyzing,
  onSetYoutubeVideo,
  videoAudioBufferRef,
  videoScriptProcessorRef,
  videoSourceRef,
  videoAnalyserRef,
  videoAudioContextRef,
}: ModeTabsProps) {
  const cleanupYouTubeResources = () => {
    onSetYoutubeAnalyzing(false);
    videoAudioBufferRef.current = [];
    if (youtubeVideo) {
      cleanupVideo(youtubeVideo.video_id);
      onSetYoutubeVideo(null);
      if (videoScriptProcessorRef.current) {
        videoScriptProcessorRef.current.disconnect();
        videoScriptProcessorRef.current = null;
      }
      if (videoSourceRef.current) {
        videoSourceRef.current.disconnect();
        videoSourceRef.current = null;
      }
      if (videoAnalyserRef.current) {
        videoAnalyserRef.current.disconnect();
        videoAnalyserRef.current = null;
      }
      if (videoAudioContextRef.current) {
        videoAudioContextRef.current.close();
        videoAudioContextRef.current = null;
      }
    }
  };

  return (
    <div style={{ display: "flex", borderBottom: "1px solid #333", marginBottom: "1rem" }}>
      <button
        type="button"
        onClick={() => {
          onSetInputMode("youtube");
          onSetBufferSeconds(VIDEO_BUFFER_SECONDS);
          if (status === "running") onStopMonitoring();
        }}
        style={tabStyle(inputMode === "youtube")}
      >
        YouTube
      </button>
      <button
        type="button"
        onClick={() => {
          onSetInputMode("soundcloud");
          onSetBufferSeconds(VIDEO_BUFFER_SECONDS);
          if (status === "running") onStopMonitoring();
          onSetYoutubeAnalyzing(false);
          videoAudioBufferRef.current = [];
        }}
        style={tabStyle(inputMode === "soundcloud")}
      >
        SoundCloud
      </button>
      <button
        type="button"
        onClick={() => {
          onSetInputMode("microphone");
          onSetBufferSeconds(DEFAULT_BUFFER_SECONDS);
          cleanupYouTubeResources();
        }}
        style={tabStyle(inputMode === "microphone")}
      >
        Microphone
      </button>
    </div>
  );
}

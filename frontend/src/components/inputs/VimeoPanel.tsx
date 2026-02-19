import type { RefObject } from "react";
import type { PrepareMediaResponse, ModelStatusResponse } from "../../types";
import { getVideoStreamUrl, cleanupVideo, prepareMedia } from "../../api";
import { DEBUG_YT } from "../../constants/audio";

export interface VimeoPanelProps {
  vimeoUrl: string;
  vimeoMedia: PrepareMediaResponse | null;
  vimeoAnalyzing: boolean;
  vimeoPreparing: boolean;
  vimeoError: string;
  onSetVimeoUrl: (url: string) => void;
  onSetVimeoMedia: (media: PrepareMediaResponse | null) => void;
  onSetVimeoPreparing: (preparing: boolean) => void;
  onSetVimeoError: (error: string) => void;
  onSetVimeoAnalyzing: (analyzing: boolean) => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoAudioContextRef: RefObject<AudioContext | null>;
  videoSourceRef: RefObject<MediaElementAudioSourceNode | null>;
  videoScriptProcessorRef: RefObject<ScriptProcessorNode | null>;
  videoAnalyserRef: RefObject<AnalyserNode | null>;
  videoAudioBufferRef: RefObject<Float32Array[]>;
  vimeoAnalyzingRef: RefObject<boolean>;
  bufferSecondsRef: RefObject<number>;
  bufferSeconds: number;
  classifyVideoBuffer: (sampleRate: number) => void;
  modelStatus: ModelStatusResponse | null;
}

function disconnectAudioGraph(
  scriptProcessorRef: RefObject<ScriptProcessorNode | null>,
  sourceRef: RefObject<MediaElementAudioSourceNode | null>,
  analyserRef: RefObject<AnalyserNode | null>,
  audioContextRef: RefObject<AudioContext | null>,
  audioBufferRef: RefObject<Float32Array[]>,
) {
  if (scriptProcessorRef.current) {
    scriptProcessorRef.current.disconnect();
    scriptProcessorRef.current = null;
  }
  if (sourceRef.current) {
    sourceRef.current.disconnect();
    sourceRef.current = null;
  }
  if (analyserRef.current) {
    analyserRef.current.disconnect();
    analyserRef.current = null;
  }
  if (audioContextRef.current) {
    audioContextRef.current.close();
    audioContextRef.current = null;
  }
  audioBufferRef.current = [];
}

export function VimeoPanel({
  vimeoUrl,
  vimeoMedia,
  vimeoAnalyzing,
  vimeoPreparing,
  vimeoError,
  onSetVimeoUrl,
  onSetVimeoMedia,
  onSetVimeoPreparing,
  onSetVimeoError,
  onSetVimeoAnalyzing,
  videoRef,
  videoAudioContextRef,
  videoSourceRef,
  videoScriptProcessorRef,
  videoAnalyserRef,
  videoAudioBufferRef,
  vimeoAnalyzingRef,
  bufferSecondsRef,
  bufferSeconds,
  classifyVideoBuffer,
  modelStatus,
}: VimeoPanelProps) {
  const handleLoad = async () => {
    if (!vimeoUrl.trim()) {
      onSetVimeoError("Please enter a Vimeo URL");
      return;
    }

    disconnectAudioGraph(
      videoScriptProcessorRef,
      videoSourceRef,
      videoAnalyserRef,
      videoAudioContextRef,
      videoAudioBufferRef,
    );
    onSetVimeoAnalyzing(false);

    onSetVimeoPreparing(true);
    onSetVimeoError("");
    onSetVimeoMedia(null);
    try {
      const result = await prepareMedia(vimeoUrl);
      onSetVimeoMedia(result);
    } catch (err) {
      onSetVimeoError(err instanceof Error ? err.message : "Failed to prepare video");
    } finally {
      onSetVimeoPreparing(false);
    }
  };

  const handleClear = async () => {
    if (!vimeoMedia) return;
    await cleanupVideo(vimeoMedia.video_id);
    onSetVimeoMedia(null);
    disconnectAudioGraph(
      videoScriptProcessorRef,
      videoSourceRef,
      videoAnalyserRef,
      videoAudioContextRef,
      videoAudioBufferRef,
    );
  };

  const handlePlay = () => {
    if (!videoRef.current) return;
    vimeoAnalyzingRef.current = true;

    if (!videoAudioContextRef.current) {
      if (DEBUG_YT) console.log("[Vimeo] Creating AudioContext for video");
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(videoRef.current);
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      source.connect(audioContext.destination);

      let currentBufferSamples = 0;

      scriptProcessor.onaudioprocess = (event) => {
        if (!vimeoAnalyzingRef.current) return;
        const inputData = event.inputBuffer.getChannelData(0);
        const samples = new Float32Array(inputData);
        videoAudioBufferRef.current.push(samples);
        currentBufferSamples += samples.length;
        const currentMaxSamples = audioContext.sampleRate * bufferSecondsRef.current;
        if (currentBufferSamples >= currentMaxSamples) {
          currentBufferSamples = 0;
          classifyVideoBuffer(audioContext.sampleRate);
        }
      };

      videoAudioContextRef.current = audioContext;
      videoSourceRef.current = source;
      videoScriptProcessorRef.current = scriptProcessor;
      videoAnalyserRef.current = analyser;
    }
    onSetVimeoAnalyzing(true);
  };

  const handlePauseOrEnd = () => {
    vimeoAnalyzingRef.current = false;
    onSetVimeoAnalyzing(false);
    videoAudioBufferRef.current = [];
  };

  return (
    <section className="block">
      <h2>Vimeo Live Analysis</h2>
      <div className="stack">
        <label className="label" htmlFor="vimeo-url">
          Vimeo video URL
        </label>
        <input
          id="vimeo-url"
          type="text"
          placeholder="https://vimeo.com/123456789"
          value={vimeoUrl}
          onChange={(e) => onSetVimeoUrl(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "4px",
            border: "1px solid #444",
            background: "#1a1a1a",
            color: "#eee",
          }}
        />
        <button
          type="button"
          onClick={handleLoad}
          disabled={vimeoPreparing || !modelStatus?.loaded}
        >
          {vimeoPreparing ? "Downloading..." : "Load Video"}
        </button>
        {vimeoError && <p className="error">{vimeoError}</p>}
        {vimeoMedia && (
          <div
            style={{
              padding: "0.75rem",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "6px",
              fontSize: "0.8rem",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              {vimeoMedia.title}
            </div>
            <div className="info-line">
              <span>Duration</span>
              <span>
                {Math.floor(vimeoMedia.duration_s / 60)}:
                {String(Math.floor(vimeoMedia.duration_s % 60)).padStart(2, "0")}
              </span>
            </div>
            <video
              ref={videoRef}
              src={getVideoStreamUrl(vimeoMedia.video_id)}
              controls
              crossOrigin="anonymous"
              style={{
                width: "100%",
                borderRadius: "4px",
                marginTop: "0.5rem",
              }}
              onPlay={handlePlay}
              onPause={handlePauseOrEnd}
              onEnded={handlePauseOrEnd}
              onError={(e) => {
                const vid = e.currentTarget as HTMLVideoElement;
                const err = vid.error;
                if (DEBUG_YT)
                  console.error("[Vimeo] Video error:", err?.code, err?.message, "src:", vid.src);
                onSetVimeoError(
                  `Video playback error: ${err?.message || "unknown"} (code ${err?.code})`,
                );
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="ghost"
                onClick={handleClear}
                style={{ fontSize: "0.75rem" }}
              >
                Clear video
              </button>
            </div>
            {vimeoAnalyzing && (
              <div style={{ marginTop: "0.5rem", color: "#5ce3a2", fontSize: "0.75rem" }}>
                ● Analyzing audio in real-time...
              </div>
            )}
          </div>
        )}
        <p className="muted" style={{ fontSize: "0.75rem" }}>
          Downloads video via yt-dlp, plays locally with real-time FLAM analysis.
          FLAM scores update as the video plays.
        </p>
      </div>
    </section>
  );
}

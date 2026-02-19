import type { RefObject } from "react";
import type { PrepareVideoResponse, ModelStatusResponse } from "../../types";
import { VIDEO_BUFFER_SECONDS, DEBUG_YT } from "../../constants/audio";
import { getVideoStreamUrl, cleanupVideo, prepareYouTubeVideo } from "../../api";

export interface YouTubePanelProps {
  youtubeUrl: string;
  youtubeVideo: PrepareVideoResponse | null;
  youtubeAnalyzing: boolean;
  youtubePreparing: boolean;
  youtubeError: string;
  onSetYoutubeUrl: (url: string) => void;
  onSetYoutubeVideo: (video: PrepareVideoResponse | null) => void;
  onSetYoutubePreparing: (preparing: boolean) => void;
  onSetYoutubeError: (error: string) => void;
  onSetYoutubeAnalyzing: (analyzing: boolean) => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoAudioContextRef: RefObject<AudioContext | null>;
  videoSourceRef: RefObject<MediaElementAudioSourceNode | null>;
  videoScriptProcessorRef: RefObject<ScriptProcessorNode | null>;
  videoAnalyserRef: RefObject<AnalyserNode | null>;
  videoAudioBufferRef: RefObject<Float32Array[]>;
  youtubeAnalyzingRef: RefObject<boolean>;
  bufferSecondsRef: RefObject<number>;
  bufferSeconds: number;
  classifyVideoBuffer: (sampleRate: number) => void;
  modelStatus: ModelStatusResponse | null;
}

export function YouTubePanel({
  youtubeUrl,
  youtubeVideo,
  youtubeAnalyzing,
  youtubePreparing,
  youtubeError,
  onSetYoutubeUrl,
  onSetYoutubeVideo,
  onSetYoutubePreparing,
  onSetYoutubeError,
  onSetYoutubeAnalyzing,
  videoRef,
  videoAudioContextRef,
  videoSourceRef,
  videoScriptProcessorRef,
  videoAnalyserRef,
  videoAudioBufferRef,
  youtubeAnalyzingRef,
  bufferSecondsRef,
  bufferSeconds,
  classifyVideoBuffer,
  modelStatus,
}: YouTubePanelProps) {
  return (
    <section className="block">
      <h2>YouTube Live Analysis</h2>
      <div className="stack">
        <label className="label" htmlFor="youtube-url">
          YouTube video URL
        </label>
        <input
          id="youtube-url"
          type="text"
          placeholder="https://www.youtube.com/watch?v=..."
          value={youtubeUrl}
          onChange={(e) => onSetYoutubeUrl(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "4px",
            border: "1px solid #444",
            background: "#1a1a1a",
            color: "#eee"
          }}
        />
        <button
          type="button"
          onClick={async () => {
            if (!youtubeUrl.trim()) {
              onSetYoutubeError("Please enter a YouTube URL");
              return;
            }

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
            videoAudioBufferRef.current = [];
            onSetYoutubeAnalyzing(false);

            onSetYoutubePreparing(true);
            onSetYoutubeError("");
            onSetYoutubeVideo(null);
            try {
              const result = await prepareYouTubeVideo(youtubeUrl);
              onSetYoutubeVideo(result);
            } catch (err) {
              onSetYoutubeError(err instanceof Error ? err.message : "Failed to prepare video");
            } finally {
              onSetYoutubePreparing(false);
            }
          }}
          disabled={youtubePreparing || !modelStatus?.loaded}
        >
          {youtubePreparing ? "Downloading..." : "Load Video"}
        </button>
        {youtubeError && <p className="error">{youtubeError}</p>}
        {youtubeVideo && (
          <div style={{
            padding: "0.75rem",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "6px",
            fontSize: "0.8rem"
          }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              {youtubeVideo.title}
            </div>
            <div className="info-line">
              <span>Duration</span>
              <span>{Math.floor(youtubeVideo.duration_s / 60)}:{String(Math.floor(youtubeVideo.duration_s % 60)).padStart(2, '0')}</span>
            </div>
            <video
              ref={videoRef}
              src={getVideoStreamUrl(youtubeVideo.video_id)}
              controls
              crossOrigin="anonymous"
              style={{
                width: "100%",
                borderRadius: "4px",
                marginTop: "0.5rem"
              }}
              onPlay={() => {
                if (!videoRef.current) return;
                youtubeAnalyzingRef.current = true;

                if (!videoAudioContextRef.current) {
                  if (DEBUG_YT) console.log('[YT] Creating AudioContext for classic video');
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

                  const maxBufferSamples = audioContext.sampleRate * bufferSeconds;
                  void maxBufferSamples;
                  let currentBufferSamples = 0;

                  scriptProcessor.onaudioprocess = (event) => {
                    if (!youtubeAnalyzingRef.current) return;

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
                onSetYoutubeAnalyzing(true);
              }}
              onPause={() => {
                youtubeAnalyzingRef.current = false;
                onSetYoutubeAnalyzing(false);
                videoAudioBufferRef.current = [];
              }}
              onEnded={() => {
                youtubeAnalyzingRef.current = false;
                onSetYoutubeAnalyzing(false);
                videoAudioBufferRef.current = [];
              }}
              onError={(e) => {
                const vid = e.currentTarget as HTMLVideoElement;
                const err = vid.error;
                if (DEBUG_YT) console.error('[YT] Video error:', err?.code, err?.message, 'src:', vid.src);
                onSetYoutubeError(`Video playback error: ${err?.message || 'unknown'} (code ${err?.code})`);
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="ghost"
                onClick={async () => {
                  if (youtubeVideo) {
                    await cleanupVideo(youtubeVideo.video_id);
                    onSetYoutubeVideo(null);
                    if (videoScriptProcessorRef.current) {
                      videoScriptProcessorRef.current.disconnect();
                      videoScriptProcessorRef.current = null;
                    }
                    if (videoSourceRef.current) {
                      videoSourceRef.current.disconnect();
                      videoSourceRef.current = null;
                    }
                    if (videoAudioContextRef.current) {
                      videoAudioContextRef.current.close();
                      videoAudioContextRef.current = null;
                    }
                  }
                }}
                style={{ fontSize: "0.75rem" }}
              >
                Clear video
              </button>
            </div>
            {youtubeAnalyzing && (
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

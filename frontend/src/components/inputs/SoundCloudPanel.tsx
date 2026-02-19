import type { RefObject } from "react";
import type { PrepareMediaResponse, ModelStatusResponse } from "../../types";
import { getAudioStreamUrl, cleanupVideo, prepareMedia } from "../../api";

export interface SoundCloudPanelProps {
  soundcloudUrl: string;
  soundcloudMedia: PrepareMediaResponse | null;
  soundcloudAnalyzing: boolean;
  soundcloudPreparing: boolean;
  soundcloudError: string;
  onSetSoundcloudUrl: (url: string) => void;
  onSetSoundcloudMedia: (media: PrepareMediaResponse | null) => void;
  onSetSoundcloudPreparing: (preparing: boolean) => void;
  onSetSoundcloudError: (error: string) => void;
  onSetSoundcloudAnalyzing: (analyzing: boolean) => void;
  soundcloudAudioRef: RefObject<HTMLAudioElement | null>;
  soundcloudAudioContextRef: RefObject<AudioContext | null>;
  soundcloudSourceRef: RefObject<MediaElementAudioSourceNode | null>;
  soundcloudScriptProcessorRef: RefObject<ScriptProcessorNode | null>;
  soundcloudAnalyserRef: RefObject<AnalyserNode | null>;
  soundcloudAudioBufferRef: RefObject<Float32Array[]>;
  soundcloudAnalyzingRef: RefObject<boolean>;
  bufferSecondsRef: RefObject<number>;
  classifySoundcloudBuffer: (sampleRate: number) => void;
  scIsPlaying: boolean;
  scCurrentTime: number;
  scDuration: number;
  scIsSeeking: boolean;
  onSetScIsPlaying: (playing: boolean) => void;
  onSetScCurrentTime: (time: number) => void;
  onSetScDuration: (duration: number) => void;
  onSetScIsSeeking: (seeking: boolean) => void;
  modelStatus: ModelStatusResponse | null;
}

export function SoundCloudPanel({
  soundcloudUrl,
  soundcloudMedia,
  soundcloudAnalyzing,
  soundcloudPreparing,
  soundcloudError,
  onSetSoundcloudUrl,
  onSetSoundcloudMedia,
  onSetSoundcloudPreparing,
  onSetSoundcloudError,
  onSetSoundcloudAnalyzing,
  soundcloudAudioRef,
  soundcloudAudioContextRef,
  soundcloudSourceRef,
  soundcloudScriptProcessorRef,
  soundcloudAnalyserRef,
  soundcloudAudioBufferRef,
  soundcloudAnalyzingRef,
  bufferSecondsRef,
  classifySoundcloudBuffer,
  scIsPlaying,
  scCurrentTime,
  scDuration,
  scIsSeeking,
  onSetScIsPlaying,
  onSetScCurrentTime,
  onSetScDuration,
  onSetScIsSeeking,
  modelStatus,
}: SoundCloudPanelProps) {
  return (
    <section className="block">
      <h2>SoundCloud Live Analysis</h2>
      <div className="stack">
        <label className="label" htmlFor="soundcloud-url">
          SoundCloud track URL
        </label>
        <input
          id="soundcloud-url"
          type="text"
          placeholder="https://soundcloud.com/artist/track"
          value={soundcloudUrl}
          onChange={(e) => onSetSoundcloudUrl(e.target.value)}
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
            if (!soundcloudUrl.trim()) {
              onSetSoundcloudError("Please enter a SoundCloud URL");
              return;
            }

            if (soundcloudScriptProcessorRef.current) {
              soundcloudScriptProcessorRef.current.disconnect();
              soundcloudScriptProcessorRef.current = null;
            }
            if (soundcloudSourceRef.current) {
              soundcloudSourceRef.current.disconnect();
              soundcloudSourceRef.current = null;
            }
            if (soundcloudAnalyserRef.current) {
              soundcloudAnalyserRef.current.disconnect();
              soundcloudAnalyserRef.current = null;
            }
            if (soundcloudAudioContextRef.current) {
              soundcloudAudioContextRef.current.close();
              soundcloudAudioContextRef.current = null;
            }
            soundcloudAudioBufferRef.current = [];
            onSetSoundcloudAnalyzing(false);

            onSetSoundcloudPreparing(true);
            onSetSoundcloudError("");
            onSetSoundcloudMedia(null);
            try {
              const result = await prepareMedia(soundcloudUrl);
              onSetSoundcloudMedia(result);
            } catch (err) {
              onSetSoundcloudError(err instanceof Error ? err.message : "Failed to prepare audio");
            } finally {
              onSetSoundcloudPreparing(false);
            }
          }}
          disabled={soundcloudPreparing || !modelStatus?.loaded}
        >
          {soundcloudPreparing ? "Downloading..." : "Load Track"}
        </button>
        {soundcloudError && <p className="error">{soundcloudError}</p>}
        {soundcloudMedia && (
          <div style={{
            padding: "0.75rem",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "6px",
            fontSize: "0.8rem"
          }}>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
              {soundcloudMedia.title}
            </div>
            <div className="info-line">
              <span>Duration</span>
              <span>{Math.floor(soundcloudMedia.duration_s / 60)}:{String(Math.floor(soundcloudMedia.duration_s % 60)).padStart(2, "0")}</span>
            </div>
            {soundcloudMedia.thumbnail_url && (
              <img
                src={soundcloudMedia.thumbnail_url}
                alt={soundcloudMedia.title}
                style={{
                  width: "100%",
                  borderRadius: "4px",
                  marginTop: "0.5rem",
                  maxHeight: "200px",
                  objectFit: "cover",
                }}
              />
            )}
            <audio
              ref={soundcloudAudioRef}
              src={getAudioStreamUrl(soundcloudMedia.video_id)}
              crossOrigin="anonymous"
              style={{ display: "none" }}
              onPlay={() => {
                onSetScIsPlaying(true);
                if (!soundcloudAudioRef.current) return;
                soundcloudAnalyzingRef.current = true;
                if (!soundcloudAudioContextRef.current) {
                  const audioContext = new AudioContext();
                  const source = audioContext.createMediaElementSource(soundcloudAudioRef.current);
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
                    if (!soundcloudAnalyzingRef.current) return;
                    const inputData = event.inputBuffer.getChannelData(0);
                    const samples = new Float32Array(inputData);
                    soundcloudAudioBufferRef.current.push(samples);
                    currentBufferSamples += samples.length;
                    const currentMaxSamples = audioContext.sampleRate * bufferSecondsRef.current;
                    if (currentBufferSamples >= currentMaxSamples) {
                      currentBufferSamples = 0;
                      classifySoundcloudBuffer(audioContext.sampleRate);
                    }
                  };
                  soundcloudAudioContextRef.current = audioContext;
                  soundcloudSourceRef.current = source;
                  soundcloudScriptProcessorRef.current = scriptProcessor;
                  soundcloudAnalyserRef.current = analyser;
                }
                onSetSoundcloudAnalyzing(true);
              }}
              onPause={() => { onSetScIsPlaying(false); soundcloudAnalyzingRef.current = false; onSetSoundcloudAnalyzing(false); soundcloudAudioBufferRef.current = []; }}
              onEnded={() => { onSetScIsPlaying(false); soundcloudAnalyzingRef.current = false; onSetSoundcloudAnalyzing(false); soundcloudAudioBufferRef.current = []; }}
              onTimeUpdate={() => { if (!scIsSeeking && soundcloudAudioRef.current) onSetScCurrentTime(soundcloudAudioRef.current.currentTime); }}
              onLoadedMetadata={() => { if (soundcloudAudioRef.current) onSetScDuration(soundcloudAudioRef.current.duration); }}
              onError={() => { onSetSoundcloudError("Audio playback failed. The track may be paywalled (SoundCloud Go+)."); }}
            />
            {/* Custom player controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "0.5rem", padding: "8px 10px", background: "rgba(0,0,0,0.4)", borderRadius: "6px" }}>
              <button type="button" onClick={() => { if (!soundcloudAudioRef.current) return; if (scIsPlaying) soundcloudAudioRef.current.pause(); else soundcloudAudioRef.current.play(); }} style={{ width: "28px", height: "28px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: 0 }}>{scIsPlaying ? "⏸" : "▶"}</button>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontFamily: "monospace", minWidth: "32px" }}>{Math.floor(scCurrentTime / 60)}:{String(Math.floor(scCurrentTime % 60)).padStart(2, "0")}</span>
              <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", cursor: "pointer", position: "relative" }} onClick={(e) => { if (!soundcloudAudioRef.current || !scDuration) return; const rect = e.currentTarget.getBoundingClientRect(); const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); soundcloudAudioRef.current.currentTime = ratio * scDuration; onSetScCurrentTime(ratio * scDuration); }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${scDuration ? (scCurrentTime / scDuration) * 100 : 0}%`, background: "var(--accent)", borderRadius: "2px" }} />
              </div>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", minWidth: "32px", textAlign: "right" }}>{Math.floor(scDuration / 60)}:{String(Math.floor(scDuration % 60)).padStart(2, "0")}</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="ghost"
                onClick={async () => {
                  if (soundcloudMedia) {
                    await cleanupVideo(soundcloudMedia.video_id);
                    onSetSoundcloudMedia(null);
                    if (soundcloudScriptProcessorRef.current) {
                      soundcloudScriptProcessorRef.current.disconnect();
                      soundcloudScriptProcessorRef.current = null;
                    }
                    if (soundcloudSourceRef.current) {
                      soundcloudSourceRef.current.disconnect();
                      soundcloudSourceRef.current = null;
                    }
                    if (soundcloudAudioContextRef.current) {
                      soundcloudAudioContextRef.current.close();
                      soundcloudAudioContextRef.current = null;
                    }
                  }
                }}
                style={{ fontSize: "0.75rem" }}
              >
                Clear track
              </button>
            </div>
            {soundcloudAnalyzing && (
              <div style={{ marginTop: "0.5rem", color: "#5ce3a2", fontSize: "0.75rem" }}>
                ● Analyzing audio in real-time...
              </div>
            )}
          </div>
        )}
        <p className="muted" style={{ fontSize: "0.75rem" }}>
          Downloads audio via yt-dlp, plays locally with real-time FLAM analysis.
          Album art fills the video area. FLAM scores update as the track plays.
        </p>
      </div>
    </section>
  );
}

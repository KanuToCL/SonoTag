import { useCallback, useEffect, useRef, useState } from "react";
import type { PrepareVideoResponse } from "../types";
import { prepareYouTubeVideo, cleanupVideo } from "../api";
import { DEBUG_YT } from "../constants/audio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseYouTubeParams {
  classifyVideoBuffer: (sampleRate: number) => Promise<void>;
  bufferSeconds: number;
  /** Shared refs owned by App, also used by useClassification */
  videoAudioBufferRef: React.MutableRefObject<Float32Array[]>;
  youtubeAnalyzingRef: React.MutableRefObject<boolean>;
  videoAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  bufferSecondsRef: React.MutableRefObject<number>;
}

export interface UseYouTubeReturn {
  youtubeUrl: string;
  youtubePreparing: boolean;
  youtubeVideo: PrepareVideoResponse | null;
  youtubeError: string;
  youtubeAnalyzing: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoAudioContextRef: React.MutableRefObject<AudioContext | null>;
  videoSourceRef: React.MutableRefObject<MediaElementAudioSourceNode | null>;
  videoScriptProcessorRef: React.MutableRefObject<ScriptProcessorNode | null>;
  setYoutubeUrl: React.Dispatch<React.SetStateAction<string>>;
  setYoutubePreparing: React.Dispatch<React.SetStateAction<boolean>>;
  setYoutubeVideo: React.Dispatch<React.SetStateAction<PrepareVideoResponse | null>>;
  setYoutubeError: React.Dispatch<React.SetStateAction<string>>;
  setYoutubeAnalyzing: React.Dispatch<React.SetStateAction<boolean>>;
  loadYouTubeVideo: (url: string) => Promise<void>;
  stopYouTubeAnalysis: () => void;
  startYouTubeAnalysis: () => void;
  cleanupYouTubeAudio: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useYouTube({
  classifyVideoBuffer,
  bufferSeconds,
  videoAudioBufferRef,
  youtubeAnalyzingRef,
  videoAnalyserRef,
  bufferSecondsRef,
}: UseYouTubeParams): UseYouTubeReturn {
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [youtubePreparing, setYoutubePreparing] = useState<boolean>(false);
  const [youtubeVideo, setYoutubeVideo] = useState<PrepareVideoResponse | null>(null);
  const [youtubeError, setYoutubeError] = useState<string>("");
  const [youtubeAnalyzing, setYoutubeAnalyzing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoAudioContextRef = useRef<AudioContext | null>(null);
  const videoSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const videoScriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Sync analyzing state → shared ref
  useEffect(() => {
    youtubeAnalyzingRef.current = youtubeAnalyzing;
  }, [youtubeAnalyzing, youtubeAnalyzingRef]);

  // Sync bufferSeconds → shared ref
  useEffect(() => {
    bufferSecondsRef.current = bufferSeconds;
  }, [bufferSeconds, bufferSecondsRef]);

  const cleanupYouTubeAudio = useCallback(() => {
    if (videoScriptProcessorRef.current) { videoScriptProcessorRef.current.disconnect(); videoScriptProcessorRef.current = null; }
    if (videoSourceRef.current) { videoSourceRef.current.disconnect(); videoSourceRef.current = null; }
    if (videoAnalyserRef.current) { videoAnalyserRef.current.disconnect(); videoAnalyserRef.current = null; }
    if (videoAudioContextRef.current) { videoAudioContextRef.current.close(); videoAudioContextRef.current = null; }
  }, [videoAnalyserRef]);

  const stopYouTubeAnalysis = useCallback(() => {
    youtubeAnalyzingRef.current = false;
    setYoutubeAnalyzing(false);
    videoAudioBufferRef.current = [];
  }, [youtubeAnalyzingRef, videoAudioBufferRef]);

  const startYouTubeAnalysis = useCallback(() => {
    if (!videoRef.current) return;
    youtubeAnalyzingRef.current = true;

    if (!videoAudioContextRef.current) {
      if (DEBUG_YT) console.log("[YT] Creating AudioContext for video");
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

    setYoutubeAnalyzing(true);
  }, [classifyVideoBuffer, youtubeAnalyzingRef, videoAudioBufferRef, videoAnalyserRef, bufferSecondsRef]);

  const loadYouTubeVideo = useCallback(
    async (url: string): Promise<void> => {
      setYoutubeAnalyzing(false);
      videoAudioBufferRef.current = [];
      cleanupYouTubeAudio();
      if (youtubeVideo) cleanupVideo(youtubeVideo.video_id).catch(() => {});
      setYoutubeVideo(null);

      setYoutubePreparing(true);
      setYoutubeError("");
      try {
        const result = await prepareYouTubeVideo(url);
        setYoutubeVideo(result);
        setYoutubeUrl(url);
      } catch (err) {
        setYoutubeError(err instanceof Error ? err.message : "Failed to prepare video");
      } finally {
        setYoutubePreparing(false);
      }
    },
    [youtubeVideo, cleanupYouTubeAudio, videoAudioBufferRef]
  );

  return {
    youtubeUrl,
    youtubePreparing,
    youtubeVideo,
    youtubeError,
    youtubeAnalyzing,
    videoRef,
    videoAudioContextRef,
    videoSourceRef,
    videoScriptProcessorRef,
    setYoutubeUrl,
    setYoutubePreparing,
    setYoutubeVideo,
    setYoutubeError,
    setYoutubeAnalyzing,
    loadYouTubeVideo,
    stopYouTubeAnalysis,
    startYouTubeAnalysis,
    cleanupYouTubeAudio,
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { PrepareMediaResponse } from "../types";
import { prepareMedia, cleanupVideo } from "../api";
import { DEBUG_YT } from "../constants/audio";

export interface UseVimeoParams {
  classifyVideoBuffer: (sampleRate: number) => Promise<void>;
  bufferSeconds: number;
  videoAudioBufferRef: React.MutableRefObject<Float32Array[]>;
  vimeoAnalyzingRef: React.MutableRefObject<boolean>;
  vimeoAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  bufferSecondsRef: React.MutableRefObject<number>;
}

export interface UseVimeoReturn {
  vimeoUrl: string;
  vimeoPreparing: boolean;
  vimeoMedia: PrepareMediaResponse | null;
  vimeoError: string;
  vimeoAnalyzing: boolean;
  vimeoVideoRef: React.RefObject<HTMLVideoElement | null>;
  vimeoAudioContextRef: React.MutableRefObject<AudioContext | null>;
  vimeoSourceRef: React.MutableRefObject<MediaElementAudioSourceNode | null>;
  vimeoScriptProcessorRef: React.MutableRefObject<ScriptProcessorNode | null>;
  setVimeoUrl: React.Dispatch<React.SetStateAction<string>>;
  setVimeoPreparing: React.Dispatch<React.SetStateAction<boolean>>;
  setVimeoMedia: React.Dispatch<React.SetStateAction<PrepareMediaResponse | null>>;
  setVimeoError: React.Dispatch<React.SetStateAction<string>>;
  setVimeoAnalyzing: React.Dispatch<React.SetStateAction<boolean>>;
  loadVimeoVideo: (url: string) => Promise<void>;
  stopVimeoAnalysis: () => void;
  startVimeoAnalysis: () => void;
  cleanupVimeoAudio: () => void;
}

export function useVimeo({
  classifyVideoBuffer,
  bufferSeconds,
  videoAudioBufferRef,
  vimeoAnalyzingRef,
  vimeoAnalyserRef,
  bufferSecondsRef,
}: UseVimeoParams): UseVimeoReturn {
  const [vimeoUrl, setVimeoUrl] = useState<string>("");
  const [vimeoPreparing, setVimeoPreparing] = useState<boolean>(false);
  const [vimeoMedia, setVimeoMedia] = useState<PrepareMediaResponse | null>(null);
  const [vimeoError, setVimeoError] = useState<string>("");
  const [vimeoAnalyzing, setVimeoAnalyzing] = useState<boolean>(false);

  const vimeoVideoRef = useRef<HTMLVideoElement>(null);
  const vimeoAudioContextRef = useRef<AudioContext | null>(null);
  const vimeoSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const vimeoScriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    vimeoAnalyzingRef.current = vimeoAnalyzing;
  }, [vimeoAnalyzing, vimeoAnalyzingRef]);

  useEffect(() => {
    bufferSecondsRef.current = bufferSeconds;
  }, [bufferSeconds, bufferSecondsRef]);

  const cleanupVimeoAudio = useCallback(() => {
    if (vimeoScriptProcessorRef.current) { vimeoScriptProcessorRef.current.disconnect(); vimeoScriptProcessorRef.current = null; }
    if (vimeoSourceRef.current) { vimeoSourceRef.current.disconnect(); vimeoSourceRef.current = null; }
    if (vimeoAnalyserRef.current) { vimeoAnalyserRef.current.disconnect(); vimeoAnalyserRef.current = null; }
    if (vimeoAudioContextRef.current) { vimeoAudioContextRef.current.close(); vimeoAudioContextRef.current = null; }
  }, [vimeoAnalyserRef]);

  const stopVimeoAnalysis = useCallback(() => {
    vimeoAnalyzingRef.current = false;
    setVimeoAnalyzing(false);
    videoAudioBufferRef.current = [];
  }, [vimeoAnalyzingRef, videoAudioBufferRef]);

  const startVimeoAnalysis = useCallback(() => {
    if (!vimeoVideoRef.current) return;
    vimeoAnalyzingRef.current = true;

    if (!vimeoAudioContextRef.current) {
      if (DEBUG_YT) console.log("[Vimeo] Creating AudioContext for video");
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(vimeoVideoRef.current);
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

      vimeoAudioContextRef.current = audioContext;
      vimeoSourceRef.current = source;
      vimeoScriptProcessorRef.current = scriptProcessor;
      vimeoAnalyserRef.current = analyser;
    }

    setVimeoAnalyzing(true);
  }, [classifyVideoBuffer, vimeoAnalyzingRef, videoAudioBufferRef, vimeoAnalyserRef, bufferSecondsRef]);

  const loadVimeoVideo = useCallback(
    async (url: string): Promise<void> => {
      setVimeoAnalyzing(false);
      videoAudioBufferRef.current = [];
      cleanupVimeoAudio();
      if (vimeoMedia) cleanupVideo(vimeoMedia.video_id).catch(() => {});
      setVimeoMedia(null);

      setVimeoPreparing(true);
      setVimeoError("");
      try {
        const result = await prepareMedia(url);
        setVimeoMedia(result);
        setVimeoUrl(url);
      } catch (err) {
        setVimeoError(err instanceof Error ? err.message : "Failed to prepare video");
      } finally {
        setVimeoPreparing(false);
      }
    },
    [vimeoMedia, cleanupVimeoAudio, videoAudioBufferRef]
  );

  return {
    vimeoUrl,
    vimeoPreparing,
    vimeoMedia,
    vimeoError,
    vimeoAnalyzing,
    vimeoVideoRef,
    vimeoAudioContextRef,
    vimeoSourceRef,
    vimeoScriptProcessorRef,
    setVimeoUrl,
    setVimeoPreparing,
    setVimeoMedia,
    setVimeoError,
    setVimeoAnalyzing,
    loadVimeoVideo,
    stopVimeoAnalysis,
    startVimeoAnalysis,
    cleanupVimeoAudio,
  };
}

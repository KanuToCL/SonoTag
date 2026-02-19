import { useCallback, useEffect, useRef, useState } from "react";
import type { PrepareMediaResponse } from "../types";
import { prepareMedia, cleanupVideo } from "../api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseSoundCloudParams {
  classifySoundcloudBuffer: (sampleRate: number) => Promise<void>;
  bufferSeconds: number;
  /** Shared refs owned by App, also used by useClassification */
  soundcloudAudioBufferRef: React.MutableRefObject<Float32Array[]>;
  soundcloudAnalyzingRef: React.MutableRefObject<boolean>;
  soundcloudAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  bufferSecondsRef: React.MutableRefObject<number>;
}

export interface UseSoundCloudReturn {
  soundcloudUrl: string;
  soundcloudPreparing: boolean;
  soundcloudMedia: PrepareMediaResponse | null;
  soundcloudError: string;
  soundcloudAnalyzing: boolean;
  scIsPlaying: boolean;
  scCurrentTime: number;
  scDuration: number;
  scVolume: number;
  scIsSeeking: boolean;
  soundcloudAudioRef: React.RefObject<HTMLAudioElement | null>;
  soundcloudAudioContextRef: React.MutableRefObject<AudioContext | null>;
  soundcloudSourceRef: React.MutableRefObject<MediaElementAudioSourceNode | null>;
  soundcloudScriptProcessorRef: React.MutableRefObject<ScriptProcessorNode | null>;
  setSoundcloudUrl: React.Dispatch<React.SetStateAction<string>>;
  setSoundcloudPreparing: React.Dispatch<React.SetStateAction<boolean>>;
  setSoundcloudMedia: React.Dispatch<React.SetStateAction<PrepareMediaResponse | null>>;
  setSoundcloudError: React.Dispatch<React.SetStateAction<string>>;
  setSoundcloudAnalyzing: React.Dispatch<React.SetStateAction<boolean>>;
  setScIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setScCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  setScDuration: React.Dispatch<React.SetStateAction<number>>;
  setScVolume: React.Dispatch<React.SetStateAction<number>>;
  setScIsSeeking: React.Dispatch<React.SetStateAction<boolean>>;
  loadSoundCloudMedia: (url: string) => Promise<void>;
  stopSoundCloudAnalysis: () => void;
  startSoundCloudAnalysis: () => void;
  cleanupSoundCloudAudio: () => void;
  closeSoundCloud: () => void;
  scPlayPause: () => void;
  scSeek: (time: number) => void;
  scSeekStart: () => void;
  scSeekEnd: (time: number) => void;
  scVolumeToggle: () => void;
  scVolumeChange: (vol: number) => void;
  scOnPlay: () => void;
  scOnPause: () => void;
  scOnEnded: () => void;
  scOnTimeUpdate: () => void;
  scOnLoadedMetadata: () => void;
  scOnError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSoundCloud({
  classifySoundcloudBuffer,
  bufferSeconds,
  soundcloudAudioBufferRef,
  soundcloudAnalyzingRef,
  soundcloudAnalyserRef,
  bufferSecondsRef,
}: UseSoundCloudParams): UseSoundCloudReturn {
  const [soundcloudUrl, setSoundcloudUrl] = useState<string>("");
  const [soundcloudPreparing, setSoundcloudPreparing] = useState<boolean>(false);
  const [soundcloudMedia, setSoundcloudMedia] = useState<PrepareMediaResponse | null>(null);
  const [soundcloudError, setSoundcloudError] = useState<string>("");
  const [soundcloudAnalyzing, setSoundcloudAnalyzing] = useState<boolean>(false);

  const [scIsPlaying, setScIsPlaying] = useState(false);
  const [scCurrentTime, setScCurrentTime] = useState(0);
  const [scDuration, setScDuration] = useState(0);
  const [scVolume, setScVolume] = useState(1);
  const [scIsSeeking, setScIsSeeking] = useState(false);

  const soundcloudAudioRef = useRef<HTMLAudioElement>(null);
  const soundcloudAudioContextRef = useRef<AudioContext | null>(null);
  const soundcloudSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const soundcloudScriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Sync analyzing state → shared ref
  useEffect(() => {
    soundcloudAnalyzingRef.current = soundcloudAnalyzing;
  }, [soundcloudAnalyzing, soundcloudAnalyzingRef]);

  const cleanupSoundCloudAudio = useCallback(() => {
    if (soundcloudScriptProcessorRef.current) { soundcloudScriptProcessorRef.current.disconnect(); soundcloudScriptProcessorRef.current = null; }
    if (soundcloudSourceRef.current) { soundcloudSourceRef.current.disconnect(); soundcloudSourceRef.current = null; }
    if (soundcloudAnalyserRef.current) { soundcloudAnalyserRef.current.disconnect(); soundcloudAnalyserRef.current = null; }
    if (soundcloudAudioContextRef.current) { soundcloudAudioContextRef.current.close(); soundcloudAudioContextRef.current = null; }
  }, [soundcloudAnalyserRef]);

  const stopSoundCloudAnalysis = useCallback(() => {
    soundcloudAnalyzingRef.current = false;
    setSoundcloudAnalyzing(false);
    soundcloudAudioBufferRef.current = [];
  }, [soundcloudAnalyzingRef, soundcloudAudioBufferRef]);

  const closeSoundCloud = useCallback(() => {
    setSoundcloudAnalyzing(false);
    soundcloudAudioBufferRef.current = [];
    cleanupSoundCloudAudio();
    if (soundcloudMedia) cleanupVideo(soundcloudMedia.video_id).catch(() => {});
    setSoundcloudMedia(null);
  }, [soundcloudMedia, cleanupSoundCloudAudio, soundcloudAudioBufferRef]);

  const startSoundCloudAnalysis = useCallback(() => {
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

    setSoundcloudAnalyzing(true);
  }, [classifySoundcloudBuffer, soundcloudAnalyzingRef, soundcloudAudioBufferRef, soundcloudAnalyserRef, bufferSecondsRef]);

  const loadSoundCloudMedia = useCallback(
    async (url: string): Promise<void> => {
      setSoundcloudPreparing(true);
      setSoundcloudError("");
      try {
        const result = await prepareMedia(url);
        setSoundcloudMedia(result);
        setSoundcloudUrl(url);
        cleanupSoundCloudAudio();
        soundcloudAudioBufferRef.current = [];
        setSoundcloudAnalyzing(false);
      } catch (err) {
        setSoundcloudError(err instanceof Error ? err.message : "Failed");
      } finally {
        setSoundcloudPreparing(false);
      }
    },
    [cleanupSoundCloudAudio, soundcloudAudioBufferRef]
  );

  // SC player callbacks
  const scOnPlay = useCallback(() => {
    setScIsPlaying(true);
    startSoundCloudAnalysis();
  }, [startSoundCloudAnalysis]);

  const scOnPause = useCallback(() => {
    setScIsPlaying(false);
    soundcloudAnalyzingRef.current = false;
    setSoundcloudAnalyzing(false);
    soundcloudAudioBufferRef.current = [];
  }, [soundcloudAnalyzingRef, soundcloudAudioBufferRef]);

  const scOnEnded = useCallback(() => {
    setScIsPlaying(false);
    soundcloudAnalyzingRef.current = false;
    setSoundcloudAnalyzing(false);
    soundcloudAudioBufferRef.current = [];
  }, [soundcloudAnalyzingRef, soundcloudAudioBufferRef]);

  const scOnTimeUpdate = useCallback(() => {
    if (!scIsSeeking && soundcloudAudioRef.current) {
      setScCurrentTime(soundcloudAudioRef.current.currentTime);
    }
  }, [scIsSeeking]);

  const scOnLoadedMetadata = useCallback(() => {
    if (soundcloudAudioRef.current) setScDuration(soundcloudAudioRef.current.duration);
  }, []);

  const scOnError = useCallback(() => {
    setSoundcloudError("Audio playback failed. The track may be paywalled (SoundCloud Go+).");
  }, []);

  const scPlayPause = useCallback(() => {
    if (!soundcloudAudioRef.current) return;
    if (scIsPlaying) soundcloudAudioRef.current.pause();
    else soundcloudAudioRef.current.play();
  }, [scIsPlaying]);

  const scSeek = useCallback((time: number) => setScCurrentTime(time), []);
  const scSeekStart = useCallback(() => setScIsSeeking(true), []);
  const scSeekEnd = useCallback((time: number) => {
    if (soundcloudAudioRef.current) soundcloudAudioRef.current.currentTime = time;
    setScIsSeeking(false);
  }, []);

  const scVolumeToggle = useCallback(() => {
    if (!soundcloudAudioRef.current) return;
    const newVol = scVolume > 0 ? 0 : 1;
    soundcloudAudioRef.current.volume = newVol;
    setScVolume(newVol);
  }, [scVolume]);

  const scVolumeChange = useCallback((vol: number) => {
    setScVolume(vol);
    if (soundcloudAudioRef.current) soundcloudAudioRef.current.volume = vol;
  }, []);

  return {
    soundcloudUrl, soundcloudPreparing, soundcloudMedia, soundcloudError, soundcloudAnalyzing,
    scIsPlaying, scCurrentTime, scDuration, scVolume, scIsSeeking,
    soundcloudAudioRef, soundcloudAudioContextRef, soundcloudSourceRef, soundcloudScriptProcessorRef,
    setSoundcloudUrl, setSoundcloudPreparing, setSoundcloudMedia, setSoundcloudError, setSoundcloudAnalyzing,
    setScIsPlaying, setScCurrentTime, setScDuration, setScVolume, setScIsSeeking,
    loadSoundCloudMedia, stopSoundCloudAnalysis, startSoundCloudAnalysis, cleanupSoundCloudAudio, closeSoundCloud,
    scPlayPause, scSeek, scSeekStart, scSeekEnd, scVolumeToggle, scVolumeChange,
    scOnPlay, scOnPause, scOnEnded, scOnTimeUpdate, scOnLoadedMetadata, scOnError,
  };
}

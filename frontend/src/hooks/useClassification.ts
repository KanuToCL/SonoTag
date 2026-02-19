import { useCallback, useEffect, useRef, useState } from "react";
import { classifyAudioLocal } from "../api";
import { audioSamplesToWavBlob, resampleAudio } from "../utils/audio";
import { TARGET_SAMPLE_RATE, CLASSIFY_INTERVAL_MS } from "../constants/audio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimingBreakdown {
  read_ms: number;
  decode_ms: number;
  tensor_ms: number;
  audio_embed_ms: number;
  similarity_ms: number;
  total_ms: number;
}

export interface UseClassificationParams {
  prompts: string[];
  normalizeScores: boolean;
  audioBufferRef: React.MutableRefObject<Float32Array[]>;
  videoAudioBufferRef: React.MutableRefObject<Float32Array[]>;
  soundcloudAudioBufferRef: React.MutableRefObject<Float32Array[]>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  videoAnalyserRef?: React.MutableRefObject<AnalyserNode | null>;
  soundcloudAnalyserRef?: React.MutableRefObject<AnalyserNode | null>;
  youtubeAnalyzingRef: React.MutableRefObject<boolean>;
  soundcloudAnalyzingRef: React.MutableRefObject<boolean>;
}

export interface UseClassificationReturn {
  // State
  classificationScores: Record<string, number>;
  frameScores: Record<string, number[]>;
  isClassifying: boolean;
  classifyError: string;
  lastInferenceTime: number | null;
  inferenceCount: number;
  timingBreakdown: TimingBreakdown | null;
  // Stats
  scoreHistory: Record<string, number[]>;
  topRankedHistory: string[];
  sessionStartTime: number | null;
  totalInferences: number;
  // Refs (exposed for draw loop)
  isClassifyingRef: React.MutableRefObject<boolean>;
  classificationScoresRef: React.MutableRefObject<Record<string, number>>;
  frameScoresRef: React.MutableRefObject<Record<string, number[]>>;
  promptsRef: React.MutableRefObject<string[]>;
  normalizeScoresRef: React.MutableRefObject<boolean>;
  lastClassifyTimeRef: React.MutableRefObject<number>;
  // Callbacks
  classifyCurrentBuffer: () => Promise<void>;
  classifyVideoBuffer: (sampleRateVideo: number) => Promise<void>;
  classifySoundcloudBuffer: (sr: number) => Promise<void>;
  clearStats: () => void;
  // Setters needed by App for external control
  setClassificationScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setFrameScores: React.Dispatch<React.SetStateAction<Record<string, number[]>>>;
  setScoreHistory: React.Dispatch<React.SetStateAction<Record<string, number[]>>>;
  setTopRankedHistory: React.Dispatch<React.SetStateAction<string[]>>;
  setTotalInferences: React.Dispatch<React.SetStateAction<number>>;
  setInferenceCount: React.Dispatch<React.SetStateAction<number>>;
  setSessionStartTime: React.Dispatch<React.SetStateAction<number | null>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useClassification({
  prompts,
  normalizeScores,
  audioBufferRef,
  videoAudioBufferRef,
  soundcloudAudioBufferRef,
  audioContextRef,
  youtubeAnalyzingRef,
  soundcloudAnalyzingRef,
}: UseClassificationParams): UseClassificationReturn {
  // State
  const [classificationScores, setClassificationScores] = useState<Record<string, number>>({});
  const [frameScores, setFrameScores] = useState<Record<string, number[]>>({});
  const [isClassifying, setIsClassifying] = useState<boolean>(false);
  const [classifyError, setClassifyError] = useState<string>("");
  const [lastInferenceTime, setLastInferenceTime] = useState<number | null>(null);
  const [inferenceCount, setInferenceCount] = useState<number>(0);
  const [timingBreakdown, setTimingBreakdown] = useState<TimingBreakdown | null>(null);

  // Stats tracking
  const [scoreHistory, setScoreHistory] = useState<Record<string, number[]>>({});
  const [topRankedHistory, setTopRankedHistory] = useState<string[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [totalInferences, setTotalInferences] = useState<number>(0);

  // Refs
  const isClassifyingRef = useRef<boolean>(false);
  const classificationScoresRef = useRef<Record<string, number>>({});
  const frameScoresRef = useRef<Record<string, number[]>>({});
  const promptsRef = useRef<string[]>(prompts);
  const normalizeScoresRef = useRef<boolean>(normalizeScores);
  const lastClassifyTimeRef = useRef<number>(0);

  // Ref sync effects
  useEffect(() => {
    classificationScoresRef.current = classificationScores;
  }, [classificationScores]);

  useEffect(() => {
    frameScoresRef.current = frameScores;
  }, [frameScores]);

  useEffect(() => {
    promptsRef.current = prompts;
  }, [prompts]);

  useEffect(() => {
    normalizeScoresRef.current = normalizeScores;
  }, [normalizeScores]);

  // Shared helper: process classification result and update stats
  const processResult = useCallback(
    (result: { global_scores: Record<string, number>; frame_scores: Record<string, number[]>; timing?: { read_ms: number; decode_ms: number; tensor_ms: number; local_similarity_ms: number; total_ms: number } }, elapsedMs: number) => {
      classificationScoresRef.current = result.global_scores;
      frameScoresRef.current = result.frame_scores;
      setClassificationScores(result.global_scores);
      setFrameScores(result.frame_scores);

      setScoreHistory((prev) => {
        const updated = { ...prev };
        for (const [label, score] of Object.entries(result.global_scores)) {
          if (!updated[label]) updated[label] = [];
          updated[label].push(score);
        }
        return updated;
      });

      const topLabel = Object.entries(result.global_scores).reduce(
        (best, [label, score]) => (score > best.score ? { label, score } : best),
        { label: "", score: -1 }
      ).label;
      if (topLabel) setTopRankedHistory((prev) => [...prev, topLabel]);

      setTotalInferences((prev) => prev + 1);
      setSessionStartTime((prev) => prev ?? Date.now());
      setLastInferenceTime(elapsedMs);
      setInferenceCount((prev) => prev + 1);

      if (result.timing) {
        setTimingBreakdown({
          read_ms: result.timing.read_ms,
          decode_ms: result.timing.decode_ms,
          tensor_ms: result.timing.tensor_ms,
          audio_embed_ms: result.timing.local_similarity_ms,
          similarity_ms: 0,
          total_ms: result.timing.total_ms,
        });
      }
      setClassifyError("");
    },
    []
  );

  // classifyVideoBuffer
  const classifyVideoBuffer = useCallback(
    async (sampleRateVideo: number): Promise<void> => {
      if (isClassifyingRef.current || videoAudioBufferRef.current.length === 0 || !youtubeAnalyzingRef.current) {
        if (!youtubeAnalyzingRef.current) {
          videoAudioBufferRef.current = [];
        }
        return;
      }

      isClassifyingRef.current = true;
      setIsClassifying(true);
      const startTime = performance.now();

      try {
        const totalLength = videoAudioBufferRef.current.reduce((sum, arr) => sum + arr.length, 0);
        const allSamples = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of videoAudioBufferRef.current) {
          allSamples.set(chunk, offset);
          offset += chunk.length;
        }
        videoAudioBufferRef.current = [];

        const resampledSamples =
          sampleRateVideo !== TARGET_SAMPLE_RATE
            ? resampleAudio(allSamples, sampleRateVideo, TARGET_SAMPLE_RATE)
            : allSamples;

        const wavBlob = audioSamplesToWavBlob(resampledSamples, TARGET_SAMPLE_RATE);
        const currentPrompts = promptsRef.current;
        const result = await classifyAudioLocal(wavBlob, currentPrompts, "unbiased");

        processResult(result, performance.now() - startTime);
      } catch (err) {
        console.error("Video classification failed:", err);
        setClassifyError(err instanceof Error ? err.message : "Classification failed");
      } finally {
        isClassifyingRef.current = false;
        setIsClassifying(false);
      }
    },
    [videoAudioBufferRef, youtubeAnalyzingRef, processResult]
  );

  // classifySoundcloudBuffer
  const classifySoundcloudBuffer = useCallback(
    async (sr: number): Promise<void> => {
      if (isClassifyingRef.current || soundcloudAudioBufferRef.current.length === 0 || !soundcloudAnalyzingRef.current) {
        if (!soundcloudAnalyzingRef.current) {
          soundcloudAudioBufferRef.current = [];
        }
        return;
      }

      isClassifyingRef.current = true;
      setIsClassifying(true);
      const startTime = performance.now();

      try {
        const totalLength = soundcloudAudioBufferRef.current.reduce((sum, arr) => sum + arr.length, 0);
        const allSamples = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of soundcloudAudioBufferRef.current) {
          allSamples.set(chunk, offset);
          offset += chunk.length;
        }
        soundcloudAudioBufferRef.current = [];

        const resampledSamples =
          sr !== TARGET_SAMPLE_RATE ? resampleAudio(allSamples, sr, TARGET_SAMPLE_RATE) : allSamples;

        const wavBlob = audioSamplesToWavBlob(resampledSamples, TARGET_SAMPLE_RATE);
        const currentPrompts = promptsRef.current;
        const result = await classifyAudioLocal(wavBlob, currentPrompts, "unbiased");

        processResult(result, performance.now() - startTime);
      } catch (err) {
        console.error("SoundCloud classification failed:", err);
        setClassifyError(err instanceof Error ? err.message : "Classification failed");
      } finally {
        isClassifyingRef.current = false;
        setIsClassifying(false);
      }
    },
    [soundcloudAudioBufferRef, soundcloudAnalyzingRef, processResult]
  );

  // classifyCurrentBuffer (microphone)
  const classifyCurrentBuffer = useCallback(async (): Promise<void> => {
    if (isClassifyingRef.current || audioBufferRef.current.length === 0) {
      return;
    }

    const now = Date.now();
    if (now - lastClassifyTimeRef.current < CLASSIFY_INTERVAL_MS) {
      return;
    }

    isClassifyingRef.current = true;
    setIsClassifying(true);
    lastClassifyTimeRef.current = now;
    const startTime = performance.now();

    try {
      const totalLength = audioBufferRef.current.reduce((sum, arr) => sum + arr.length, 0);
      const allSamples = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of audioBufferRef.current) {
        allSamples.set(chunk, offset);
        offset += chunk.length;
      }
      audioBufferRef.current = [];

      const currentSampleRate = audioContextRef.current?.sampleRate || 48000;
      const resampledSamples =
        currentSampleRate !== TARGET_SAMPLE_RATE
          ? resampleAudio(allSamples, currentSampleRate, TARGET_SAMPLE_RATE)
          : allSamples;

      const wavBlob = audioSamplesToWavBlob(resampledSamples, TARGET_SAMPLE_RATE);
      const currentPrompts = promptsRef.current;
      const result = await classifyAudioLocal(wavBlob, currentPrompts, "unbiased");

      processResult(result, performance.now() - startTime);
    } catch (err) {
      console.error("Classification failed:", err);
      setClassifyError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      isClassifyingRef.current = false;
      setIsClassifying(false);
    }
  }, [audioBufferRef, audioContextRef, processResult]);

  // clearStats
  const clearStats = useCallback(() => {
    setClassificationScores({});
    classificationScoresRef.current = {};
    setFrameScores({});
    frameScoresRef.current = {};
    setScoreHistory({});
    setTopRankedHistory([]);
    setTotalInferences(0);
    setInferenceCount(0);
    setSessionStartTime(null);
  }, []);

  return {
    classificationScores,
    frameScores,
    isClassifying,
    classifyError,
    lastInferenceTime,
    inferenceCount,
    timingBreakdown,
    scoreHistory,
    topRankedHistory,
    sessionStartTime,
    totalInferences,
    isClassifyingRef,
    classificationScoresRef,
    frameScoresRef,
    promptsRef,
    normalizeScoresRef,
    lastClassifyTimeRef,
    classifyCurrentBuffer,
    classifyVideoBuffer,
    classifySoundcloudBuffer,
    clearStats,
    setClassificationScores,
    setFrameScores,
    setScoreHistory,
    setTopRankedHistory,
    setTotalInferences,
    setInferenceCount,
    setSessionStartTime,
  };
}

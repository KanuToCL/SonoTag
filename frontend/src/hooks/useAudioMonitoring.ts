import { useCallback, useEffect, useRef, useState } from "react";
import type { MonitoringStatus } from "../types/app";
import type { FreqRange } from "../types";
import type { ColorTheme } from "../types/themes";
import { COLOR_THEMES } from "../types/themes";
import { clamp } from "../utils/math";
import { getColorFromStops, heatColor } from "../utils/color";
import { FRAME_SKIP_MAP } from "../constants/audio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseAudioMonitoringParams {
  classifyCurrentBuffer: () => Promise<void>;
  selectedDeviceId: string;
  permissionState: "unknown" | "granted" | "denied";
  requestPermission: () => Promise<boolean>;
  bufferSeconds: number;
  slideSpeed: number;
  freqRange: FreqRange;
  nyquist: number;
  colorThemeRef: React.MutableRefObject<ColorTheme>;
  classificationScoresRef: React.MutableRefObject<Record<string, number>>;
  promptsRef: React.MutableRefObject<string[]>;
  normalizeScoresRef: React.MutableRefObject<boolean>;
  /** Shared ref owned by App, also used by useClassification */
  audioBufferRef: React.MutableRefObject<Float32Array[]>;
}

export interface UseAudioMonitoringReturn {
  status: MonitoringStatus;
  level: number;
  error: string;
  sampleRate: number | null;
  spectrogramRef: React.RefObject<HTMLCanvasElement | null>;
  heatmapRef: React.RefObject<HTMLCanvasElement | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAudioMonitoring({
  classifyCurrentBuffer,
  selectedDeviceId,
  permissionState,
  requestPermission,
  bufferSeconds,
  slideSpeed,
  freqRange,
  nyquist,
  colorThemeRef,
  classificationScoresRef,
  promptsRef,
  normalizeScoresRef,
  audioBufferRef,
}: UseAudioMonitoringParams): UseAudioMonitoringReturn {
  const [status, setStatus] = useState<MonitoringStatus>("idle");
  const [level, setLevel] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [sampleRate, setSampleRate] = useState<number | null>(null);

  const spectrogramRef = useRef<HTMLCanvasElement>(null);
  const heatmapRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const frameCounterRef = useRef<number>(0);
  const heatmapFramesSinceUpdateRef = useRef<number>(0);
  const prevScoresIdentityRef = useRef<Record<string, number> | null>(null);

  const stopMonitoring = useCallback(async (): Promise<void> => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((track) => track.stop()); streamRef.current = null; }
    if (audioContextRef.current) { await audioContextRef.current.close(); audioContextRef.current = null; }
    setStatus("stopped");
    setLevel(0);
  }, []);

  const startMonitoring = useCallback(async (): Promise<void> => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser does not support audio capture.");
      return;
    }

    const granted = permissionState === "granted" ? true : await requestPermission();
    if (!granted) return;

    const constraints: MediaStreamConstraints =
      selectedDeviceId && selectedDeviceId !== "default"
        ? { audio: { deviceId: { exact: selectedDeviceId } } }
        : { audio: true };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await stopMonitoring();

      const audioContext = new AudioContext();
      await audioContext.resume();

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferSize = 4096;
      const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

      const maxBufferSamples = audioContext.sampleRate * bufferSeconds;
      let currentBufferSamples = 0;

      scriptProcessor.onaudioprocess = (event: AudioProcessingEvent): void => {
        const inputData = event.inputBuffer.getChannelData(0);
        const samples = new Float32Array(inputData);
        audioBufferRef.current.push(samples);
        currentBufferSamples += samples.length;
        if (currentBufferSamples >= maxBufferSamples) {
          currentBufferSamples = 0;
          classifyCurrentBuffer();
        }
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      scriptProcessorRef.current = scriptProcessor;

      const bufferLength = analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufferLength);
      const timeData = new Uint8Array(analyser.fftSize);

      const spectrogramCanvas = spectrogramRef.current;
      const spectrogramContext = spectrogramCanvas ? spectrogramCanvas.getContext("2d") : null;
      const heatmapCanvas = heatmapRef.current;
      const heatmapContext = heatmapCanvas ? heatmapCanvas.getContext("2d") : null;

      if (spectrogramContext && spectrogramCanvas) {
        spectrogramContext.imageSmoothingEnabled = false;
        spectrogramContext.fillStyle = "#1a120d";
        spectrogramContext.fillRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);
      }

      if (heatmapContext && heatmapCanvas) {
        heatmapContext.imageSmoothingEnabled = false;
        heatmapContext.fillStyle = "#1a120d";
        heatmapContext.fillRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
      }

      const draw = (): void => {
        if (!analyserRef.current || !spectrogramContext || !spectrogramCanvas || !heatmapContext || !heatmapCanvas) return;

        frameCounterRef.current += 1;
        const frameSkip = FRAME_SKIP_MAP[slideSpeed] || 1;
        const shouldDraw = frameCounterRef.current % frameSkip === 0;

        analyser.getByteTimeDomainData(timeData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i += 1) {
          const value = (timeData[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / timeData.length);
        setLevel(rms);

        if (shouldDraw) {
          analyser.getByteFrequencyData(freqData);

          spectrogramContext.drawImage(spectrogramCanvas, -1, 0);
          const range = freqRange.max - freqRange.min || 1;
          for (let y = 0; y < spectrogramCanvas.height; y += 1) {
            const freq = freqRange.min + (y / spectrogramCanvas.height) * range;
            const index = Math.floor((freq / nyquist) * bufferLength);
            const safeIndex = clamp(index, 0, bufferLength - 1);
            const intensity = freqData[safeIndex] / 255;
            spectrogramContext.fillStyle = heatColor(intensity);
            spectrogramContext.fillRect(spectrogramCanvas.width - 1, spectrogramCanvas.height - y - 1, 1, 1);
          }

          heatmapContext.drawImage(heatmapCanvas, -1, 0);

          const currentPrompts = promptsRef.current;
          const currentScores = classificationScoresRef.current;
          const useNormalization = normalizeScoresRef.current;
          const rowHeight = heatmapCanvas.height / currentPrompts.length;

          heatmapFramesSinceUpdateRef.current += 1;

          let displayValues: Record<string, number> = {};
          if (Object.keys(currentScores).length > 0) {
            if (useNormalization) {
              const values = Object.values(currentScores);
              const min = Math.min(...values);
              const max = Math.max(...values);
              const range = max - min || 1;
              for (const [key, val] of Object.entries(currentScores)) {
                displayValues[key] = (val - min) / range;
              }
            } else {
              for (const [key, val] of Object.entries(currentScores)) {
                displayValues[key] = Math.max(0, Math.min(1, val));
              }
            }
          }

          if (currentScores !== prevScoresIdentityRef.current && Object.keys(currentScores).length > 0) {
            const backfillPixels = Math.min(heatmapFramesSinceUpdateRef.current, heatmapCanvas.width - 1);

            if (backfillPixels > 1) {
              currentPrompts.forEach((prompt, row) => {
                const value = displayValues[prompt] ?? 0;
                const themeStops = COLOR_THEMES[colorThemeRef.current].stops;
                heatmapContext.fillStyle = getColorFromStops(value, themeStops);
                heatmapContext.fillRect(heatmapCanvas.width - backfillPixels, row * rowHeight, backfillPixels, rowHeight);
              });
            }

            prevScoresIdentityRef.current = currentScores;
            heatmapFramesSinceUpdateRef.current = 0;
          }

          currentPrompts.forEach((prompt, row) => {
            const value = displayValues[prompt] ?? 0;
            const themeStops = COLOR_THEMES[colorThemeRef.current].stops;
            heatmapContext.fillStyle = getColorFromStops(value, themeStops);
            heatmapContext.fillRect(heatmapCanvas.width - 1, row * rowHeight, 1, rowHeight);
          });
        }

        rafRef.current = requestAnimationFrame(draw);
      };

      analyserRef.current = analyser;
      sourceRef.current = source;
      audioContextRef.current = audioContext;
      streamRef.current = stream;
      setSampleRate(audioContext.sampleRate);
      setStatus("running");
      rafRef.current = requestAnimationFrame(draw);
    } catch {
      setError("Unable to start microphone capture.");
    }
  }, [
    permissionState, requestPermission, selectedDeviceId, stopMonitoring,
    bufferSeconds, classifyCurrentBuffer, slideSpeed,
    freqRange.min, freqRange.max, nyquist,
    colorThemeRef, classificationScoresRef, promptsRef, normalizeScoresRef, audioBufferRef,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    status, level, error, sampleRate,
    spectrogramRef, heatmapRef, analyserRef, audioContextRef,
    startMonitoring, stopMonitoring,
  };
}

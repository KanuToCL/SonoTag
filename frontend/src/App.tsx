import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type {
  BackendInfo,
  BrowserInfo,
  FreqRange,
  HeatColorStop,
  ModelStatusResponse,
  Recommendation,
} from "./types";
import { classifyAudio, audioSamplesToWavBlob, resampleAudio, getModelStatus } from "./api";

// =============================================================================
// Types & Interfaces (local to this component)
// =============================================================================

type PermissionState = "unknown" | "granted" | "denied";
type MonitoringStatus = "idle" | "running" | "stopped";

// =============================================================================
// Constants
// =============================================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Buffer size for audio capture (in seconds) - now configurable
const DEFAULT_BUFFER_SECONDS = 5;
const MIN_BUFFER_SECONDS = 1;
const MAX_BUFFER_SECONDS = 10;
// Target sample rate for FLAM
const TARGET_SAMPLE_RATE = 48000;
// Minimum interval between classification requests (ms) - set to 0 to classify as fast as possible
const CLASSIFY_INTERVAL_MS = 500; // Small cooldown to prevent overlapping requests

// Default prompts for FLAM classification
const DEFAULT_PROMPTS = [
  "speech",
  "music",
  "water drops",
  "screaming",
  "silence",
  "dog barking",
  "keyboard typing",
  "footsteps",
  "door closing",
  "rain",
];

const HEAT_COLORS: HeatColorStop[] = [
  { stop: 0, color: [26, 20, 16] },
  { stop: 0.3, color: [88, 52, 29] },
  { stop: 0.55, color: [156, 88, 45] },
  { stop: 0.78, color: [214, 142, 72] },
  { stop: 1, color: [244, 219, 173] },
];

// =============================================================================
// Utility Functions
// =============================================================================

const fallbackRecommendation = (cores: number, memoryGb: number): number => {
  if (cores <= 4 || memoryGb <= 4) {
    return 10;
  }
  if (cores <= 8 || memoryGb <= 8) {
    return 5;
  }
  return 2;
};

const formatValue = (
  value: string | number | null | undefined,
  suffix?: string
): string => {
  if (value === null || value === undefined || value === "") {
    return "unknown";
  }
  return `${value}${suffix || ""}`;
};

const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes || Number.isNaN(bytes)) {
    return "unknown";
  }
  const gb = bytes / 1024 / 1024 / 1024;
  return `${gb.toFixed(1)} GB`;
};

const formatHz = (value: number, withUnit = false): string => {
  if (!Number.isFinite(value)) {
    return "--";
  }
  if (value >= 1000) {
    const rounded = Math.round(value / 100) / 10;
    return withUnit ? `${rounded} kHz` : `${rounded}k`;
  }
  return withUnit ? `${Math.round(value)} Hz` : `${Math.round(value)}`;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const lerp = (start: number, end: number, amount: number): number =>
  start + (end - start) * amount;

const heatColor = (value: number): string => {
  const clamped = Math.min(1, Math.max(0, value));
  let start = HEAT_COLORS[0];
  let end = HEAT_COLORS[HEAT_COLORS.length - 1];

  for (let i = 0; i < HEAT_COLORS.length - 1; i += 1) {
    const current = HEAT_COLORS[i];
    const next = HEAT_COLORS[i + 1];
    if (clamped >= current.stop && clamped <= next.stop) {
      start = current;
      end = next;
      break;
    }
  }

  const range = end.stop - start.stop || 1;
  const t = (clamped - start.stop) / range;
  const r = Math.round(lerp(start.color[0], end.color[0], t));
  const g = Math.round(lerp(start.color[1], end.color[1], t));
  const b = Math.round(lerp(start.color[2], end.color[2], t));

  return `rgb(${r}, ${g}, ${b})`;
};

// =============================================================================
// App Component
// =============================================================================

function App() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [permissionState, setPermissionState] =
    useState<PermissionState>("unknown");
  const [status, setStatus] = useState<MonitoringStatus>("idle");
  const [level, setLevel] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);
  const [backendError, setBackendError] = useState<string>("");
  const [recommendation, setRecommendation] = useState<Recommendation>({
    buffer: null,
    rationale: "",
    source: "",
  });
  const [sampleRate, setSampleRate] = useState<number | null>(null);
  const [freqMin, setFreqMin] = useState<number>(0);
  const [freqMax, setFreqMax] = useState<number>(12000);

  // FLAM inference state
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [prompts, setPrompts] = useState<string[]>(DEFAULT_PROMPTS);
  const [promptInput, setPromptInput] = useState<string>(DEFAULT_PROMPTS.join(", "));
  const [classificationScores, setClassificationScores] = useState<Record<string, number>>({});
  const [isClassifying, setIsClassifying] = useState<boolean>(false);
  const [classifyError, setClassifyError] = useState<string>("");
  const [bufferSeconds, setBufferSeconds] = useState<number>(DEFAULT_BUFFER_SECONDS);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const spectrogramRef = useRef<HTMLCanvasElement>(null);
  const heatmapRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  // Audio buffer for classification
  const audioBufferRef = useRef<Float32Array[]>([]);
  const lastClassifyTimeRef = useRef<number>(0);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Ref to hold current classification scores for draw loop
  const classificationScoresRef = useRef<Record<string, number>>({});
  const promptsRef = useRef<string[]>(DEFAULT_PROMPTS);

  // Inference timing
  const [lastInferenceTime, setLastInferenceTime] = useState<number | null>(null);
  const [inferenceCount, setInferenceCount] = useState<number>(0);
  const [timingBreakdown, setTimingBreakdown] = useState<{
    read_ms: number;
    decode_ms: number;
    tensor_ms: number;
    audio_embed_ms: number;
    similarity_ms: number;
    total_ms: number;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Derived Values
  // ---------------------------------------------------------------------------
  const browserInfo: BrowserInfo = useMemo(
    () => ({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0,
      language: navigator.language,
    }),
    []
  );

  const nyquist = sampleRate ? sampleRate / 2 : 24000;

  const freqRange: FreqRange = useMemo(() => {
    const min = clamp(Number(freqMin) || 0, 0, nyquist);
    const maxCandidate = Number(freqMax) || nyquist;
    const max = clamp(maxCandidate, 0, nyquist);
    const safeMax = max <= min ? Math.min(nyquist, min + 100) : max;
    return { min, max: safeMax };
  }, [freqMax, freqMin, nyquist]);

  const freqAxisLabels = useMemo(() => {
    const steps = 4;
    const labels: string[] = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const value = freqRange.max - t * (freqRange.max - freqRange.min);
      labels.push(formatHz(value, true));
    }
    return labels;
  }, [freqRange.max, freqRange.min]);

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------
  const handleFreqMinChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = Number(event.target.value);
    setFreqMin(Number.isNaN(value) ? 0 : value);
  };

  const handleFreqMaxChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = Number(event.target.value);
    setFreqMax(Number.isNaN(value) ? nyquist : value);
  };

  const setFullRange = (): void => {
    setFreqMin(0);
    setFreqMax(Math.round(nyquist));
  };

  // ---------------------------------------------------------------------------
  // Device Management
  // ---------------------------------------------------------------------------
  const refreshDevices = useCallback(async (): Promise<void> => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError("Browser does not support device enumeration.");
      return;
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const inputs = allDevices.filter(
        (device) => device.kind === "audioinput"
      );
      setDevices(inputs);
      if (!selectedDeviceId && inputs.length > 0) {
        setSelectedDeviceId(inputs[0].deviceId);
      }
    } catch {
      setError("Failed to enumerate audio devices.");
    }
  }, [selectedDeviceId]);

  // ---------------------------------------------------------------------------
  // Keep refs in sync with state for draw loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    classificationScoresRef.current = classificationScores;
  }, [classificationScores]);

  useEffect(() => {
    promptsRef.current = prompts;
  }, [prompts]);

  // ---------------------------------------------------------------------------
  // Classification Logic
  // ---------------------------------------------------------------------------
  const classifyCurrentBuffer = useCallback(async (): Promise<void> => {
    if (isClassifying || audioBufferRef.current.length === 0) {
      return;
    }

    // Check cooldown
    const now = Date.now();
    if (now - lastClassifyTimeRef.current < CLASSIFY_INTERVAL_MS) {
      return;
    }

    setIsClassifying(true);
    lastClassifyTimeRef.current = now;
    const startTime = performance.now();

    try {
      // Concatenate all buffered samples
      const totalLength = audioBufferRef.current.reduce((sum, arr) => sum + arr.length, 0);
      const allSamples = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of audioBufferRef.current) {
        allSamples.set(chunk, offset);
        offset += chunk.length;
      }

      // Clear buffer for next window
      audioBufferRef.current = [];

      // Resample to 48kHz if needed
      const currentSampleRate = audioContextRef.current?.sampleRate || 48000;
      const resampledSamples = currentSampleRate !== TARGET_SAMPLE_RATE
        ? resampleAudio(allSamples, currentSampleRate, TARGET_SAMPLE_RATE)
        : allSamples;

      // Convert to WAV blob
      const wavBlob = audioSamplesToWavBlob(resampledSamples, TARGET_SAMPLE_RATE);

      // Send to backend
      const result = await classifyAudio(wavBlob, prompts);

      // Update scores and timing
      const elapsedMs = performance.now() - startTime;
      setClassificationScores(result.scores);
      setLastInferenceTime(elapsedMs);
      setInferenceCount((prev) => prev + 1);
      if (result.timing) {
        setTimingBreakdown(result.timing);
      }
      setClassifyError("");
    } catch (err) {
      console.error("Classification failed:", err);
      setClassifyError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setIsClassifying(false);
    }
  }, [isClassifying, prompts]);

  // ---------------------------------------------------------------------------
  // Audio Monitoring
  // ---------------------------------------------------------------------------
  const stopMonitoring = useCallback(async (): Promise<void> => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setStatus("stopped");
    setLevel(0);
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState("granted");
      stream.getTracks().forEach((track) => track.stop());
      await refreshDevices();
      return true;
    } catch {
      setPermissionState("denied");
      setError("Microphone permission denied.");
      return false;
    }
  };

  const startMonitoring = async (): Promise<void> => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser does not support audio capture.");
      return;
    }

    const granted =
      permissionState === "granted" ? true : await requestPermission();
    if (!granted) {
      return;
    }

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

      // Create ScriptProcessor for audio buffering (deprecated but widely supported)
      const bufferSize = 4096;
      const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

      // Calculate max buffer samples based on bufferSeconds (from state via ref)
      const bufferSecondsRef = { current: bufferSeconds };
      const maxBufferSamples = audioContext.sampleRate * bufferSecondsRef.current;
      let currentBufferSamples = 0;

      scriptProcessor.onaudioprocess = (event: AudioProcessingEvent): void => {
        const inputData = event.inputBuffer.getChannelData(0);
        const samples = new Float32Array(inputData);

        audioBufferRef.current.push(samples);
        currentBufferSamples += samples.length;

        // When buffer is full, trigger classification
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
      const spectrogramContext = spectrogramCanvas
        ? spectrogramCanvas.getContext("2d")
        : null;
      const heatmapCanvas = heatmapRef.current;
      const heatmapContext = heatmapCanvas
        ? heatmapCanvas.getContext("2d")
        : null;

      if (spectrogramContext && spectrogramCanvas) {
        spectrogramContext.imageSmoothingEnabled = false;
        spectrogramContext.fillStyle = "#1a120d";
        spectrogramContext.fillRect(
          0,
          0,
          spectrogramCanvas.width,
          spectrogramCanvas.height
        );
      }

      if (heatmapContext && heatmapCanvas) {
        heatmapContext.imageSmoothingEnabled = false;
        heatmapContext.fillStyle = "#1a120d";
        heatmapContext.fillRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
      }

      const draw = (): void => {
        if (
          !analyserRef.current ||
          !spectrogramContext ||
          !spectrogramCanvas ||
          !heatmapContext ||
          !heatmapCanvas
        ) {
          return;
        }

        analyser.getByteTimeDomainData(timeData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i += 1) {
          const value = (timeData[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / timeData.length);
        setLevel(rms);

        analyser.getByteFrequencyData(freqData);

        spectrogramContext.drawImage(spectrogramCanvas, -1, 0);
        const range = freqRange.max - freqRange.min || 1;
        for (let y = 0; y < spectrogramCanvas.height; y += 1) {
          const freq = freqRange.min + (y / spectrogramCanvas.height) * range;
          const index = Math.floor((freq / nyquist) * bufferLength);
          const safeIndex = clamp(index, 0, bufferLength - 1);
          const intensity = freqData[safeIndex] / 255;
          spectrogramContext.fillStyle = heatColor(intensity);
          spectrogramContext.fillRect(
            spectrogramCanvas.width - 1,
            spectrogramCanvas.height - y - 1,
            1,
            1
          );
        }

        heatmapContext.drawImage(heatmapCanvas, -1, 0);
        const currentPrompts = promptsRef.current;
        const currentScores = classificationScoresRef.current;
        const rowHeight = heatmapCanvas.height / currentPrompts.length;
        currentPrompts.forEach((prompt, row) => {
          // Use classification scores if available, otherwise use placeholder
          const score = currentScores[prompt];
          const value = score !== undefined ? (score + 1) / 2 : 0; // Normalize -1 to 1 range to 0 to 1
          heatmapContext.fillStyle = heatColor(value);
          heatmapContext.fillRect(
            heatmapCanvas.width - 1,
            row * rowHeight,
            1,
            rowHeight
          );
        });

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
  };

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    refreshDevices();
    if (!navigator.mediaDevices?.addEventListener) {
      return undefined;
    }

    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
    };
  }, [refreshDevices]);

  useEffect(() => {
    let cancelled = false;

    const loadBackendInfo = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/system-info`);
        if (!response.ok) {
          throw new Error("Backend not ready");
        }
        const data: BackendInfo = await response.json();
        if (!cancelled) {
          setBackendInfo(data);
        }
      } catch {
        if (!cancelled) {
          setBackendError("Backend unavailable. Using browser-only info.");
        }
      }
    };

    const loadRecommendation = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/recommend-buffer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_latency_s: 2.0 }),
        });
        if (!response.ok) {
          throw new Error("Recommendation not available");
        }
        const data = await response.json();
        if (!cancelled) {
          setRecommendation({
            buffer: data.recommended_buffer_s,
            rationale: data.rationale,
            source: "backend",
          });
        }
      } catch {
        if (!cancelled) {
          const fallback = fallbackRecommendation(
            browserInfo.hardwareConcurrency,
            browserInfo.deviceMemory
          );
          setRecommendation({
            buffer: fallback,
            rationale: "Browser heuristic based on core count and memory.",
            source: "browser",
          });
        }
      }
    };

    const loadModelStatus = async (): Promise<void> => {
      try {
        const status = await getModelStatus();
        if (!cancelled) {
          setModelStatus(status);
        }
      } catch {
        if (!cancelled) {
          setModelStatus(null);
        }
      }
    };

    loadBackendInfo();
    loadRecommendation();
    loadModelStatus();

    return () => {
      cancelled = true;
    };
  }, [browserInfo.deviceMemory, browserInfo.hardwareConcurrency]);

  useEffect(() => {
    if (!sampleRate) {
      return;
    }
    setFreqMin((current) => clamp(Number(current) || 0, 0, nyquist));
    setFreqMax((current) => clamp(Number(current) || nyquist, 0, nyquist));
  }, [nyquist, sampleRate]);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // ---------------------------------------------------------------------------
  // Derived Display Values
  // ---------------------------------------------------------------------------
  const levelPercent = Math.min(100, Math.round(level * 140));
  const hostCpuLogical =
    backendInfo?.cpu?.logical_cores ?? backendInfo?.cpu_count ?? null;
  const hostCpuPhysical = backendInfo?.cpu?.physical_cores ?? null;
  const hostCpuModel = backendInfo?.cpu?.model ?? null;
  const hostMemoryBytes = backendInfo?.memory?.total_bytes ?? null;
  const hostPlatform = backendInfo?.platform ?? null;
  const hostGpus = backendInfo?.gpus ?? [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="page">
      <header className="header">
        <div className="title-block">
          <p className="eyebrow">FLAM Browser</p>
          <h1>Realtime audio console</h1>
          <p className="subhead">
            Monitor microphone input, tune frequency range, and preview
            spectrograms before FLAM inference.
          </p>
        </div>
        <div className="status">
          <span className={`pill ${status}`}>{status}</span>
          <span className="meta">API: {API_BASE_URL}</span>
        </div>
      </header>

      <div className="layout">
        <aside className="panel controls">
          <section className="block">
            <h2>FLAM Prompts</h2>
            <div className="stack">
              <label className="label" htmlFor="prompt-input">
                Sound categories to detect (comma-separated)
              </label>
              <textarea
                id="prompt-input"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                rows={4}
                placeholder="speech, music, water drops, screaming, ..."
                style={{
                  resize: "vertical",
                  fontFamily: "inherit",
                  fontSize: "0.875rem",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #444",
                  background: "#1a1a1a",
                  color: "#eee"
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const parsed = promptInput
                    .split(",")
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0);
                  if (parsed.length > 0) {
                    setPrompts(parsed);
                    setClassificationScores({});
                  }
                }}
              >
                Update prompts
              </button>
              <p className="muted">
                {prompts.length} active prompts
              </p>
              {classifyError && <p className="error">{classifyError}</p>}
            </div>
          </section>

          <section className="block">
            <h2>Inference Settings</h2>
            <div className="stack">
              <label className="label" htmlFor="buffer-slider">
                Audio buffer: {bufferSeconds}s
              </label>
              <input
                id="buffer-slider"
                type="range"
                min={MIN_BUFFER_SECONDS}
                max={MAX_BUFFER_SECONDS}
                step={1}
                value={bufferSeconds}
                onChange={(e) => setBufferSeconds(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div className="info-line" style={{ fontSize: "0.75rem" }}>
                <span>{MIN_BUFFER_SECONDS}s (faster)</span>
                <span>{MAX_BUFFER_SECONDS}s (more context)</span>
              </div>

              <div className="info-line" style={{ marginTop: "0.5rem" }}>
                <span>Model status</span>
                <span style={{ color: modelStatus?.loaded ? "#5ce3a2" : "#ff6b6b" }}>
                  {modelStatus?.loaded ? `ready (${modelStatus.device})` : "loading..."}
                </span>
              </div>

              {lastInferenceTime !== null && (
                <div className="info-line">
                  <span>Last inference</span>
                  <span>{(lastInferenceTime / 1000).toFixed(2)}s</span>
                </div>
              )}

              <div className="info-line">
                <span>Inferences</span>
                <span>{inferenceCount}</span>
              </div>

              {/* Timing breakdown */}
              {timingBreakdown && (
                <div style={{
                  marginTop: "0.75rem",
                  padding: "0.5rem",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "4px",
                  fontSize: "0.75rem"
                }}>
                  <div className="section-label" style={{ marginBottom: "0.25rem" }}>
                    Timing Breakdown (backend)
                  </div>
                  <div className="info-line">
                    <span>Read file</span>
                    <span>{timingBreakdown.read_ms.toFixed(1)}ms</span>
                  </div>
                  <div className="info-line">
                    <span>Decode/resample</span>
                    <span>{timingBreakdown.decode_ms.toFixed(1)}ms</span>
                  </div>
                  <div className="info-line">
                    <span>To tensor</span>
                    <span>{timingBreakdown.tensor_ms.toFixed(1)}ms</span>
                  </div>
                  <div className="info-line">
                    <span style={{ fontWeight: 600 }}>Audio embed (FLAM)</span>
                    <span style={{ fontWeight: 600, color: "#ff7a3d" }}>
                      {timingBreakdown.audio_embed_ms.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="info-line">
                    <span>Similarity</span>
                    <span>{timingBreakdown.similarity_ms.toFixed(1)}ms</span>
                  </div>
                  <div className="info-line" style={{ borderTop: "1px solid #333", paddingTop: "0.25rem", marginTop: "0.25rem" }}>
                    <span style={{ fontWeight: 600 }}>Backend total</span>
                    <span style={{ fontWeight: 600 }}>{timingBreakdown.total_ms.toFixed(1)}ms</span>
                  </div>
                </div>
              )}

              <p className="muted" style={{ marginTop: "0.5rem" }}>
                Shorter buffer = faster updates but less context for FLAM.
                Restart monitoring to apply buffer changes.
              </p>
            </div>
          </section>

          <section className="block">
            <h2>Capture</h2>
            <div className="stack">
              <label className="label" htmlFor="device-select">
                Microphone
              </label>
              <select
                id="device-select"
                value={selectedDeviceId}
                onChange={(event) => setSelectedDeviceId(event.target.value)}
              >
                {devices.length === 0 && <option>No devices found</option>}
                {devices.map((device, index) => (
                  <option key={device.deviceId || index} value={device.deviceId}>
                    {device.label || `Mic ${index + 1}`}
                  </option>
                ))}
              </select>
              <div className="row">
                <button type="button" onClick={requestPermission}>
                  Request access
                </button>
                <button
                  type="button"
                  onClick={refreshDevices}
                  className="ghost"
                >
                  Refresh devices
                </button>
              </div>
              <div className="row">
                <button type="button" onClick={startMonitoring}>
                  Start monitoring
                </button>
                <button type="button" onClick={stopMonitoring} className="ghost">
                  Stop
                </button>
              </div>
              <p className="muted">Permission: {permissionState}</p>
              {error && <p className="error">{error}</p>}
            </div>

            <div className="meter">
              <div className="meter-label">
                Mic level <span>{levelPercent}%</span>
              </div>
              <div className="meter-track">
                <div
                  className="meter-fill"
                  style={{ width: `${levelPercent}%` }}
                />
              </div>
            </div>
          </section>

          <section className="block">
            <h2>System snapshot</h2>
            <div className="stack">
              <div className="section-label">Host (backend)</div>
              <div className="info-line">
                <span>CPU threads</span>
                <span>{formatValue(hostCpuLogical)}</span>
              </div>
              {hostCpuPhysical && (
                <div className="info-line">
                  <span>CPU cores</span>
                  <span>{formatValue(hostCpuPhysical)}</span>
                </div>
              )}
              {hostCpuModel && (
                <div className="info-line">
                  <span>CPU model</span>
                  <span>{hostCpuModel}</span>
                </div>
              )}
              <div className="info-line">
                <span>Memory</span>
                <span>{formatBytes(hostMemoryBytes)}</span>
              </div>
              {hostGpus.length > 0 ? (
                hostGpus.map((gpu, index) => (
                  <div className="info-line" key={`${gpu.name}-${index}`}>
                    <span>{`GPU ${index + 1}`}</span>
                    <span>
                      {gpu?.name || "unknown"}
                      {gpu?.memory_bytes
                        ? ` (${formatBytes(gpu.memory_bytes)})`
                        : ""}
                    </span>
                  </div>
                ))
              ) : (
                <div className="info-line">
                  <span>GPU</span>
                  <span>unknown</span>
                </div>
              )}
              <div className="info-line">
                <span>Host OS</span>
                <span>{formatValue(hostPlatform)}</span>
              </div>
              <div className="info-line">
                <span>Sample rate</span>
                <span>{formatValue(sampleRate, " Hz")}</span>
              </div>

              <div className="section-label">Browser view</div>
              <div className="info-line">
                <span>Reported cores</span>
                <span>{formatValue(browserInfo.hardwareConcurrency)}</span>
              </div>
              <div className="info-line">
                <span>Reported memory</span>
                <span>{formatValue(browserInfo.deviceMemory, " GB")}</span>
              </div>
              <div className="info-line">
                <span>Platform</span>
                <span>{formatValue(browserInfo.platform)}</span>
              </div>
              <div className="info-line">
                <span>Language</span>
                <span>{formatValue(browserInfo.language)}</span>
              </div>
              <p className="note">
                Browser metrics may be capped by privacy settings. Host values
                are more reliable.
              </p>

              <div className="recommendation">
                <div>
                  <p className="label">Recommended buffer</p>
                  <p className="big">
                    {recommendation.buffer
                      ? `${recommendation.buffer}s`
                      : "pending"}
                  </p>
                  <p className="muted">Source: {recommendation.source}</p>
                </div>
                <p className="muted">{recommendation.rationale}</p>
              </div>

              <div className="info-line">
                <span>Backend status</span>
                <span>{backendInfo ? "connected" : "offline"}</span>
              </div>
              {backendError && <p className="muted">{backendError}</p>}
            </div>
          </section>
        </aside>

        <section className="panel visual">
          <div className="figure">
            <div className="figure-header">
              <span className="figure-title">Audio spectrogram</span>
              <span className="figure-meta">live</span>
            </div>
            <div className="figure-controls">
              <span className="control-label">Display range (Hz)</span>
              <div className="freq-controls">
                <input
                  type="number"
                  min="0"
                  max={Math.round(nyquist)}
                  value={Math.round(freqRange.min)}
                  onChange={handleFreqMinChange}
                />
                <span className="control-sep">to</span>
                <input
                  type="number"
                  min="0"
                  max={Math.round(nyquist)}
                  value={Math.round(freqRange.max)}
                  onChange={handleFreqMaxChange}
                />
                <button type="button" className="ghost" onClick={setFullRange}>
                  Full
                </button>
              </div>
              <span className="control-hint">
                Nyquist: {formatHz(nyquist, true)}
              </span>
            </div>
            <div className="spectrogram-frame">
              <div className="freq-axis">
                {freqAxisLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <canvas
                ref={spectrogramRef}
                width={960}
                height={280}
                className="plot-canvas"
              />
            </div>
          </div>

          <div className="figure">
            <div className="figure-header">
              <span className="figure-title">FLAM output</span>
              <span className="figure-meta">
                {isClassifying ? "classifying..." : "live scores"}
              </span>
            </div>

            {/* Numerical scores display */}
            <div className="scores-panel" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "6px",
              marginBottom: "0.75rem",
              fontSize: "0.8rem"
            }}>
              {prompts.map((prompt) => {
                const score = classificationScores[prompt];
                const hasScore = score !== undefined;
                const normalizedScore = hasScore ? (score + 1) / 2 : 0;
                const isTop = hasScore && score === Math.max(...Object.values(classificationScores));
                return (
                  <div
                    key={prompt}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      padding: "0.5rem",
                      background: isTop ? "rgba(255, 122, 61, 0.2)" : "rgba(255,255,255,0.05)",
                      borderRadius: "4px",
                      border: isTop ? "1px solid rgba(255, 122, 61, 0.5)" : "1px solid transparent"
                    }}
                  >
                    <span style={{
                      color: isTop ? "#ff7a3d" : "#aaa",
                      fontWeight: isTop ? 600 : 400
                    }}>
                      {prompt}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{
                        flex: 1,
                        height: "6px",
                        background: "#1a1a1a",
                        borderRadius: "3px",
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${normalizedScore * 100}%`,
                          height: "100%",
                          background: heatColor(normalizedScore),
                          transition: "width 0.3s ease"
                        }} />
                      </div>
                      <span style={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        color: hasScore ? "#fff" : "#555",
                        minWidth: "3.5rem",
                        textAlign: "right"
                      }}>
                        {hasScore ? (score > 0 ? "+" : "") + score.toFixed(3) : "---"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="heatmap-wrap">
              <div className="heatmap-labels">
                {prompts.map((prompt) => (
                  <span key={prompt}>{prompt}</span>
                ))}
              </div>
              <canvas
                ref={heatmapRef}
                width={960}
                height={240}
                className="plot-canvas"
              />
              <div className="heatmap-scale">
                <div className="scale-gradient" />
                <div className="scale-labels">
                  <span>-1</span>
                  <span>0</span>
                  <span>+1</span>
                </div>
              </div>
            </div>
            <p className="figure-note muted">
              {modelStatus?.loaded
                ? `✅ FLAM ready on ${modelStatus.device}`
                : "⏳ Waiting for FLAM model..."}
              {" | "}Buffer: {bufferSeconds}s
              {lastInferenceTime !== null && ` | Last: ${(lastInferenceTime / 1000).toFixed(2)}s`}
              {inferenceCount > 0 && ` | #${inferenceCount}`}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;

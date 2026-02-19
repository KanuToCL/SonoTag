import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import type {
  BrowserInfo,
  FreqRange,
} from "./types";
import type { ColorTheme } from "./types/themes";
import { COLOR_THEMES } from "./types/themes";
import type { InputMode } from "./types/app";
import { cleanupVideo } from "./api";
import { clamp, normalizeScoresMinMax, clampScoresToPositive } from "./utils/math";
import { formatHz } from "./utils/format";
import { getColorFromStops } from "./utils/color";
import {
  DEFAULT_BUFFER_SECONDS,
  VIDEO_BUFFER_SECONDS,
  DEFAULT_SLIDE_SPEED,
  FRAME_SKIP_MAP,
  DEBUG_YT,
} from "./constants/audio";
import {
  DEFAULT_PROMPTS,
} from "./constants/prompts";
import {
  useDraggable,
  useClassification,
  useWebcam,
  useBackendInfo,
  useAudioDevices,
  useYouTube,
  useVimeo,
  useSoundCloud,
  useAudioMonitoring,
} from "./hooks";
import {
  SettingsPanel,
  AboutModal,
  StatsModal,
  LabelsModal,
  PromptsModal,
  WebcamModal,
  VideoModal,
  ImmersiveHeader,
  ImmersiveFooter,
  ClassicLayout,
} from "./components";
import { getDynamicLabelStyle } from "./utils/color";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// =============================================================================
// App Component
// =============================================================================

function App() {
  // ---------------------------------------------------------------------------
  // UI / Settings State
  // ---------------------------------------------------------------------------
  const [freqMin, setFreqMin] = useState<number>(0);
  const [freqMax, setFreqMax] = useState<number>(12000);
  const [prompts, setPrompts] = useState<string[]>(DEFAULT_PROMPTS);
  const [promptInput, setPromptInput] = useState<string>(DEFAULT_PROMPTS.join("; "));
  const [bufferSeconds, setBufferSeconds] = useState<number>(DEFAULT_BUFFER_SECONDS);
  const [normalizeScores, setNormalizeScores] = useState<boolean>(false);
  const [slideSpeed, setSlideSpeed] = useState<number>(DEFAULT_SLIDE_SPEED);
  const [musicDecomposition, setMusicDecomposition] = useState<boolean>(false);
  const [scoresExpanded, setScoresExpanded] = useState<boolean>(false);
  const [sortByScore, setSortByScore] = useState<boolean>(true);
  const [colorTheme, setColorTheme] = useState<ColorTheme>("inferno");
  const [inputMode, setInputMode] = useState<InputMode>("microphone");
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<"immersive" | "classic">("immersive");

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    audioInput: false,
    soundCategories: false,
    inferenceSettings: true,
    systemInfo: true,
  });

  // Immersive video modal
  const [showVideoModal, setShowVideoModal] = useState(true);
  const videoModal = useDraggable({
    initialPosition: { x: Math.max(20, (window.innerWidth - 450) / 2), y: Math.max(20, (window.innerHeight - 400) / 2 - 100) },
    initialSize: { width: 400, height: 280 },
    resizeMode: "both",
    sizeBounds: { minWidth: 280, maxWidth: 800, minHeight: 200, maxHeight: 600 },
  });

  // Floating labels modal
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const labelsModal = useDraggable({
    initialPosition: { x: 440, y: 20 },
    initialSize: { height: 400 },
    resizeMode: "height",
    sizeBounds: { minHeight: 200, maxHeight: 800 },
    fixedWidth: 280,
  });

  // Floating prompts modal
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const promptsModal = useDraggable({
    initialPosition: { x: 740, y: 20 },
    initialSize: { height: 400 },
    resizeMode: "height",
    sizeBounds: { minHeight: 200, maxHeight: 800 },
    fixedWidth: 320,
  });
  const [promptsModalInput, setPromptsModalInput] = useState("");

  // Inline search state for video modal
  const [showVideoModalSearch, setShowVideoModalSearch] = useState(false);
  const [videoModalSearchUrl, setVideoModalSearchUrl] = useState("");
  const [showScModalSearch, setShowScModalSearch] = useState(false);
  const [scModalSearchUrl, setScModalSearchUrl] = useState("");

  // Cumulative Statistics
  const [showStatsModal, setShowStatsModal] = useState(false);
  const statsModal = useDraggable({
    initialPosition: { x: 100, y: 100 },
    resizeMode: "none",
    fixedWidth: 420,
    fixedHeight: 400,
  });
  const [tableSortBy, setTableSortBy] = useState<"median" | "peak">("median");

  // About modal
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Color theme ref (kept in sync for draw loops)
  const colorThemeRef = useRef<ColorTheme>("inferno");
  useEffect(() => { colorThemeRef.current = colorTheme; }, [colorTheme]);

  // ---------------------------------------------------------------------------
  // Shared Refs (created at App level, passed to multiple hooks)
  // ---------------------------------------------------------------------------
  const audioBufferRef = useRef<Float32Array[]>([]);
  const videoAudioBufferRef = useRef<Float32Array[]>([]);
  const soundcloudAudioBufferRef = useRef<Float32Array[]>([]);
  const youtubeAnalyzingRef = useRef<boolean>(false);
  const vimeoAnalyzingRef = useRef<boolean>(false);
  const soundcloudAnalyzingRef = useRef<boolean>(false);
  const videoAnalyserRef = useRef<AnalyserNode | null>(null);
  const vimeoAnalyserRef = useRef<AnalyserNode | null>(null);
  const soundcloudAnalyserRef = useRef<AnalyserNode | null>(null);
  const bufferSecondsRef = useRef<number>(DEFAULT_BUFFER_SECONDS);
  const audioContextRefForClassification = useRef<AudioContext | null>(null);

  // ---------------------------------------------------------------------------
  // Custom Hooks
  // ---------------------------------------------------------------------------

  // Audio Devices
  const {
    devices,
    selectedDeviceId,
    permissionState,
    refreshDevices,
    requestPermission,
    setSelectedDeviceId,
  } = useAudioDevices();

  // Backend Info
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

  const {
    backendInfo,
    backendError,
    recommendation,
    modelStatus,
  } = useBackendInfo({ browserInfo, apiBaseUrl: API_BASE_URL });

  // Webcam
  const {
    webcamDevices,
    selectedWebcamId,
    webcamError,
    webcamActive,
    webcamRef,
    webcamStreamRef,
    refreshWebcamDevices,
    startWebcam,
    stopWebcam,
    setSelectedWebcamId,
    setShowWebcamModal,
    showWebcamModal,
  } = useWebcam({ inputMode });

  const webcamModal = useDraggable({
    initialPosition: { x: Math.max(20, (window.innerWidth - 370) / 2), y: Math.max(20, (window.innerHeight - 320) / 2 - 50) },
    initialSize: { width: 320, height: 240 },
    resizeMode: "both",
    sizeBounds: { minWidth: 200, maxWidth: 640, minHeight: 150, maxHeight: 480 },
  });

  // Classification
  const {
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
    classifyVimeoBuffer,
    classifySoundcloudBuffer,
    clearStats,
    setClassificationScores,
    setFrameScores,
    setScoreHistory,
    setTopRankedHistory,
    setTotalInferences,
    setInferenceCount,
    setSessionStartTime,
  } = useClassification({
    prompts,
    normalizeScores,
    audioBufferRef,
    videoAudioBufferRef,
    soundcloudAudioBufferRef,
    audioContextRef: audioContextRefForClassification,
    videoAnalyserRef,
    soundcloudAnalyserRef,
    youtubeAnalyzingRef,
    vimeoAnalyzingRef,
    soundcloudAnalyzingRef,
  });

  // YouTube
  const {
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
  } = useYouTube({
    classifyVideoBuffer,
    bufferSeconds,
    videoAudioBufferRef,
    youtubeAnalyzingRef,
    videoAnalyserRef,
    bufferSecondsRef,
  });

  // Vimeo
  const {
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
  } = useVimeo({
    classifyVideoBuffer: classifyVimeoBuffer,
    bufferSeconds,
    videoAudioBufferRef,
    vimeoAnalyzingRef,
    vimeoAnalyserRef,
    bufferSecondsRef,
  });

  // SoundCloud
  const {
    soundcloudUrl,
    soundcloudPreparing,
    soundcloudMedia,
    soundcloudError,
    soundcloudAnalyzing,
    scIsPlaying,
    scCurrentTime,
    scDuration,
    scVolume,
    scIsSeeking,
    soundcloudAudioRef,
    soundcloudAudioContextRef,
    soundcloudSourceRef,
    soundcloudScriptProcessorRef,
    setSoundcloudUrl,
    setSoundcloudPreparing,
    setSoundcloudMedia,
    setSoundcloudError,
    setSoundcloudAnalyzing,
    setScIsPlaying,
    setScCurrentTime,
    setScDuration,
    setScIsSeeking,
    loadSoundCloudMedia,
    stopSoundCloudAnalysis,
    startSoundCloudAnalysis,
    cleanupSoundCloudAudio,
    closeSoundCloud,
    scPlayPause,
    scSeek,
    scSeekStart,
    scSeekEnd,
    scVolumeToggle,
    scVolumeChange,
    scOnPlay,
    scOnPause,
    scOnEnded,
    scOnTimeUpdate,
    scOnLoadedMetadata,
    scOnError,
  } = useSoundCloud({
    classifySoundcloudBuffer,
    bufferSeconds,
    soundcloudAudioBufferRef,
    soundcloudAnalyzingRef,
    soundcloudAnalyserRef,
    bufferSecondsRef,
  });

  // Audio Monitoring (needs freqRange/nyquist which depend on sampleRate)
  // sampleRate is returned by the hook; we use a default nyquist first.
  // We compute preliminary values here. After the hook sets sampleRate,
  // everything recomputes on the next render (same pattern as original code).

  // Preliminary nyquist/freqRange (will be updated after monitoring provides sampleRate)
  const [monitoringSampleRate, setMonitoringSampleRate] = useState<number | null>(null);
  const nyquist = monitoringSampleRate ? monitoringSampleRate / 2 : 24000;

  const freqRange: FreqRange = useMemo(() => {
    const min = clamp(Number(freqMin) || 0, 0, nyquist);
    const maxCandidate = Number(freqMax) || nyquist;
    const max = clamp(maxCandidate, 0, nyquist);
    const safeMax = max <= min ? Math.min(nyquist, min + 100) : max;
    return { min, max: safeMax };
  }, [freqMax, freqMin, nyquist]);

  const monitoring = useAudioMonitoring({
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
  });

  // Sync monitoring sampleRate to App-level state
  useEffect(() => {
    setMonitoringSampleRate(monitoring.sampleRate);
  }, [monitoring.sampleRate]);

  // Keep audioContextRef for classification in sync with monitoring's audioContext
  useEffect(() => {
    audioContextRefForClassification.current = monitoring.audioContextRef.current;
  });

  const { status, level, error, spectrogramRef, heatmapRef, startMonitoring, stopMonitoring } = monitoring;

  // ---------------------------------------------------------------------------
  // Derived Values
  // ---------------------------------------------------------------------------
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
  // Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    refreshWebcamDevices();
    if (!navigator.mediaDevices?.addEventListener) return undefined;
    const handleDeviceChange = () => { refreshWebcamDevices(); };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => { navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange); };
  }, [refreshWebcamDevices]);

  useEffect(() => {
    if (!monitoringSampleRate) return;
    setFreqMin((current) => clamp(Number(current) || 0, 0, nyquist));
    setFreqMax((current) => clamp(Number(current) || nyquist, 0, nyquist));
  }, [nyquist, monitoringSampleRate]);

  // ---------------------------------------------------------------------------
  // Video/SoundCloud Heatmap Draw Loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if ((!youtubeAnalyzing && !vimeoAnalyzing && !soundcloudAnalyzing) || !heatmapRef.current || !spectrogramRef.current) return;

    const heatmapCanvas = heatmapRef.current;
    const heatmapContext = heatmapCanvas.getContext("2d");
    const spectrogramCanvas = spectrogramRef.current;
    const spectrogramContext = spectrogramCanvas.getContext("2d");
    if (!heatmapContext || !spectrogramContext) return;

    heatmapContext.imageSmoothingEnabled = false;
    spectrogramContext.imageSmoothingEnabled = false;

    let animationId: number;
    let frameCount = 0;

    const specQueue: Uint8Array[] = [];
    const frameSkipVal = FRAME_SKIP_MAP[slideSpeed] || 1;
    const drawnFps = 60 / frameSkipVal;
    const specDelayFrames = Math.ceil(bufferSecondsRef.current * drawnFps);

    const drawVideoVisuals = (): void => {
      if (!heatmapRef.current || !heatmapContext || !spectrogramRef.current || !spectrogramContext) return;

      frameCount += 1;
      const frameSkip = FRAME_SKIP_MAP[slideSpeed] || 1;
      const shouldDraw = frameCount % frameSkip === 0;

      const hasScores = Object.keys(classificationScoresRef.current).length > 0;

      const analyser = videoAnalyserRef.current || vimeoAnalyserRef.current || soundcloudAnalyserRef.current;
      if (shouldDraw && analyser) {
        const bufLen = analyser.frequencyBinCount;
        const snap = new Uint8Array(bufLen);
        analyser.getByteFrequencyData(snap);
        specQueue.push(snap);
      }

      if (shouldDraw && hasScores) {
        const delayed = specQueue.length > specDelayFrames ? specQueue.shift() : null;

        if (delayed && analyser) {
          const bufferLength = analyser.frequencyBinCount;
          spectrogramContext.drawImage(spectrogramCanvas, -1, 0);
          const range = freqRange.max - freqRange.min || 1;
          for (let y = 0; y < spectrogramCanvas.height; y += 1) {
            const freq = freqRange.min + (y / spectrogramCanvas.height) * range;
            const index = Math.floor((freq / nyquist) * bufferLength);
            const safeIndex = clamp(index, 0, bufferLength - 1);
            const intensity = delayed[safeIndex] / 255;
            const themeStops = COLOR_THEMES[colorThemeRef.current].stops;
            spectrogramContext.fillStyle = getColorFromStops(intensity, themeStops);
            spectrogramContext.fillRect(spectrogramCanvas.width - 1, spectrogramCanvas.height - y - 1, 1, 1);
          }
        }

        heatmapContext.drawImage(heatmapCanvas, -1, 0);

        const currentPrompts = promptsRef.current;
        const currentScores = classificationScoresRef.current;
        const useNormalization = normalizeScoresRef.current;
        const rowHeight = heatmapCanvas.height / currentPrompts.length;

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

        currentPrompts.forEach((prompt, row) => {
          const value = displayValues[prompt] ?? 0;
          const themeStops = COLOR_THEMES[colorThemeRef.current].stops;
          heatmapContext.fillStyle = getColorFromStops(value, themeStops);
          heatmapContext.fillRect(heatmapCanvas.width - 1, row * rowHeight, 1, rowHeight);
        });
      }

      animationId = requestAnimationFrame(drawVideoVisuals);
    };

    animationId = requestAnimationFrame(drawVideoVisuals);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [youtubeAnalyzing, vimeoAnalyzing, soundcloudAnalyzing, slideSpeed, freqRange.min, freqRange.max, nyquist, layoutMode,
      classificationScoresRef, promptsRef, normalizeScoresRef, heatmapRef, spectrogramRef]);

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
  // Derived Display Values
  // ---------------------------------------------------------------------------
  const levelPercent = Math.min(100, Math.round(level * 140));
  const hostCpuLogical = backendInfo?.cpu?.logical_cores ?? backendInfo?.cpu_count ?? null;
  const hostCpuPhysical = backendInfo?.cpu?.physical_cores ?? null;
  const hostCpuModel = backendInfo?.cpu?.model ?? null;
  const hostMemoryBytes = backendInfo?.memory?.total_bytes ?? null;
  const hostPlatform = backendInfo?.platform ?? null;
  const hostGpus = backendInfo?.gpus ?? [];

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const onClearAll = useCallback(() => {
    clearStats();
    if (spectrogramRef.current) {
      const ctx = spectrogramRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, spectrogramRef.current.width, spectrogramRef.current.height);
    }
    if (heatmapRef.current) {
      const ctx = heatmapRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, heatmapRef.current.width, heatmapRef.current.height);
    }
  }, [clearStats, spectrogramRef, heatmapRef]);

  const promptsWithScores = useMemo(() => {
    const displayScores = Object.keys(classificationScores).length > 0
      ? (normalizeScores
          ? normalizeScoresMinMax(classificationScores)
          : clampScoresToPositive(classificationScores))
      : {};

    return prompts.map(prompt => ({
      prompt,
      rawScore: classificationScores[prompt] ?? 0,
      displayScore: displayScores[prompt] ?? 0,
      isTop: classificationScores[prompt] === Math.max(...Object.values(classificationScores)),
    }));
  }, [prompts, classificationScores, normalizeScores]);

  const heatmapHeight = Math.max(300, prompts.length * 20);

  // ---------------------------------------------------------------------------
  // Immersive Layout
  // ---------------------------------------------------------------------------
  if (layoutMode === "immersive") {
    return (
      <div className="immersive-page">
        <ImmersiveHeader
          inputMode={inputMode}
          status={status}
          youtubeAnalyzing={youtubeAnalyzing}
          vimeoAnalyzing={vimeoAnalyzing}
          soundcloudAnalyzing={soundcloudAnalyzing}
          settingsOpen={settingsOpen}
          showAboutModal={showAboutModal}
          onSetInputMode={setInputMode}
          onSetSettingsOpen={setSettingsOpen}
          onSetShowAboutModal={setShowAboutModal}
          onClearAll={onClearAll}
          onStopMonitoring={stopMonitoring}
          onStopYoutubeAnalyzing={stopYouTubeAnalysis}
          onStopVimeoAnalyzing={stopVimeoAnalysis}
          onStopSoundcloudAnalyzing={stopSoundCloudAnalysis}
          onSetBufferSeconds={setBufferSeconds}
          defaultBufferSeconds={DEFAULT_BUFFER_SECONDS}
          videoBufferSeconds={VIDEO_BUFFER_SECONDS}
        />

        <main className="immersive-main">
          <div className="viz-container">
            {/* Spectrogram */}
            <div className="spectrogram-section">
              <span className="spectrogram-label" style={{
                position: "absolute",
                top: "12px",
                left: "140px",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                color: "rgba(154, 167, 189, 0.6)",
                zIndex: 15,
              }}>Spectrogram</span>
              <div className="hz-scale" style={{
                position: "absolute",
                left: "4px",
                top: 0,
                bottom: 0,
                width: "28px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                pointerEvents: "none",
                zIndex: 2,
                padding: "2px 0",
              }}>
                <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                  {formatHz(freqRange.max)}
                </span>
                <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                  {formatHz(freqRange.min)}
                </span>
              </div>
              <div className="spectrogram-canvas-wrap">
                <canvas ref={spectrogramRef} width={1200} height={200} />
              </div>
              <div className="spectrogram-label-spacer" style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                gap: "6px",
                padding: "8px 12px",
              }}>
                <button
                  type="button"
                  onClick={() => setShowLabelsModal(!showLabelsModal)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: showLabelsModal ? "var(--accent)" : "var(--muted)",
                    background: showLabelsModal ? "rgba(255, 122, 61, 0.2)" : "rgba(15, 21, 32, 0.8)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    width: "100%",
                  }}
                  title={showLabelsModal ? "Hide Labels panel" : "Show Labels panel"}
                >
                  Labels
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPromptsModal(!showPromptsModal);
                    if (!showPromptsModal) setPromptsModalInput(prompts.join("; "));
                  }}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: showPromptsModal ? "var(--accent)" : "var(--muted)",
                    background: showPromptsModal ? "rgba(255, 122, 61, 0.2)" : "rgba(15, 21, 32, 0.8)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    width: "100%",
                  }}
                  title={showPromptsModal ? "Hide Prompts panel" : "Edit Prompts"}
                >
                  Prompts
                </button>

                {inputMode === "microphone" && (
                  <button
                    type="button"
                    onClick={() => { if (webcamActive) stopWebcam(); else startWebcam(); }}
                    style={{
                      padding: "8px 16px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: webcamActive ? "var(--accent)" : "var(--muted)",
                      background: webcamActive ? "rgba(255, 122, 61, 0.2)" : "rgba(15, 21, 32, 0.8)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      width: "100%",
                    }}
                    title={webcamActive ? "Stop Camera" : "Start Camera"}
                  >
                    {webcamActive ? "Stop Camera" : "Camera"}
                  </button>
                )}

                {inputMode === "youtube" && youtubeVideo && (
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(!showVideoModal)}
                    style={{
                      padding: "8px 16px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: showVideoModal ? "var(--accent)" : "var(--muted)",
                      background: showVideoModal ? "rgba(255, 122, 61, 0.2)" : "rgba(15, 21, 32, 0.8)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      width: "100%",
                    }}
                    title={showVideoModal ? "Hide Video" : "Show Video"}
                  >
                    Video
                  </button>
                )}

                {inputMode === "vimeo" && vimeoMedia && (
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(!showVideoModal)}
                    style={{
                      padding: "8px 16px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: showVideoModal ? "var(--accent)" : "var(--muted)",
                      background: showVideoModal ? "rgba(255, 122, 61, 0.2)" : "rgba(15, 21, 32, 0.8)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      width: "100%",
                    }}
                    title={showVideoModal ? "Hide Video" : "Show Video"}
                  >
                    Video
                  </button>
                )}

                {inputMode === "soundcloud" && soundcloudMedia && (
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(!showVideoModal)}
                    style={{
                      padding: "8px 16px",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: showVideoModal ? "var(--accent)" : "var(--muted)",
                      background: showVideoModal ? "rgba(255, 122, 61, 0.2)" : "rgba(15, 21, 32, 0.8)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      width: "100%",
                    }}
                    title={showVideoModal ? "Hide Player" : "Show Player"}
                  >
                    Player
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowStatsModal(!showStatsModal)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: showStatsModal ? "var(--accent)" : "var(--muted)",
                    background: showStatsModal ? "rgba(255, 122, 61, 0.2)" : "rgba(15, 21, 32, 0.8)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    width: "100%",
                  }}
                  title={showStatsModal ? "Hide Stats" : "Show Cumulative Stats"}
                >
                  Stats
                </button>
              </div>
            </div>

            {/* Heatmap with Dynamic Labels */}
            <div className="heatmap-section" style={{ height: heatmapHeight }}>
              <span className="heatmap-label">FLAM Detection</span>
              <div className="heatmap-canvas-wrap">
                <canvas ref={heatmapRef} width={1200} height={heatmapHeight} />
              </div>
              <div className="dynamic-labels">
                {promptsWithScores.map(({ prompt, rawScore, displayScore }) => (
                  <div
                    key={prompt}
                    className="dynamic-label"
                    style={getDynamicLabelStyle(displayScore, COLOR_THEMES[colorTheme])}
                  >
                    <span className="label-text">{prompt}</span>
                    <span className="label-score">
                      {rawScore !== 0 ? rawScore.toFixed(2) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Floating Video Modal */}
        <VideoModal
          showVideoModal={showVideoModal}
          position={videoModal.position}
          size={videoModal.size}
          onDragStart={videoModal.onDragStart}
          onResizeStart={videoModal.onResizeStart}
          youtubeVideo={youtubeVideo}
          youtubeAnalyzing={youtubeAnalyzing}
          showVideoModalSearch={showVideoModalSearch}
          videoModalSearchUrl={videoModalSearchUrl}
          youtubePreparing={youtubePreparing}
          onToggleLabels={() => setShowLabelsModal(!showLabelsModal)}
          showLabelsModal={showLabelsModal}
          onToggleVideoSearch={() => {
            setShowVideoModalSearch(!showVideoModalSearch);
            if (!showVideoModalSearch) setVideoModalSearchUrl("");
          }}
          onVideoSearchUrlChange={setVideoModalSearchUrl}
          onCloseYoutubeVideo={() => {
            stopYouTubeAnalysis();
            cleanupYouTubeAudio();
            if (youtubeVideo) cleanupVideo(youtubeVideo.video_id).catch(() => {});
            setYoutubeVideo(null);
          }}
          onLoadYoutubeVideo={async (url) => {
            stopYouTubeAnalysis();
            cleanupYouTubeAudio();
            if (youtubeVideo) cleanupVideo(youtubeVideo.video_id).catch(() => {});
            setYoutubeVideo(null);
            await loadYouTubeVideo(url);
            setShowVideoModalSearch(false);
            setVideoModalSearchUrl("");
          }}
          videoRef={videoRef}
          onVideoPlay={startYouTubeAnalysis}
          onVideoPause={stopYouTubeAnalysis}
          onVideoEnded={stopYouTubeAnalysis}
          onVideoError={(e) => {
            const vid = e.currentTarget as HTMLVideoElement;
            const err = vid.error;
            if (DEBUG_YT) console.error('[YT] Video error:', err?.code, err?.message, 'src:', vid.src);
            setYoutubeError(`Video playback error: ${err?.message || 'unknown'} (code ${err?.code})`);
          }}
          vimeoMedia={vimeoMedia}
          vimeoAnalyzing={vimeoAnalyzing}
          vimeoVideoRef={vimeoVideoRef}
          onVimeoPlay={startVimeoAnalysis}
          onVimeoPause={stopVimeoAnalysis}
          onVimeoEnded={stopVimeoAnalysis}
          onVimeoError={(e) => {
            const vid = e.currentTarget as HTMLVideoElement;
            const err = vid.error;
            if (DEBUG_YT) console.error('[Vimeo] Video error:', err?.code, err?.message, 'src:', vid.src);
            setVimeoError(`Video playback error: ${err?.message || 'unknown'} (code ${err?.code})`);
          }}
          onCloseVimeo={() => {
            stopVimeoAnalysis();
            cleanupVimeoAudio();
            if (vimeoMedia) cleanupVideo(vimeoMedia.video_id).catch(() => {});
            setVimeoMedia(null);
          }}
          soundcloudMedia={soundcloudMedia}
          soundcloudAnalyzing={soundcloudAnalyzing}
          showScModalSearch={showScModalSearch}
          scModalSearchUrl={scModalSearchUrl}
          soundcloudPreparing={soundcloudPreparing}
          onToggleScSearch={() => {
            setShowScModalSearch(!showScModalSearch);
            if (!showScModalSearch) setScModalSearchUrl("");
          }}
          onScSearchUrlChange={setScModalSearchUrl}
          onCloseSoundcloud={() => {
            closeSoundCloud();
          }}
          onLoadSoundcloudTrack={async (url) => {
            await loadSoundCloudMedia(url);
            setShowScModalSearch(false);
            setScModalSearchUrl("");
          }}
          onClearScores={onClearAll}
          soundcloudAudioRef={soundcloudAudioRef}
          onScPlay={scOnPlay}
          onScPause={scOnPause}
          onScEnded={scOnEnded}
          onScTimeUpdate={scOnTimeUpdate}
          onScLoadedMetadata={scOnLoadedMetadata}
          onScError={scOnError}
          scIsPlaying={scIsPlaying}
          scCurrentTime={scCurrentTime}
          scDuration={scDuration}
          scVolume={scVolume}
          scIsSeeking={scIsSeeking}
          onScPlayPause={scPlayPause}
          onScSeek={scSeek}
          onScSeekStart={scSeekStart}
          onScSeekEnd={scSeekEnd}
          onScVolumeToggle={scVolumeToggle}
          onScVolumeChange={scVolumeChange}
          inputMode={inputMode}
        />

        {/* Floating Webcam Modal */}
        <WebcamModal
          show={inputMode === "microphone" && webcamActive}
          visible={showWebcamModal}
          onToggleVisibility={() => setShowWebcamModal(!showWebcamModal)}
          onClose={() => stopWebcam()}
          position={webcamModal.position}
          size={webcamModal.size}
          onDragStart={webcamModal.onDragStart}
          onResizeStart={webcamModal.onResizeStart}
          webcamActive={webcamActive}
          webcamDevices={webcamDevices}
          selectedWebcamId={selectedWebcamId}
          onDeviceChange={(deviceId) => {
            setSelectedWebcamId(deviceId);
            if (webcamActive) {
              stopWebcam();
              setTimeout(() => startWebcam(), 100);
            }
          }}
          webcamError={webcamError}
          webcamStreamRef={webcamStreamRef}
          webcamRef={webcamRef}
        />

        {/* Global mouse handlers for drag/resize */}
        {(videoModal.isActive || labelsModal.isActive || promptsModal.isActive || statsModal.isActive || webcamModal.isActive) && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              cursor: videoModal.isDragging || labelsModal.isDragging || promptsModal.isDragging || statsModal.isDragging || webcamModal.isDragging ? "grabbing" : "nwse-resize",
            }}
            onMouseMove={(e) => {
              videoModal.onMouseMove(e);
              labelsModal.onMouseMove(e);
              promptsModal.onMouseMove(e);
              statsModal.onMouseMove(e);
              webcamModal.onMouseMove(e);
            }}
            onMouseUp={() => {
              videoModal.onMouseUp();
              labelsModal.onMouseUp();
              promptsModal.onMouseUp();
              statsModal.onMouseUp();
              webcamModal.onMouseUp();
            }}
            onMouseLeave={() => {
              videoModal.onMouseUp();
              labelsModal.onMouseUp();
              promptsModal.onMouseUp();
              statsModal.onMouseUp();
              webcamModal.onMouseUp();
            }}
          />
        )}

        {/* Floating Labels Modal */}
        <LabelsModal
          show={showLabelsModal}
          onClose={() => setShowLabelsModal(false)}
          position={labelsModal.position}
          height={labelsModal.height}
          onDragStart={labelsModal.onDragStart}
          onResizeStart={labelsModal.onResizeStart}
          classificationScores={classificationScores}
          normalizeScores={normalizeScores}
          prompts={prompts}
          colorTheme={colorTheme}
        />

        {/* Floating Stats Modal */}
        <StatsModal
          show={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          position={statsModal.position}
          onDragStart={statsModal.onDragStart}
          scoreHistory={scoreHistory}
          topRankedHistory={topRankedHistory}
          sessionStartTime={sessionStartTime}
          totalInferences={totalInferences}
          promptsCount={prompts.length}
          tableSortBy={tableSortBy}
          setTableSortBy={setTableSortBy}
          onReset={() => {
            setScoreHistory({});
            setTopRankedHistory([]);
            setTotalInferences(0);
            setSessionStartTime(null);
          }}
        />

        {/* Floating Prompts Modal */}
        <PromptsModal
          show={showPromptsModal}
          onClose={() => setShowPromptsModal(false)}
          position={promptsModal.position}
          height={promptsModal.height}
          onDragStart={promptsModal.onDragStart}
          onResizeStart={promptsModal.onResizeStart}
          promptsModalInput={promptsModalInput}
          setPromptsModalInput={setPromptsModalInput}
          inputMode={inputMode}
          currentPrompts={prompts}
          onApply={(newPrompts, rawInput) => {
            setPrompts(newPrompts);
            setPromptInput(rawInput);
            promptsRef.current = newPrompts;
            setShowPromptsModal(false);
          }}
        />

        {/* Bottom Controls Bar */}
        <ImmersiveFooter
          inputMode={inputMode}
          status={status}
          youtubeUrl={youtubeUrl}
          youtubeVideo={youtubeVideo}
          youtubeAnalyzing={youtubeAnalyzing}
          youtubePreparing={youtubePreparing}
          youtubeError={youtubeError}
          onSetYoutubeUrl={setYoutubeUrl}
          onPrepareYoutube={async () => {
            if (!youtubeUrl.trim() || youtubePreparing) return;
            await loadYouTubeVideo(youtubeUrl);
          }}
          vimeoUrl={vimeoUrl}
          vimeoMedia={vimeoMedia}
          vimeoAnalyzing={vimeoAnalyzing}
          vimeoPreparing={vimeoPreparing}
          vimeoError={vimeoError}
          onSetVimeoUrl={setVimeoUrl}
          onPrepareVimeo={async () => {
            if (!vimeoUrl.trim() || vimeoPreparing) return;
            await loadVimeoVideo(vimeoUrl);
          }}
          soundcloudUrl={soundcloudUrl}
          soundcloudMedia={soundcloudMedia}
          soundcloudAnalyzing={soundcloudAnalyzing}
          soundcloudPreparing={soundcloudPreparing}
          soundcloudError={soundcloudError}
          onSetSoundcloudUrl={setSoundcloudUrl}
          onPrepareSoundcloud={async () => {
            if (!soundcloudUrl.trim() || soundcloudPreparing) return;
            await loadSoundCloudMedia(soundcloudUrl);
          }}
          levelPercent={levelPercent}
          onStartMonitoring={startMonitoring}
          onStopMonitoring={stopMonitoring}
          webcamActive={webcamActive}
          onToggleWebcam={() => { if (webcamActive) stopWebcam(); else startWebcam(); }}
          prompts={prompts}
          musicDecomposition={musicDecomposition}
          onSetPrompts={setPrompts}
          onSetPromptInput={setPromptInput}
          onSetClassificationScores={setClassificationScores}
          onSetMusicDecomposition={setMusicDecomposition}
          bufferSeconds={bufferSeconds}
          onSetBufferSeconds={setBufferSeconds}
          modelStatus={modelStatus}
          inferenceCount={inferenceCount}
          lastInferenceTime={lastInferenceTime}
          onSetLayoutMode={setLayoutMode}
        />

        <AboutModal show={showAboutModal} onClose={() => setShowAboutModal(false)} />

        <SettingsPanel
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          prompts={prompts}
          setPrompts={setPrompts}
          promptInput={promptInput}
          setPromptInput={setPromptInput}
          setClassificationScores={setClassificationScores}
          normalizeScores={normalizeScores}
          setNormalizeScores={setNormalizeScores}
          sortByScore={sortByScore}
          setSortByScore={setSortByScore}
          colorTheme={colorTheme}
          setColorTheme={setColorTheme}
          bufferSeconds={bufferSeconds}
          setBufferSeconds={setBufferSeconds}
          slideSpeed={slideSpeed}
          setSlideSpeed={setSlideSpeed}
          freqMin={freqMin}
          freqMax={freqMax}
          handleFreqMinChange={handleFreqMinChange}
          handleFreqMaxChange={handleFreqMaxChange}
          setFullRange={setFullRange}
          nyquist={nyquist}
          timingBreakdown={timingBreakdown}
          sampleRate={monitoringSampleRate}
          hostCpuModel={hostCpuModel}
          hostCpuLogical={hostCpuLogical}
          hostMemoryBytes={hostMemoryBytes}
          hostPlatform={hostPlatform}
          browserPlatform={browserInfo.platform}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Classic Layout
  // ---------------------------------------------------------------------------
  return (
    <ClassicLayout
      onSetLayoutMode={setLayoutMode}
      status={status}
      permissionState={permissionState}
      error={error}
      inputMode={inputMode}
      onSetInputMode={setInputMode}
      devices={devices}
      selectedDeviceId={selectedDeviceId}
      onSetSelectedDeviceId={setSelectedDeviceId}
      onRequestPermission={requestPermission}
      onRefreshDevices={refreshDevices}
      onStartMonitoring={startMonitoring}
      onStopMonitoring={stopMonitoring}
      webcamActive={webcamActive}
      onStartWebcam={startWebcam}
      onStopWebcam={stopWebcam}
      youtubeUrl={youtubeUrl}
      youtubeVideo={youtubeVideo}
      youtubeAnalyzing={youtubeAnalyzing}
      youtubePreparing={youtubePreparing}
      youtubeError={youtubeError}
      onSetYoutubeUrl={setYoutubeUrl}
      onSetYoutubeVideo={setYoutubeVideo}
      onSetYoutubePreparing={setYoutubePreparing}
      onSetYoutubeError={setYoutubeError}
      onSetYoutubeAnalyzing={setYoutubeAnalyzing}
      videoRef={videoRef}
      videoAudioContextRef={videoAudioContextRef}
      videoSourceRef={videoSourceRef}
      videoScriptProcessorRef={videoScriptProcessorRef}
      videoAnalyserRef={videoAnalyserRef}
      videoAudioBufferRef={videoAudioBufferRef}
      youtubeAnalyzingRef={youtubeAnalyzingRef}
      bufferSecondsRef={bufferSecondsRef}
      classifyVideoBuffer={classifyVideoBuffer}
      vimeoUrl={vimeoUrl}
      vimeoMedia={vimeoMedia}
      vimeoAnalyzing={vimeoAnalyzing}
      vimeoPreparing={vimeoPreparing}
      vimeoError={vimeoError}
      onSetVimeoUrl={setVimeoUrl}
      onSetVimeoMedia={setVimeoMedia}
      onSetVimeoPreparing={setVimeoPreparing}
      onSetVimeoError={setVimeoError}
      onSetVimeoAnalyzing={setVimeoAnalyzing}
      vimeoVideoRef={vimeoVideoRef}
      vimeoAudioContextRef={vimeoAudioContextRef}
      vimeoSourceRef={vimeoSourceRef}
      vimeoScriptProcessorRef={vimeoScriptProcessorRef}
      vimeoAnalyserRef={vimeoAnalyserRef}
      vimeoAnalyzingRef={vimeoAnalyzingRef}
      classifyVimeoBuffer={classifyVideoBuffer}
      soundcloudUrl={soundcloudUrl}
      soundcloudMedia={soundcloudMedia}
      soundcloudAnalyzing={soundcloudAnalyzing}
      soundcloudPreparing={soundcloudPreparing}
      soundcloudError={soundcloudError}
      onSetSoundcloudUrl={setSoundcloudUrl}
      onSetSoundcloudMedia={setSoundcloudMedia}
      onSetSoundcloudPreparing={setSoundcloudPreparing}
      onSetSoundcloudError={setSoundcloudError}
      onSetSoundcloudAnalyzing={setSoundcloudAnalyzing}
      soundcloudAudioRef={soundcloudAudioRef}
      soundcloudAudioContextRef={soundcloudAudioContextRef}
      soundcloudSourceRef={soundcloudSourceRef}
      soundcloudScriptProcessorRef={soundcloudScriptProcessorRef}
      soundcloudAnalyserRef={soundcloudAnalyserRef}
      soundcloudAudioBufferRef={soundcloudAudioBufferRef}
      soundcloudAnalyzingRef={soundcloudAnalyzingRef}
      classifySoundcloudBuffer={classifySoundcloudBuffer}
      scIsPlaying={scIsPlaying}
      scCurrentTime={scCurrentTime}
      scDuration={scDuration}
      scIsSeeking={scIsSeeking}
      onSetScIsPlaying={setScIsPlaying}
      onSetScCurrentTime={setScCurrentTime}
      onSetScDuration={setScDuration}
      onSetScIsSeeking={setScIsSeeking}
      prompts={prompts}
      promptInput={promptInput}
      onSetPrompts={setPrompts}
      onSetPromptInput={setPromptInput}
      musicDecomposition={musicDecomposition}
      onSetMusicDecomposition={setMusicDecomposition}
      classificationScores={classificationScores}
      onSetClassificationScores={setClassificationScores}
      normalizeScores={normalizeScores}
      onSetNormalizeScores={setNormalizeScores}
      sortByScore={sortByScore}
      onSetSortByScore={setSortByScore}
      scoresExpanded={scoresExpanded}
      onSetScoresExpanded={setScoresExpanded}
      isClassifying={isClassifying}
      classifyError={classifyError}
      bufferSeconds={bufferSeconds}
      onSetBufferSeconds={setBufferSeconds}
      slideSpeed={slideSpeed}
      onSetSlideSpeed={setSlideSpeed}
      modelStatus={modelStatus}
      lastInferenceTime={lastInferenceTime}
      inferenceCount={inferenceCount}
      timingBreakdown={timingBreakdown}
      freqRange={freqRange}
      freqMin={freqMin}
      freqMax={freqMax}
      nyquist={nyquist}
      freqAxisLabels={freqAxisLabels}
      onHandleFreqMinChange={handleFreqMinChange}
      onHandleFreqMaxChange={handleFreqMaxChange}
      onSetFullRange={setFullRange}
      spectrogramRef={spectrogramRef}
      heatmapRef={heatmapRef}
      levelPercent={levelPercent}
      backendInfo={backendInfo}
      backendError={backendError}
      browserInfo={browserInfo}
      recommendation={recommendation}
      sampleRate={monitoringSampleRate}
      collapsedSections={collapsedSections}
      onSetCollapsedSections={setCollapsedSections}
      colorTheme={colorTheme}
      apiBaseUrl={API_BASE_URL}
    />
  );
}

export default App;

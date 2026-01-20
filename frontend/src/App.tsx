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
import {
  classifyAudioLocal,
  audioSamplesToWavBlob,
  resampleAudio,
  getModelStatus,
  prepareYouTubeVideo,
  getVideoStreamUrl,
  cleanupVideo,
} from "./api";
import type { PrepareVideoResponse } from "./types";

// =============================================================================
// Types & Interfaces (local to this component)
// =============================================================================

type PermissionState = "unknown" | "granted" | "denied";
type MonitoringStatus = "idle" | "running" | "stopped";
type InputMode = "microphone" | "youtube";

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

// Sliding speed control (1=slowest/every 6th frame, 5=fastest/every frame)
// Lower values skip more frames for slower scrolling
const DEFAULT_SLIDE_SPEED = 2;
const MIN_SLIDE_SPEED = 1;
const MAX_SLIDE_SPEED = 5;
// Frame skip map: speed 1 = draw every 6 frames, speed 5 = every frame
const FRAME_SKIP_MAP: Record<number, number> = {
  1: 6,  // Very slow - update every 6th frame (~10fps)
  2: 4,  // Slow - update every 4th frame (~15fps)
  3: 2,  // Medium - update every 2nd frame (~30fps)
  4: 1,  // Fast - every frame (~60fps)
  5: 1,  // Fastest - every frame with 2px shift
};

// Default prompts for FLAM classification
// Compound prompts (with commas) are supported to describe sounds multiple ways
const DEFAULT_PROMPTS = [
  "speech",
  "music",
  "child singing",
  "male speech, man speaking",
  "child speech, kid speaking",
  "water drops",
  "screaming",
  "silence",
  "dog barking",
  "footsteps",
];

// Dialog/Movie prompts - sounds commonly found in film dialogue and drama
const DIALOG_MOVIE_PROMPTS = [
  "female speaker, woman speaking",
  "male speaker, man speaking",
  "whispering, soft voice",
  "yelling, shouting",
  "crying, sobbing",
  "laughing, laughter",
  "arguing, fighting",
  "romantic music, passionate music",
  "dramatic music, tension",
  "suspenseful music, thriller",
  "sad music, melancholic",
  "happy music, upbeat",
  "footsteps, walking",
  "door opening, door closing",
  "phone ringing, phone call",
  "silence, quiet",
];

// Action Movie prompts - sounds commonly found in action films
const ACTION_MOVIE_PROMPTS = [
  "explosion, blast",
  "gun shot, gunfire",
  "gun reloading, loading",
  "automatic weapons, machine gun",
  "punches, hitting, fighting",
  "glass breaking, shatter",
  "car chase, vehicle pursuit",
  "car crash, collision",
  "scream, screaming",
  "man speaking, male voice",
  "woman speaking, female voice",
  "footsteps, running",
  "helicopter, chopper",
  "siren, police siren",
  "tires screeching, skidding",
  "engine revving, car engine",
  "motorcycle, bike",
  "fire, flames",
  "wind, rushing air",
  "dramatic music, orchestral music",
  "silence, quiet",
  "door slam, door",
  "metal impact, clang",
  "water splash, underwater",
];

// Sports prompts - sounds commonly found in sports broadcasts/content
const SPORTS_PROMPTS = [
  "crowd cheering, applause",
  "crowd booing",
  "whistle, referee whistle",
  "ball bouncing",
  "ball kick, kick",
  "ball hit, bat hit",
  "announcer, commentator",
  "stadium ambience, crowd noise",
  "horn, air horn",
  "buzzer, game buzzer",
  "running, footsteps",
  "splash, swimming",
  "ice skating, hockey",
  "engine, racing",
  "bicycle, cycling",
  "tennis, racket hit",
  "golf swing, golf",
  "basketball, dribbling",
  "boxing, punching",
  "bell, ring bell",
  "silence, pause",
  "music, intro music",
];

// Music Decomposition prompts - comprehensive list of instruments and musical elements
const MUSIC_DECOMPOSITION_PROMPTS = [
  // Strings
  "violin",
  "viola",
  "cello",
  "double bass, contrabass",
  "acoustic guitar",
  "electric guitar",
  "bass guitar",
  "harp",
  "banjo",
  "mandolin",
  "ukulele",
  // Woodwinds
  "flute",
  "piccolo",
  "clarinet",
  "oboe",
  "bassoon",
  "saxophone, sax",
  "recorder",
  // Brass
  "trumpet",
  "trombone",
  "french horn",
  "tuba",
  "cornet",
  // Percussion
  "drums, drum kit",
  "snare drum",
  "bass drum, kick drum",
  "hi-hat, cymbals",
  "timpani",
  "xylophone",
  "marimba",
  "vibraphone",
  "tambourine",
  "triangle",
  "bongos, congas",
  // Keyboard
  "piano, grand piano",
  "electric piano, keyboard",
  "organ, pipe organ",
  "synthesizer, synth",
  "harpsichord",
  "accordion",
  // Vocals
  "male vocals, male singing",
  "female vocals, female singing",
  "choir, choral",
  "opera singing",
  "beatboxing",
];

// Maximum prompts to show before collapsing
const MAX_VISIBLE_PROMPTS = 10;

// =============================================================================
// Color Themes
// =============================================================================

type ColorTheme = "inferno" | "matrix" | "bone" | "plasma" | "ocean";

interface ThemeColors {
  name: string;
  stops: HeatColorStop[];
  labelAccent: [number, number, number]; // RGB for dynamic label color
  canvasBg: string; // Background color for canvas
}

const COLOR_THEMES: Record<ColorTheme, ThemeColors> = {
  inferno: {
    name: "Inferno",
    stops: [
      { stop: 0, color: [0, 0, 4] },
      { stop: 0.13, color: [40, 11, 84] },
      { stop: 0.25, color: [101, 21, 110] },
      { stop: 0.38, color: [159, 42, 99] },
      { stop: 0.5, color: [212, 72, 66] },
      { stop: 0.63, color: [245, 125, 21] },
      { stop: 0.75, color: [250, 175, 41] },
      { stop: 0.88, color: [252, 225, 119] },
      { stop: 1, color: [252, 255, 164] },
    ],
    labelAccent: [255, 180, 100],
    canvasBg: "#000004",
  },
  matrix: {
    name: "Matrix",
    stops: [
      { stop: 0, color: [0, 8, 16] },
      { stop: 0.15, color: [0, 24, 42] },
      { stop: 0.3, color: [0, 52, 68] },
      { stop: 0.45, color: [8, 88, 92] },
      { stop: 0.6, color: [32, 132, 108] },
      { stop: 0.75, color: [80, 190, 120] },
      { stop: 0.88, color: [140, 230, 140] },
      { stop: 1, color: [200, 255, 200] },
    ],
    labelAccent: [100, 255, 150],
    canvasBg: "#000810",
  },
  bone: {
    name: "Bone",
    stops: [
      { stop: 0, color: [0, 0, 0] },
      { stop: 0.15, color: [35, 39, 45] },
      { stop: 0.3, color: [70, 78, 90] },
      { stop: 0.45, color: [105, 117, 135] },
      { stop: 0.6, color: [145, 158, 175] },
      { stop: 0.75, color: [185, 195, 205] },
      { stop: 0.88, color: [215, 220, 225] },
      { stop: 1, color: [245, 248, 250] },
    ],
    labelAccent: [200, 210, 225],
    canvasBg: "#000000",
  },
  plasma: {
    name: "Plasma",
    stops: [
      { stop: 0, color: [13, 8, 135] },
      { stop: 0.13, color: [75, 3, 161] },
      { stop: 0.25, color: [125, 3, 168] },
      { stop: 0.38, color: [168, 34, 150] },
      { stop: 0.5, color: [203, 70, 121] },
      { stop: 0.63, color: [229, 107, 93] },
      { stop: 0.75, color: [248, 148, 65] },
      { stop: 0.88, color: [253, 195, 40] },
      { stop: 1, color: [240, 249, 33] },
    ],
    labelAccent: [240, 180, 100],
    canvasBg: "#0d0887",
  },
  ocean: {
    name: "Ocean",
    stops: [
      { stop: 0, color: [8, 12, 24] },
      { stop: 0.15, color: [16, 32, 64] },
      { stop: 0.3, color: [24, 56, 104] },
      { stop: 0.45, color: [32, 88, 144] },
      { stop: 0.6, color: [48, 128, 176] },
      { stop: 0.75, color: [80, 176, 200] },
      { stop: 0.88, color: [144, 216, 224] },
      { stop: 1, color: [208, 244, 248] },
    ],
    labelAccent: [100, 200, 240],
    canvasBg: "#080c18",
  },
};

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

/**
 * Normalize scores using min-max normalization to amplify differences.
 * Maps the score range to [0, 1] based on the min and max values in the current set.
 */
const normalizeScoresMinMax = (
  scores: Record<string, number>
): Record<string, number> => {
  const values = Object.values(scores);
  if (values.length === 0) return {};

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // If all scores are the same, return 0.5 for all
  if (range === 0) {
    const normalized: Record<string, number> = {};
    for (const key of Object.keys(scores)) {
      normalized[key] = 0.5;
    }
    return normalized;
  }

  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(scores)) {
    normalized[key] = (value - min) / range;
  }
  return normalized;
};

/**
 * Clamp scores to [0, 1] range for visualization.
 * Negative values (anti-correlation) become 0, positive values map linearly.
 * This matches the FLAM paper visualization where the scale is 0.0 to 1.0.
 */
const clampScoresToPositive = (
  scores: Record<string, number>
): Record<string, number> => {
  const clamped: Record<string, number> = {};
  for (const [key, value] of Object.entries(scores)) {
    // Clamp to [0, 1]: negative → 0, positive stays as-is (already in ~[-1, 1] range)
    clamped[key] = Math.max(0, Math.min(1, value));
  }
  return clamped;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const lerp = (start: number, end: number, amount: number): number =>
  start + (end - start) * amount;

/**
 * Generate a color for a heatmap value using the given color stops.
 * @param value - Normalized value between 0 and 1
 * @param stops - Array of color stops defining the gradient
 */
const getColorFromStops = (value: number, stops: HeatColorStop[]): string => {
  const clamped = Math.min(1, Math.max(0, value));
  let start = stops[0];
  let end = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i += 1) {
    const current = stops[i];
    const next = stops[i + 1];
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

// Legacy heatColor using default HEAT_COLORS (fallback)
const heatColor = (value: number): string => {
  return getColorFromStops(value, HEAT_COLORS);
};

/**
 * Get dynamic label styling based on score and theme (Immersive Flow).
 * Higher scores = more prominent (bold, bright, opaque).
 * Color uses the theme's label accent color.
 */
const getDynamicLabelStyle = (score: number, theme: ThemeColors): React.CSSProperties => {
  const normalizedScore = Math.max(0, Math.min(1, score));
  const [r, g, b] = theme.labelAccent;
  return {
    opacity: 0.3 + (normalizedScore * 0.7), // 0.3 to 1.0
    fontWeight: 400 + Math.round(normalizedScore * 300), // 400 to 700
    color: `rgba(${r}, ${g}, ${b}, ${0.6 + normalizedScore * 0.4})`,
    transition: 'all 0.3s ease',
  };
};

/**
 * Collapsible section header component for Classic view
 */
const CollapsibleHeader = ({
  title,
  isCollapsed,
  onToggle,
}: {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      background: "transparent",
      border: "none",
      padding: 0,
      cursor: "pointer",
      color: "inherit",
    }}
  >
    <h2 style={{ margin: 0 }}>{title}</h2>
    <span
      style={{
        fontSize: "12px",
        color: "var(--muted)",
        transition: "transform 0.2s ease",
        transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)",
      }}
    >
      ▼
    </span>
  </button>
);

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
  const [promptInput, setPromptInput] = useState<string>(DEFAULT_PROMPTS.join("; "));
  const [classificationScores, setClassificationScores] = useState<Record<string, number>>({});
  const [frameScores, setFrameScores] = useState<Record<string, number[]>>({}); // Frame-wise scores from local similarity
  const [isClassifying, setIsClassifying] = useState<boolean>(false);
  const [classifyError, setClassifyError] = useState<string>("");
  const [bufferSeconds, setBufferSeconds] = useState<number>(DEFAULT_BUFFER_SECONDS);
  const [normalizeScores, setNormalizeScores] = useState<boolean>(false); // Use clamping by default (matches paper)
  const [slideSpeed, setSlideSpeed] = useState<number>(DEFAULT_SLIDE_SPEED); // Pixels per frame for spectrogram/heatmap
const [musicDecomposition, setMusicDecomposition] = useState<boolean>(false); // Toggle for instrument prompts
  const [scoresExpanded, setScoresExpanded] = useState<boolean>(false); // Toggle for expanded scores list
const [sortByScore, setSortByScore] = useState<boolean>(true); // Sort by score ON by default (Immersive Flow)
  const [colorTheme, setColorTheme] = useState<ColorTheme>("inferno"); // Visualization color theme
    const [inputMode, setInputMode] = useState<InputMode>("youtube"); // Tab: microphone or youtube
    const [settingsOpen, setSettingsOpen] = useState<boolean>(false); // Settings slide-out panel
const [layoutMode, setLayoutMode] = useState<"immersive" | "classic">("immersive"); // Layout toggle

  // Classic view collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    audioInput: false,
    soundCategories: false,
    inferenceSettings: true, // Start collapsed
    systemInfo: true, // Start collapsed
  });

  // Immersive video modal state
  const [showVideoModal, setShowVideoModal] = useState(true); // Video modal visibility toggle
  const [videoModalPosition, setVideoModalPosition] = useState({ x: Math.max(20, (window.innerWidth - 450) / 2), y: Math.max(20, (window.innerHeight - 400) / 2 - 100) });
  const [videoModalSize, setVideoModalSize] = useState({ width: 400, height: 280 });
  const [isDraggingModal, setIsDraggingModal] = useState(false);
  const [isResizingModal, setIsResizingModal] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });

  // Floating labels modal state (immersive mode)
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const [labelsModalPosition, setLabelsModalPosition] = useState({ x: 440, y: 20 });
  const [labelsModalHeight, setLabelsModalHeight] = useState(400);
  const [isDraggingLabelsModal, setIsDraggingLabelsModal] = useState(false);
  const [isResizingLabelsModal, setIsResizingLabelsModal] = useState(false);
  const labelsModalDragOffsetRef = useRef({ x: 0, y: 0 });
  const labelsModalResizeStartRef = useRef({ height: 0, mouseY: 0 });

  // Floating prompts modal state (immersive mode)
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [promptsModalPosition, setPromptsModalPosition] = useState({ x: 740, y: 20 });
  const [promptsModalHeight, setPromptsModalHeight] = useState(400);
  const [isDraggingPromptsModal, setIsDraggingPromptsModal] = useState(false);
  const [isResizingPromptsModal, setIsResizingPromptsModal] = useState(false);
  const promptsModalDragOffsetRef = useRef({ x: 0, y: 0 });
  const promptsModalResizeStartRef = useRef({ height: 0, mouseY: 0 });
  const [promptsModalInput, setPromptsModalInput] = useState("");

  // Inline search state for video modal
  const [showVideoModalSearch, setShowVideoModalSearch] = useState(false);
  const [videoModalSearchUrl, setVideoModalSearchUrl] = useState("");

  // Cumulative Statistics state
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsModalPosition, setStatsModalPosition] = useState({ x: 100, y: 100 });
  const [isDraggingStatsModal, setIsDraggingStatsModal] = useState(false);
  const statsModalDragOffsetRef = useRef({ x: 0, y: 0 });
  const [scoreHistory, setScoreHistory] = useState<Record<string, number[]>>({}); // All scores over time per label
  const [topRankedHistory, setTopRankedHistory] = useState<string[]>([]); // Which label was #1 at each inference (chronological)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [totalInferences, setTotalInferences] = useState<number>(0);
  const [tableSortBy, setTableSortBy] = useState<"median" | "peak">("median"); // Sort order for label gauges table
  const [hoveredCdfLabel, setHoveredCdfLabel] = useState<string | null>(null); // Hovered point in CDF chart
  const [hoveredCdfPos, setHoveredCdfPos] = useState<{ x: number; y: number } | null>(null); // Position for CDF tooltip
  const [hoveredHistogramBin, setHoveredHistogramBin] = useState<{ count: number; x: number; y: number } | null>(null); // Hovered histogram bin

  // About modal state
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Webcam modal state (microphone mode)
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamModalPosition, setWebcamModalPosition] = useState({ x: Math.max(20, (window.innerWidth - 370) / 2), y: Math.max(20, (window.innerHeight - 320) / 2 - 50) });
  const [webcamModalSize, setWebcamModalSize] = useState({ width: 320, height: 240 });
  const [isDraggingWebcamModal, setIsDraggingWebcamModal] = useState(false);
  const [isResizingWebcamModal, setIsResizingWebcamModal] = useState(false);
  const webcamDragOffsetRef = useRef({ x: 0, y: 0 });
  const webcamResizeStartRef = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });
  const [webcamDevices, setWebcamDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedWebcamId, setSelectedWebcamId] = useState<string>("");
  const [webcamError, setWebcamError] = useState<string>("");
  const [webcamActive, setWebcamActive] = useState(false);

// YouTube Analysis state
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [youtubePreparing, setYoutubePreparing] = useState<boolean>(false);
  const [youtubeVideo, setYoutubeVideo] = useState<PrepareVideoResponse | null>(null);
  const [youtubeError, setYoutubeError] = useState<string>("");
const [youtubeAnalyzing, setYoutubeAnalyzing] = useState<boolean>(false);
const videoRef = useRef<HTMLVideoElement>(null);
  const videoAudioContextRef = useRef<AudioContext | null>(null);
  const videoSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const videoScriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const videoAudioBufferRef = useRef<Float32Array[]>([]);
  const videoAnalyserRef = useRef<AnalyserNode | null>(null);

  // Refs to access latest state values in closures (for ScriptProcessorNode callbacks)
  const bufferSecondsRef = useRef<number>(DEFAULT_BUFFER_SECONDS);
  const youtubeAnalyzingRef = useRef<boolean>(false);
  const colorThemeRef = useRef<ColorTheme>("inferno");

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
  const frameCounterRef = useRef<number>(0); // For frame skipping to control slide speed

  // Ref to hold current classification scores for draw loop
  const classificationScoresRef = useRef<Record<string, number>>({});
  const frameScoresRef = useRef<Record<string, number[]>>({}); // Frame-wise scores for temporal heatmap
  const promptsRef = useRef<string[]>(DEFAULT_PROMPTS);
  const normalizeScoresRef = useRef<boolean>(false);

  // Webcam refs
  const webcamRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

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
  // Video Heatmap Draw Loop (for YouTube mode)
  // ---------------------------------------------------------------------------
  useEffect(() => {
if (!youtubeAnalyzing || !heatmapRef.current || !spectrogramRef.current) return;

    const heatmapCanvas = heatmapRef.current;
    const heatmapContext = heatmapCanvas.getContext("2d");
    const spectrogramCanvas = spectrogramRef.current;
    const spectrogramContext = spectrogramCanvas.getContext("2d");
    if (!heatmapContext || !spectrogramContext) return;

    heatmapContext.imageSmoothingEnabled = false;
    spectrogramContext.imageSmoothingEnabled = false;

    let animationId: number;
    let frameCount = 0;

    const drawVideoVisuals = (): void => {
      if (!heatmapRef.current || !heatmapContext || !spectrogramRef.current || !spectrogramContext) return;

      // Frame skipping for slower scroll speeds
      frameCount += 1;
      const frameSkip = FRAME_SKIP_MAP[slideSpeed] || 1;
      const shouldDraw = frameCount % frameSkip === 0;

      if (shouldDraw) {
        // Draw spectrogram from video analyser
        const analyser = videoAnalyserRef.current;
        if (analyser) {
          const bufferLength = analyser.frequencyBinCount;
          const freqData = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(freqData);

          // Shift spectrogram left by 1 pixel
          spectrogramContext.drawImage(spectrogramCanvas, -1, 0);
          const range = freqRange.max - freqRange.min || 1;
          for (let y = 0; y < spectrogramCanvas.height; y += 1) {
            const freq = freqRange.min + (y / spectrogramCanvas.height) * range;
            const index = Math.floor((freq / nyquist) * bufferLength);
            const safeIndex = clamp(index, 0, bufferLength - 1);
            const intensity = freqData[safeIndex] / 255;
              const themeStops = COLOR_THEMES[colorThemeRef.current].stops;
              spectrogramContext.fillStyle = getColorFromStops(intensity, themeStops);
            spectrogramContext.fillRect(
              spectrogramCanvas.width - 1,
              spectrogramCanvas.height - y - 1,
              1,
              1
            );
          }
        }

        // Draw heatmap - ALWAYS shift to stay in sync with spectrogram
        heatmapContext.drawImage(heatmapCanvas, -1, 0);

        const currentPrompts = promptsRef.current;
        const currentScores = classificationScoresRef.current;
        const useNormalization = normalizeScoresRef.current;
        const rowHeight = heatmapCanvas.height / currentPrompts.length;

        // Compute display values (use 0 if no scores yet)
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
          heatmapContext.fillRect(
            heatmapCanvas.width - 1,
            row * rowHeight,
            1,
            rowHeight
          );
        });
      }

      animationId = requestAnimationFrame(drawVideoVisuals);
    };

    animationId = requestAnimationFrame(drawVideoVisuals);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [youtubeAnalyzing, slideSpeed, freqRange.min, freqRange.max, nyquist, layoutMode]);

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

  // Refresh webcam devices
  const refreshWebcamDevices = useCallback(async (): Promise<void> => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter(
        (device) => device.kind === "videoinput"
      );
      setWebcamDevices(videoInputs);
      if (!selectedWebcamId && videoInputs.length > 0) {
        setSelectedWebcamId(videoInputs[0].deviceId);
      }
    } catch {
      setWebcamError("Failed to enumerate video devices.");
    }
  }, [selectedWebcamId]);

  // Start webcam capture
  const startWebcam = useCallback(async (): Promise<void> => {
    try {
      setWebcamError("");

      // Stop any existing webcam stream
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: selectedWebcamId ? { deviceId: { exact: selectedWebcamId } } : true,
        audio: false, // No audio to avoid interference with mic capture
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      webcamStreamRef.current = stream;

      setWebcamActive(true);
      setShowWebcamModal(true);

      // Refresh devices to get proper labels after permission granted
      await refreshWebcamDevices();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access webcam";
      setWebcamError(message);
      setWebcamActive(false);
    }
  }, [selectedWebcamId, refreshWebcamDevices]);

  // Stop webcam capture
  const stopWebcam = useCallback((): void => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }
    if (webcamRef.current) {
      webcamRef.current.srcObject = null;
    }
    setWebcamActive(false);
  }, []);

  // Keep refs in sync with state for draw loop
  // ---------------------------------------------------------------------------
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

  // Keep bufferSecondsRef in sync with state
  useEffect(() => {
    bufferSecondsRef.current = bufferSeconds;
  }, [bufferSeconds]);

  // Keep youtubeAnalyzingRef in sync with state
  useEffect(() => {
    youtubeAnalyzingRef.current = youtubeAnalyzing;
  }, [youtubeAnalyzing]);

  // Keep colorThemeRef in sync with state
  useEffect(() => {
    colorThemeRef.current = colorTheme;
  }, [colorTheme]);

  // Set webcam srcObject when video element is mounted and stream is available
  useEffect(() => {
    if (webcamActive && webcamRef.current && webcamStreamRef.current) {
      webcamRef.current.srcObject = webcamStreamRef.current;
    }
  }, [webcamActive]);

// ---------------------------------------------------------------------------
  // Classification Logic
  // ---------------------------------------------------------------------------
const classifyVideoBuffer = useCallback(async (sampleRateVideo: number): Promise<void> => {
    // Don't classify if video is paused/stopped or buffer is empty
    if (isClassifying || videoAudioBufferRef.current.length === 0 || !youtubeAnalyzingRef.current) {
      // Clear buffer if not analyzing to prevent stale data
      if (!youtubeAnalyzingRef.current) {
        videoAudioBufferRef.current = [];
      }
      return;
    }

    setIsClassifying(true);
    const startTime = performance.now();

    try {
      // Concatenate all buffered samples
      const totalLength = videoAudioBufferRef.current.reduce((sum, arr) => sum + arr.length, 0);
      const allSamples = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of videoAudioBufferRef.current) {
        allSamples.set(chunk, offset);
        offset += chunk.length;
      }

      // Clear buffer for next window
      videoAudioBufferRef.current = [];

      // Resample to 48kHz if needed
      const resampledSamples = sampleRateVideo !== TARGET_SAMPLE_RATE
        ? resampleAudio(allSamples, sampleRateVideo, TARGET_SAMPLE_RATE)
        : allSamples;

      // Convert to WAV blob
      const wavBlob = audioSamplesToWavBlob(resampledSamples, TARGET_SAMPLE_RATE);

      // Send to backend using LOCAL endpoint for frame-wise scores
      const currentPrompts = promptsRef.current;
      const result = await classifyAudioLocal(wavBlob, currentPrompts, "unbiased");

      // Update scores and timing
      const elapsedMs = performance.now() - startTime;
      setClassificationScores(result.global_scores);
      setFrameScores(result.frame_scores);
      // Track cumulative statistics
      setScoreHistory((prev) => {
        const updated = { ...prev };
        for (const [label, score] of Object.entries(result.global_scores)) {
          if (!updated[label]) updated[label] = [];
          updated[label].push(score);
        }
        return updated;
      });
      // Track which label was top-ranked (#1) at this inference
      const topLabel = Object.entries(result.global_scores).reduce((best, [label, score]) =>
        score > best.score ? { label, score } : best, { label: "", score: -1 }
      ).label;
      if (topLabel) setTopRankedHistory((prev) => [...prev, topLabel]);
      setTotalInferences((prev) => prev + 1);
      if (!sessionStartTime) setSessionStartTime(Date.now());
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
    } catch (err) {
      console.error("Video classification failed:", err);
      setClassifyError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setIsClassifying(false);
    }
  }, [isClassifying]);

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

      // Send to backend using LOCAL endpoint for frame-wise scores
      const currentPrompts = promptsRef.current;
      const result = await classifyAudioLocal(wavBlob, currentPrompts, "unbiased");

      // Update scores and timing
      const elapsedMs = performance.now() - startTime;
      // Use global_scores for the numerical display and heatmap strip
      setClassificationScores(result.global_scores);
      // Store frame-wise scores for potential future use (temporal heatmap)
      setFrameScores(result.frame_scores);
      // Track cumulative statistics
      setScoreHistory((prev) => {
        const updated = { ...prev };
        for (const [label, score] of Object.entries(result.global_scores)) {
          if (!updated[label]) updated[label] = [];
          updated[label].push(score);
        }
        return updated;
      });
      // Track which label was top-ranked (#1) at this inference
      const topLabel = Object.entries(result.global_scores).reduce((best, [label, score]) =>
        score > best.score ? { label, score } : best, { label: "", score: -1 }
      ).label;
      if (topLabel) setTopRankedHistory((prev) => [...prev, topLabel]);
      setTotalInferences((prev) => prev + 1);
      if (!sessionStartTime) setSessionStartTime(Date.now());
      setLastInferenceTime(elapsedMs);
      setInferenceCount((prev) => prev + 1);
      if (result.timing) {
        // Adapt timing breakdown for local similarity response
        setTimingBreakdown({
          read_ms: result.timing.read_ms,
          decode_ms: result.timing.decode_ms,
          tensor_ms: result.timing.tensor_ms,
          audio_embed_ms: result.timing.local_similarity_ms, // local similarity is the main compute
          similarity_ms: 0, // Not applicable for local endpoint
          total_ms: result.timing.total_ms,
        });
      }
      setClassifyError("");
    } catch (err) {
      console.error("Classification failed:", err);
      setClassifyError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setIsClassifying(false);
    }
  }, [isClassifying]); // Removed prompts from deps - we use ref instead

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

        // Frame skipping for slower scroll speeds
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

        // Only draw/shift canvases on non-skipped frames
        if (shouldDraw) {
          analyser.getByteFrequencyData(freqData);

          // Shift spectrogram left by 1 pixel
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

          // Shift heatmap left by 1 pixel
          heatmapContext.drawImage(heatmapCanvas, -1, 0);
          const currentPrompts = promptsRef.current;
          const currentScores = classificationScoresRef.current;
          const useNormalization = normalizeScoresRef.current;
          const rowHeight = heatmapCanvas.height / currentPrompts.length;

          // Compute display values based on mode
          // If normalize mode: use min-max normalization (lowest=0, highest=1)
          // If clamp mode: clamp negative to 0
          let displayValues: Record<string, number> = {};
          if (Object.keys(currentScores).length > 0) {
            if (useNormalization) {
              // Min-max normalization: stretch to fill 0-1 range
              const values = Object.values(currentScores);
              const min = Math.min(...values);
              const max = Math.max(...values);
              const range = max - min || 1;
              for (const [key, val] of Object.entries(currentScores)) {
                displayValues[key] = (val - min) / range;
              }
            } else {
              // Clamp mode: negative → 0
              for (const [key, val] of Object.entries(currentScores)) {
                displayValues[key] = Math.max(0, Math.min(1, val));
              }
            }
          }

        currentPrompts.forEach((prompt, row) => {
            const value = displayValues[prompt] ?? 0;
            const themeStops = COLOR_THEMES[colorThemeRef.current].stops;
            heatmapContext.fillStyle = getColorFromStops(value, themeStops);
            heatmapContext.fillRect(
              heatmapCanvas.width - 1,
              row * rowHeight,
              1,
              rowHeight
            );
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
  };

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    refreshDevices();
    refreshWebcamDevices();
    if (!navigator.mediaDevices?.addEventListener) {
      return undefined;
    }

    const handleDeviceChange = () => {
      refreshDevices();
      refreshWebcamDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [refreshDevices, refreshWebcamDevices]);

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

  // Cleanup webcam when switching away from microphone mode or on unmount
  useEffect(() => {
    if (inputMode !== "microphone" && webcamActive) {
      stopWebcam();
    }
  }, [inputMode, webcamActive, stopWebcam]);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }
    };
  }, []);

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

// Compute display scores for labels (keep original order for heatmap alignment)
  const promptsWithScores = useMemo(() => {
    const displayScores = Object.keys(classificationScores).length > 0
      ? (normalizeScores
          ? normalizeScoresMinMax(classificationScores)
          : clampScoresToPositive(classificationScores))
      : {};

    // Keep original prompt order for heatmap alignment
    return prompts.map(prompt => ({
      prompt,
      rawScore: classificationScores[prompt] ?? 0,
      displayScore: displayScores[prompt] ?? 0,
      isTop: classificationScores[prompt] === Math.max(...Object.values(classificationScores)),
    }));
  }, [prompts, classificationScores, normalizeScores]);

  // Dynamic heatmap height
  const heatmapHeight = Math.max(300, prompts.length * 20);

  // Immersive Flow Layout
  if (layoutMode === "immersive") {
    return (
      <div className="immersive-page">
        {/* Top Header */}
        <header className="immersive-header">
          <div className="logo">
            <span className="logo-icon">🎧</span>
            <span>SonoTag</span>
          </div>

          <div className="controls-row">
            {/* Mode Tabs */}
            <div className="mode-tabs">
              <button
                type="button"
                className={`mode-tab ${inputMode === "youtube" ? "active" : ""}`}
                onClick={() => {
                  setInputMode("youtube");
                  if (status === "running") stopMonitoring();
                }}
              >
                YouTube
              </button>
              <button
                type="button"
                className={`mode-tab ${inputMode === "microphone" ? "active" : ""}`}
                onClick={() => {
                  setInputMode("microphone");
                  setYoutubeAnalyzing(false);
                  videoAudioBufferRef.current = [];
                }}
              >
                Microphone
              </button>
            </div>

            {/* Settings Button */}
            <button
              type="button"
              className="settings-btn"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
            >
              ⚙️
            </button>

            {/* About Button */}
            <button
              type="button"
              className="settings-btn"
              onClick={() => setShowAboutModal(true)}
              title="About SonoTag"
            >
              ℹ️
            </button>

            {/* Status */}
            <div className="status-indicator">
              <span className={`status-dot ${(youtubeAnalyzing || status === "running") ? "active" : ""}`} />
              <span>{youtubeAnalyzing ? "Analyzing" : status === "running" ? "Recording" : "Idle"}</span>
            </div>
          </div>
        </header>

        {/* Main Visualization Area */}
        <main className="immersive-main">
          <div className="viz-container">
            {/* Spectrogram */}
              <div className="spectrogram-section">
                  {/* Spectrogram label - aligned with FLAM Detection label */}
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
                  {/* Minimal Hz scale on left edge */}
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
                  <canvas
                    ref={spectrogramRef}
                    width={1200}
                    height={200}
                  />
                </div>
                {/* Quick Action Buttons - detached individual buttons */}
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
                        if (!showPromptsModal) {
                          setPromptsModalInput(prompts.join("; "));
                        }
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
                        onClick={() => {
                          if (webcamActive) {
                            stopWebcam();
                          } else {
                            startWebcam();
                          }
                        }}
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
                  <canvas
                    ref={heatmapRef}
                    width={1200}
                    height={heatmapHeight}
                  />
                </div>

                {/* Dynamic Labels - original order to match heatmap rows */}
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

        {/* Floating Video Modal - draggable and resizable */}
        {inputMode === "youtube" && youtubeVideo && (
          <div
            className="floating-video-modal"
            style={{
              position: "fixed",
              left: videoModalPosition.x,
              top: videoModalPosition.y,
              width: videoModalSize.width,
              height: videoModalSize.height,
              zIndex: 500,
              background: "rgba(15, 20, 30, 0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              visibility: showVideoModal ? "visible" : "hidden",
              opacity: showVideoModal ? 1 : 0,
              transition: "opacity 0.2s ease, visibility 0.2s ease",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drag handle - top bar (transparent glassmorphism) */}
            <div
              className="modal-drag-handle"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingModal(true);
                dragOffsetRef.current = {
                  x: e.clientX - videoModalPosition.x,
                  y: e.clientY - videoModalPosition.y,
                };
              }}
              style={{
                height: "28px",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 10px",
                cursor: "grab",
                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {youtubeVideo.title}
              </span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "8px" }}>
                {youtubeAnalyzing && (
                  <span style={{ fontSize: "9px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", animation: "pulse 2s ease infinite" }} />
                    Live
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowLabelsModal(!showLabelsModal)}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    background: showLabelsModal ? "rgba(255, 255, 255, 0.1)" : "transparent",
                    border: "none",
                    color: showLabelsModal ? "var(--text)" : "var(--muted)",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                  title="Toggle labels panel"
                >
                  Labels
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setShowVideoModalSearch(!showVideoModalSearch);
                    if (!showVideoModalSearch) {
                      setVideoModalSearchUrl("");
                    }
                  }}
                  style={{
                    background: showVideoModalSearch ? "rgba(255, 255, 255, 0.1)" : "transparent",
                    border: "none",
                    color: showVideoModalSearch ? "var(--text)" : "var(--muted)",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "2px 4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Search new video"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setYoutubeAnalyzing(false);
                    videoAudioBufferRef.current = [];
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
                    if (youtubeVideo) {
                      cleanupVideo(youtubeVideo.video_id).catch(() => {});
                    }
                    setYoutubeVideo(null);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "2px 4px",
                  }}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Inline search input */}
            {showVideoModalSearch && (
              <div
                style={{
                  padding: "8px 10px",
                  background: "rgba(15, 21, 32, 0.95)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  value={videoModalSearchUrl}
                  onChange={(e) => setVideoModalSearchUrl(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && videoModalSearchUrl.trim()) {
                      // Clean up current video audio resources
                      setYoutubeAnalyzing(false);
                      videoAudioBufferRef.current = [];
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
                      if (youtubeVideo) {
                        cleanupVideo(youtubeVideo.video_id).catch(() => {});
                      }
                      // Load new video
                      setYoutubePreparing(true);
                      setYoutubeError("");
                      try {
                        const result = await prepareYouTubeVideo(videoModalSearchUrl);
                        setYoutubeVideo(result);
                        setYoutubeUrl(videoModalSearchUrl);
                        setShowVideoModalSearch(false);
                        setVideoModalSearchUrl("");
                      } catch (err) {
                        setYoutubeError(err instanceof Error ? err.message : "Failed");
                      } finally {
                        setYoutubePreparing(false);
                      }
                    }
                  }}
                  placeholder="Paste YouTube URL..."
                  style={{
                    flex: 1,
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    color: "var(--text)",
                    outline: "none",
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!videoModalSearchUrl.trim()) return;
                    // Clean up current video audio resources
                    setYoutubeAnalyzing(false);
                    videoAudioBufferRef.current = [];
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
                    if (youtubeVideo) {
                      cleanupVideo(youtubeVideo.video_id).catch(() => {});
                    }
                    // Load new video
                    setYoutubePreparing(true);
                    setYoutubeError("");
                    try {
                      const result = await prepareYouTubeVideo(videoModalSearchUrl);
                      setYoutubeVideo(result);
                      setYoutubeUrl(videoModalSearchUrl);
                      setShowVideoModalSearch(false);
                      setVideoModalSearchUrl("");
                    } catch (err) {
                      setYoutubeError(err instanceof Error ? err.message : "Failed");
                    } finally {
                      setYoutubePreparing(false);
                    }
                  }}
                  disabled={youtubePreparing || !videoModalSearchUrl.trim()}
                  style={{
                    background: "var(--accent)",
                    border: "none",
                    borderRadius: "4px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    color: "#000",
                    cursor: "pointer",
                    opacity: youtubePreparing || !videoModalSearchUrl.trim() ? 0.5 : 1,
                  }}
                >
                  {youtubePreparing ? "..." : "Load"}
                </button>
              </div>
            )}

            {/* Video element */}
            <video
              ref={videoRef}
              src={getVideoStreamUrl(youtubeVideo.video_id)}
              controls
              crossOrigin="anonymous"
              style={{
                width: "100%",
                flex: 1,
                background: "#000",
                display: "block",
                minHeight: 0,
              }}
              onPlay={() => {
                if (!videoRef.current) return;
                if (!videoAudioContextRef.current) {
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
              }}
              onPause={() => {
                setYoutubeAnalyzing(false);
                videoAudioBufferRef.current = [];
              }}
              onEnded={() => {
                setYoutubeAnalyzing(false);
                videoAudioBufferRef.current = [];
              }}
            />

            {/* Resize handle - bottom right corner */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingModal(true);
                resizeStartRef.current = {
                  width: videoModalSize.width,
                  height: videoModalSize.height,
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                };
              }}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "16px",
                height: "16px",
                cursor: "nwse-resize",
                background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%)",
              }}
            />
          </div>
        )}

        {/* Floating Webcam Modal - microphone mode only */}
        {inputMode === "microphone" && webcamActive && (
          <div
            className="floating-video-modal floating-webcam-modal"
            style={{
              position: "fixed",
              left: webcamModalPosition.x,
              top: webcamModalPosition.y,
              width: webcamModalSize.width,
              height: webcamModalSize.height,
              zIndex: 500,
              background: "rgba(15, 20, 30, 0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              visibility: showWebcamModal ? "visible" : "hidden",
              opacity: showWebcamModal ? 1 : 0,
              transition: "opacity 0.2s ease, visibility 0.2s ease",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drag handle - top bar */}
            <div
              className="modal-drag-handle"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingWebcamModal(true);
                webcamDragOffsetRef.current = {
                  x: e.clientX - webcamModalPosition.x,
                  y: e.clientY - webcamModalPosition.y,
                };
              }}
              style={{
                height: "28px",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 10px",
                cursor: "grab",
                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                Webcam
              </span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "8px" }}>
                {webcamActive && (
                  <span style={{ fontSize: "9px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", animation: "pulse 2s ease infinite" }} />
                    Live
                  </span>
                )}
                {/* Camera device selector */}
                {webcamDevices.length > 1 && (
                  <select
                    value={selectedWebcamId}
                    onChange={async (e) => {
                      e.stopPropagation();
                      setSelectedWebcamId(e.target.value);
                      // Restart webcam with new device
                      if (webcamActive) {
                        stopWebcam();
                        setTimeout(() => startWebcam(), 100);
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "4px",
                      padding: "2px 4px",
                      fontSize: "9px",
                      color: "var(--text)",
                      cursor: "pointer",
                      maxWidth: "100px",
                    }}
                  >
                    {webcamDevices.map((device, index) => (
                      <option key={device.deviceId || index} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                )}
                {/* Hide/Show toggle */}
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setShowWebcamModal(!showWebcamModal)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: "2px 4px",
                  }}
                  title={showWebcamModal ? "Hide" : "Show"}
                >
                  {showWebcamModal ? "−" : "+"}
                </button>
                {/* Close button */}
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    stopWebcam();
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "2px 4px",
                  }}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Webcam video element */}
            <video
              ref={(el) => {
                webcamRef.current = el;
                // Only set srcObject if not already set (prevents flashing on re-renders)
                if (el && webcamStreamRef.current && el.srcObject !== webcamStreamRef.current) {
                  el.srcObject = webcamStreamRef.current;
                }
              }}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                flex: 1,
                background: "#000",
                display: "block",
                objectFit: "cover",
                transform: "scaleX(-1)", // Mirror horizontally for natural UX
              }}
            />

            {/* Webcam error display */}
            {webcamError && (
              <div style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                right: "8px",
                padding: "6px 10px",
                background: "rgba(255, 107, 107, 0.9)",
                borderRadius: "4px",
                fontSize: "11px",
                color: "#fff",
              }}>
                {webcamError}
              </div>
            )}

            {/* Resize handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizingWebcamModal(true);
                webcamResizeStartRef.current = {
                  width: webcamModalSize.width,
                  height: webcamModalSize.height,
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                };
              }}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "16px",
                height: "16px",
                cursor: "nwse-resize",
                background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%)",
              }}
            />
          </div>
        )}

        {/* Global mouse handlers for drag/resize */}
        {(isDraggingModal || isResizingModal || isDraggingLabelsModal || isResizingLabelsModal || isDraggingPromptsModal || isResizingPromptsModal || isDraggingStatsModal || isDraggingWebcamModal || isResizingWebcamModal) && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              cursor: isDraggingModal || isDraggingLabelsModal || isDraggingPromptsModal || isDraggingStatsModal || isDraggingWebcamModal ? "grabbing" : "nwse-resize",
            }}
            onMouseMove={(e) => {
              if (isDraggingModal) {
                setVideoModalPosition({
                  x: Math.max(0, Math.min(window.innerWidth - videoModalSize.width, e.clientX - dragOffsetRef.current.x)),
                  y: Math.max(0, Math.min(window.innerHeight - videoModalSize.height, e.clientY - dragOffsetRef.current.y)),
                });
              } else if (isResizingModal) {
                const deltaX = e.clientX - resizeStartRef.current.mouseX;
                const deltaY = e.clientY - resizeStartRef.current.mouseY;
                setVideoModalSize({
                  width: Math.max(280, Math.min(800, resizeStartRef.current.width + deltaX)),
                  height: Math.max(200, Math.min(600, resizeStartRef.current.height + deltaY)),
                });
              } else if (isDraggingLabelsModal) {
                setLabelsModalPosition({
                  x: Math.max(0, Math.min(window.innerWidth - 280, e.clientX - labelsModalDragOffsetRef.current.x)),
                  y: Math.max(0, Math.min(window.innerHeight - labelsModalHeight, e.clientY - labelsModalDragOffsetRef.current.y)),
                });
              } else if (isResizingLabelsModal) {
                const deltaY = e.clientY - labelsModalResizeStartRef.current.mouseY;
                setLabelsModalHeight(Math.max(200, Math.min(800, labelsModalResizeStartRef.current.height + deltaY)));
              } else if (isDraggingPromptsModal) {
                setPromptsModalPosition({
                  x: Math.max(0, Math.min(window.innerWidth - 320, e.clientX - promptsModalDragOffsetRef.current.x)),
                  y: Math.max(0, Math.min(window.innerHeight - promptsModalHeight, e.clientY - promptsModalDragOffsetRef.current.y)),
                });
              } else if (isResizingPromptsModal) {
                const deltaY = e.clientY - promptsModalResizeStartRef.current.mouseY;
                setPromptsModalHeight(Math.max(200, Math.min(800, promptsModalResizeStartRef.current.height + deltaY)));
              } else if (isDraggingStatsModal) {
                setStatsModalPosition({
                  x: Math.max(0, Math.min(window.innerWidth - 420, e.clientX - statsModalDragOffsetRef.current.x)),
                  y: Math.max(0, Math.min(window.innerHeight - 400, e.clientY - statsModalDragOffsetRef.current.y)),
                });
              } else if (isDraggingWebcamModal) {
                setWebcamModalPosition({
                  x: Math.max(0, Math.min(window.innerWidth - webcamModalSize.width, e.clientX - webcamDragOffsetRef.current.x)),
                  y: Math.max(0, Math.min(window.innerHeight - webcamModalSize.height, e.clientY - webcamDragOffsetRef.current.y)),
                });
              } else if (isResizingWebcamModal) {
                const deltaX = e.clientX - webcamResizeStartRef.current.mouseX;
                const deltaY = e.clientY - webcamResizeStartRef.current.mouseY;
                setWebcamModalSize({
                  width: Math.max(200, Math.min(640, webcamResizeStartRef.current.width + deltaX)),
                  height: Math.max(150, Math.min(480, webcamResizeStartRef.current.height + deltaY)),
                });
              }
            }}
            onMouseUp={() => {
              setIsDraggingModal(false);
              setIsResizingModal(false);
              setIsDraggingLabelsModal(false);
              setIsResizingLabelsModal(false);
              setIsDraggingPromptsModal(false);
              setIsResizingPromptsModal(false);
              setIsDraggingStatsModal(false);
              setIsDraggingWebcamModal(false);
              setIsResizingWebcamModal(false);
            }}
            onMouseLeave={() => {
              setIsDraggingModal(false);
              setIsResizingModal(false);
              setIsDraggingLabelsModal(false);
              setIsResizingLabelsModal(false);
              setIsDraggingPromptsModal(false);
              setIsResizingPromptsModal(false);
              setIsDraggingStatsModal(false);
              setIsDraggingWebcamModal(false);
              setIsResizingWebcamModal(false);
            }}
          />
        )}

        {/* Floating Labels Modal */}
        {showLabelsModal && (
          <div
            className="floating-video-modal floating-labels-modal"
            style={{
              position: "fixed",
              left: labelsModalPosition.x,
              top: labelsModalPosition.y,
              width: 280,
              height: labelsModalHeight,
              zIndex: 501,
              background: "rgba(15, 20, 30, 0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drag handle - top bar (transparent glassmorphism) */}
            <div
              className="modal-drag-handle"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingLabelsModal(true);
                labelsModalDragOffsetRef.current = {
                  x: e.clientX - labelsModalPosition.x,
                  y: e.clientY - labelsModalPosition.y,
                };
              }}
              style={{
                height: "28px",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 10px",
                cursor: "grab",
                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Labels
                </span>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setShowLabelsModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "2px 4px",
                }}
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Labels list */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}>
              {(() => {
                const displayScores = Object.keys(classificationScores).length > 0
                  ? (normalizeScores
                      ? normalizeScoresMinMax(classificationScores)
                      : clampScoresToPositive(classificationScores))
                  : null;

                let sortedPrompts = [...prompts];
                if (Object.keys(classificationScores).length > 0) {
                  sortedPrompts.sort((a, b) => {
                    const scoreA = classificationScores[a] ?? -Infinity;
                    const scoreB = classificationScores[b] ?? -Infinity;
                    return scoreB - scoreA;
                  });
                }

                return sortedPrompts.map((prompt) => {
                  const rawScore = classificationScores[prompt];
                  const hasScore = rawScore !== undefined;
                  let displayIntensity = 0;
                  if (hasScore && displayScores) {
                    displayIntensity = displayScores[prompt] ?? 0;
                  }
                  const isTop = hasScore && rawScore === Math.max(...Object.values(classificationScores));

                  return (
                    <div
                      key={prompt}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                        padding: "6px 8px",
                        background: isTop ? `${getColorFromStops(0.8, COLOR_THEMES[colorTheme].stops)}22` : "rgba(255,255,255,0.03)",
                        borderRadius: "4px",
                        border: isTop ? `1px solid ${getColorFromStops(0.8, COLOR_THEMES[colorTheme].stops)}66` : "1px solid transparent",
                      }}
                    >
                      <span style={{
                        color: isTop ? getColorFromStops(0.9, COLOR_THEMES[colorTheme].stops) : "#aaa",
                        fontWeight: isTop ? 600 : 400,
                        fontSize: "11px",
                      }}>
                        {prompt}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{
                          flex: 1,
                          height: "4px",
                          background: "#1a1a1a",
                          borderRadius: "2px",
                          overflow: "hidden",
                        }}>
                          <div style={{
                            width: `${displayIntensity * 100}%`,
                            height: "100%",
                            background: getColorFromStops(displayIntensity, COLOR_THEMES[colorTheme].stops),
                            transition: "width 0.3s ease",
                          }} />
                        </div>
                        <span style={{
                          fontFamily: "monospace",
                          fontSize: "9px",
                          color: hasScore ? "#fff" : "#555",
                          minWidth: "36px",
                          textAlign: "right",
                        }}>
                          {hasScore ? (rawScore > 0 ? "+" : "") + rawScore.toFixed(2) : "---"}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Resize handle - bottom edge */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingLabelsModal(true);
                labelsModalResizeStartRef.current = {
                  height: labelsModalHeight,
                  mouseY: e.clientY,
                };
              }}
              style={{
                height: "8px",
                cursor: "ns-resize",
                background: "rgba(15, 21, 32, 0.9)",
                borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div style={{
                width: "40px",
                height: "3px",
                borderRadius: "2px",
                background: "rgba(255, 255, 255, 0.2)",
              }} />
            </div>
          </div>
        )}

        {/* Floating Stats Modal */}
        {showStatsModal && (
          <div
            className="floating-video-modal floating-stats-modal"
            style={{
              position: "fixed",
              left: statsModalPosition.x,
              top: statsModalPosition.y,
              width: 420,
              maxHeight: "80vh",
              zIndex: 502,
              background: "rgba(15, 20, 30, 0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drag handle - top bar */}
            <div
              className="modal-drag-handle"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingStatsModal(true);
                statsModalDragOffsetRef.current = {
                  x: e.clientX - statsModalPosition.x,
                  y: e.clientY - statsModalPosition.y,
                };
              }}
              style={{
                height: "32px",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 12px",
                cursor: "grab",
                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--text)", fontWeight: 500 }}>
                Cumulative Statistics
              </span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setScoreHistory({});
                    setTopRankedHistory([]);
                    setTotalInferences(0);
                    setSessionStartTime(null);
                  }}
                  style={{
                    background: "rgba(255, 100, 100, 0.2)",
                    border: "1px solid rgba(255, 100, 100, 0.3)",
                    borderRadius: "4px",
                    color: "#ff6b6b",
                    cursor: "pointer",
                    fontSize: "10px",
                    padding: "2px 8px",
                  }}
                  title="Reset statistics"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setShowStatsModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: "2px 4px",
                  }}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Stats content */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}>
              {/* Session Summary */}
              <div style={{
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: "8px",
                padding: "12px",
              }}>
                <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
                  Session Summary
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--accent)" }}>
                      {totalInferences}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", textTransform: "uppercase" }}>Inferences</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--accent-2)" }}>
                      {sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0}s
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", textTransform: "uppercase" }}>Duration</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--success)" }}>
                      {prompts.length}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", textTransform: "uppercase" }}>Labels</div>
                  </div>
              </div>
            </div>

              {/* Top-Ranked Over Time */}
              {topRankedHistory.length > 0 && (
                <div style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "8px",
                  padding: "12px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Top-Ranked Count Over Time
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                      n={topRankedHistory.length}
                    </div>
                  </div>
                  <div style={{ position: "relative", height: "120px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "4px", padding: "8px" }}>
                    {(() => {
                      const colors = ["#ff7a3d", "#2ad1ff", "#5ce3a2", "#ff6b6b", "#a78bfa", "#fbbf24"];

                      // Build cumulative counts over time for each label
                      // At each time step, record the running count for ALL labels seen so far
                      const runningCounts: Record<string, number> = {};
                      const timeSeriesData: Array<Record<string, number>> = [];

                      topRankedHistory.forEach((winningLabel) => {
                        // Increment the count for the label that won this time step
                        runningCounts[winningLabel] = (runningCounts[winningLabel] || 0) + 1;
                        // Snapshot all current counts at this time step
                        timeSeriesData.push({ ...runningCounts });
                      });

                      // Get final counts and determine top 6
                      const finalCounts = timeSeriesData.length > 0 ? timeSeriesData[timeSeriesData.length - 1] : {};
                      const top6Labels = Object.entries(finalCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([label]) => label);

                      const maxCount = Math.max(...Object.values(finalCounts).map(Number), 1);
                      const totalSteps = topRankedHistory.length;

                      return (
                        <>
                          <svg
                            key={`top-ranked-${topRankedHistory.length}`}
                            width="100%"
                            height="100%"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                          >
                            {/* Grid lines */}
                            <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                            <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                            <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                            {/* Cumulative count curves for top 6 labels */}
                            {top6Labels.map((label, idx) => {
                              // Build points from time series - use 0 if label hasn't appeared yet
                              const points = timeSeriesData.map((snapshot, i) => {
                                const count = snapshot[label] || 0;
                                const x = totalSteps > 1 ? (i / (totalSteps - 1)) * 100 : 50;
                                const y = 100 - (count / maxCount) * 100;
                                return `${x},${y}`;
                              }).join(" ");

                              return (
                                <polyline
                                  key={`${label}-${totalSteps}`}
                                  points={points}
                                  fill="none"
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              );
                            })}
                          </svg>
                          {/* Y-axis labels */}
                          <div style={{ position: "absolute", top: "4px", left: "4px", fontSize: "8px", color: "var(--muted)" }}>
                            {maxCount}
                          </div>
                          <div style={{ position: "absolute", bottom: "4px", left: "4px", fontSize: "8px", color: "var(--muted)" }}>
                            0
                          </div>
                        </>
                      );
                    })()}
                    {/* X-axis labels */}
                    <div style={{ position: "absolute", bottom: "-2px", left: "8px", right: "8px", display: "flex", justifyContent: "space-between", fontSize: "8px", color: "var(--muted)" }}>
                      <span>start</span>
                      <span>time</span>
                      <span>now</span>
                    </div>
                  </div>
                  {/* Legend - dynamic top 6 as 2 rows x 3 columns */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px", marginTop: "8px" }}>
                    {(() => {
                      const colors = ["#ff7a3d", "#2ad1ff", "#5ce3a2", "#ff6b6b", "#a78bfa", "#fbbf24"];
                      const labelCounts: Record<string, number> = {};
                      topRankedHistory.forEach((label) => {
                        labelCounts[label] = (labelCounts[label] || 0) + 1;
                      });

                      return Object.entries(labelCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([label, count], idx) => (
                          <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: colors[idx % colors.length], flexShrink: 0 }} />
                            <span style={{ fontSize: "9px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {label.length > 10 ? `${label.slice(0, 10)}...` : label} ({count})
                            </span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              )}

              {/* CDF Distribution - hidden for now */}
              {false && Object.keys(scoreHistory).length > 0 && (
                <div style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "8px",
                  padding: "12px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Score Distribution (CDF)
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                      n={totalInferences}
                    </div>
                  </div>
                  <div style={{ position: "relative", height: "120px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "4px", padding: "8px" }}>
                    <svg
                      key={`cdf-${totalInferences}`}
                      width="100%"
                      height="100%"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {/* Grid lines */}
                      <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                      <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                      <line x1="25" y1="0" x2="25" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                      <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                      <line x1="75" y1="0" x2="75" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                      {/* CDF curves for top labels (ordered by top-ranked count) */}
                      {(() => {
                        const colors = ["#ff7a3d", "#2ad1ff", "#5ce3a2", "#ff6b6b", "#a78bfa"];
                        const labelTopCounts: Record<string, number> = {};
                        topRankedHistory.forEach((label) => {
                          labelTopCounts[label] = (labelTopCounts[label] || 0) + 1;
                        });

                        const topLabels = Object.entries(scoreHistory)
                          .map(([label, scores]) => ({ label, scores, topCount: labelTopCounts[label] || 0 }))
                          .sort((a, b) => b.topCount - a.topCount)
                          .slice(0, 5);

                        return topLabels.map(({ label, scores }, idx) => {
                          const sorted = [...scores].sort((a, b) => a - b);
                          const points = [];
                          for (let i = 0; i <= 20; i++) {
                            const threshold = i / 20;
                            const countBelow = sorted.filter(s => s <= threshold).length;
                            const cdf = countBelow / sorted.length;
                            points.push(`${threshold * 100},${100 - cdf * 100}`);
                          }
                          return (
                            <polyline
                              key={`${label}-${scores.length}`}
                              points={points.join(" ")}
                              fill="none"
                              stroke={colors[idx % colors.length]}
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          );
                        });
                      })()}
                    </svg>
                    {/* X-axis labels */}
                    <div style={{ position: "absolute", bottom: "-2px", left: "8px", right: "8px", display: "flex", justifyContent: "space-between", fontSize: "8px", color: "var(--muted)" }}>
                      <span>0</span>
                      <span>0.25</span>
                      <span>0.5</span>
                      <span>0.75</span>
                      <span>1.0</span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                    {(() => {
                      const colors = ["#ff7a3d", "#2ad1ff", "#5ce3a2", "#ff6b6b", "#a78bfa"];
                      const labelTopCounts: Record<string, number> = {};
                      topRankedHistory.forEach((label) => {
                        labelTopCounts[label] = (labelTopCounts[label] || 0) + 1;
                      });

                      return Object.entries(scoreHistory)
                        .map(([label]) => ({ label, topCount: labelTopCounts[label] || 0 }))
                        .sort((a, b) => b.topCount - a.topCount)
                        .slice(0, 5)
                        .map(({ label }, idx) => (
                          <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: colors[idx % colors.length] }} />
                            <span style={{ fontSize: "9px", color: "var(--muted)" }}>{label.length > 12 ? `${label.slice(0, 12)}...` : label}</span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              )}

              {/* PDF - Probability Density of Median Scores */}
              {Object.keys(scoreHistory).length > 0 && (
                <div style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "8px",
                  padding: "12px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontSize: "10px", color: "#ff7a3d", textTransform: "uppercase", letterSpacing: "1px" }}>
                      PDF (Median Density)
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                      {Object.keys(scoreHistory).length} labels
                    </div>
                  </div>
                  <div style={{ position: "relative", height: "80px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "4px", padding: "8px" }}>
                    {(() => {
                      const medians = Object.entries(scoreHistory).map(([label, scores]) => {
                        const sorted = [...scores].sort((a, b) => a - b);
                        const median = sorted[Math.floor(sorted.length / 2)] || 0;
                        return { label, median };
                      });

                      const numBins = 20;
                      const bins: number[] = new Array(numBins).fill(0);
                      medians.forEach(({ median }) => {
                        const binIdx = Math.min(Math.floor(median * numBins), numBins - 1);
                        bins[binIdx]++;
                      });

                      const maxBin = Math.max(...bins, 1);

                      return (
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
                          {bins.map((count, i) => {
                            const x = (i / numBins) * 100;
                            const width = 100 / numBins - 0.5;
                            const height = (count / maxBin) * 90;
                            return (
                              <rect
                                key={i}
                                x={x}
                                y={100 - height}
                                width={width}
                                height={height}
                                fill="rgba(255, 122, 61, 0.6)"
                                stroke="#ff7a3d"
                                strokeWidth="0.5"
                              />
                            );
                          })}
                        </svg>
                      );
                    })()}
                    <div style={{ position: "absolute", bottom: "-2px", left: "8px", right: "8px", display: "flex", justifyContent: "space-between", fontSize: "7px", color: "var(--muted)" }}>
                      <span>0</span>
                      <span>0.5</span>
                      <span>1.0</span>
                    </div>
                  </div>
                </div>
              )}

              {/* CDF - Cumulative Distribution of Median Scores */}
              {Object.keys(scoreHistory).length > 0 && (
                <div style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "8px",
                  padding: "12px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontSize: "10px", color: "#2ad1ff", textTransform: "uppercase", letterSpacing: "1px" }}>
                      CDF (Cumulative Distribution)
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                      {Object.keys(scoreHistory).length} labels
                    </div>
                  </div>
                  <div
                    style={{ position: "relative", height: "80px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "4px", padding: "8px" }}
                    onMouseLeave={() => { setHoveredCdfLabel(null); setHoveredCdfPos(null); }}
                  >
                    {(() => {
                      const medians = Object.entries(scoreHistory).map(([label, scores]) => {
                        const sorted = [...scores].sort((a, b) => a - b);
                        const median = sorted[Math.floor(sorted.length / 2)] || 0;
                        return { label, median };
                      }).sort((a, b) => a.median - b.median);

                      const getPointColor = (median: number) => {
                        if (median < 0.33) return "#ff6b6b";
                        if (median < 0.66) return "#fbbf24";
                        return "#5ce3a2";
                      };

                      const cdfPoints = medians.map((m, i) => ({
                        x: m.median * 100,
                        y: 100 - ((i + 1) / medians.length) * 90,
                        label: m.label,
                        median: m.median,
                      }));

                      const linePath = cdfPoints.length > 0
                        ? `M 0,100 L ${cdfPoints.map(p => `${p.x},${p.y}`).join(" L ")} L 100,${cdfPoints[cdfPoints.length - 1]?.y || 10}`
                        : "";

                      return (
                        <svg
                          width="100%"
                          height="100%"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          style={{ cursor: "crosshair" }}
                        >
                          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
                          <path d={`${linePath} L 100,100 L 0,100 Z`} fill="rgba(42, 209, 255, 0.15)" />
                          <path d={linePath} fill="none" stroke="#2ad1ff" strokeWidth="1.5" strokeLinecap="round" />
                          {cdfPoints.map((p, i) => (
                            <circle
                              key={i}
                              cx={p.x}
                              cy={p.y}
                              r={hoveredCdfLabel === p.label ? "4" : "2"}
                              fill={getPointColor(p.median)}
                              stroke={hoveredCdfLabel === p.label ? "#fff" : "rgba(0,0,0,0.5)"}
                              strokeWidth={hoveredCdfLabel === p.label ? "1" : "0.3"}
                              style={{ cursor: "pointer", transition: "r 0.1s, stroke-width 0.1s" }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                if (rect) {
                                  setHoveredCdfLabel(p.label);
                                  setHoveredCdfPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                                }
                              }}
                            />
                          ))}
                        </svg>
                      );
                    })()}
                    {/* Hover tooltip - follows pointer */}
                    {hoveredCdfLabel && hoveredCdfPos && (
                      <div style={{
                        position: "absolute",
                        left: `${Math.min(hoveredCdfPos.x + 10, 200)}px`,
                        top: `${Math.max(hoveredCdfPos.y - 20, 4)}px`,
                        background: "rgba(0, 0, 0, 0.85)",
                        padding: "3px 6px",
                        borderRadius: "3px",
                        fontSize: "8px",
                        color: "#fff",
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                        zIndex: 10,
                      }}>
                        {hoveredCdfLabel.length > 25 ? `${hoveredCdfLabel.slice(0, 25)}...` : hoveredCdfLabel}
                      </div>
                    )}
                    <div style={{ position: "absolute", top: "2px", left: "4px", fontSize: "7px", color: "var(--muted)" }}>100%</div>
                    <div style={{ position: "absolute", bottom: "2px", left: "4px", fontSize: "7px", color: "var(--muted)" }}>0%</div>
                    <div style={{ position: "absolute", bottom: "-2px", left: "8px", right: "8px", display: "flex", justifyContent: "space-between", fontSize: "7px", color: "var(--muted)" }}>
                      <span>0</span>
                      <span>0.5</span>
                      <span>1.0</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Histogram - All Scores Distribution */}
              {Object.keys(scoreHistory).length > 0 && (
                <div style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "8px",
                  padding: "12px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ fontSize: "10px", color: "#5ce3a2", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Score Histogram (All Scores)
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                      n={Object.values(scoreHistory).flat().length}
                    </div>
                  </div>
                  <div
                    style={{ position: "relative", height: "80px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "4px", padding: "8px" }}
                    onMouseLeave={() => setHoveredHistogramBin(null)}
                  >
                    {(() => {
                      const allScores = Object.values(scoreHistory).flat();
                      const numBins = 25;
                      const bins: number[] = new Array(numBins).fill(0);
                      allScores.forEach((score) => {
                        const binIdx = Math.min(Math.floor(score * numBins), numBins - 1);
                        bins[binIdx]++;
                      });

                      const maxBin = Math.max(...bins, 1);

                      return (
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ cursor: "crosshair" }}>
                          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
                          {bins.map((count, i) => {
                            const x = (i / numBins) * 100;
                            const width = 100 / numBins - 0.3;
                            const height = (count / maxBin) * 90;
                            const intensity = i / numBins;
                            const color = intensity < 0.33 ? "rgba(255, 107, 107, 0.7)" : intensity < 0.66 ? "rgba(251, 191, 36, 0.7)" : "rgba(92, 227, 162, 0.7)";
                            return (
                              <rect
                                key={i}
                                x={x}
                                y={100 - height}
                                width={width}
                                height={Math.max(height, 2)}
                                fill={color}
                                stroke="rgba(255,255,255,0.3)"
                                strokeWidth="0.3"
                                style={{ cursor: "pointer" }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                  if (rect) {
                                    setHoveredHistogramBin({ count, x: e.clientX - rect.left, y: e.clientY - rect.top });
                                  }
                                }}
                              />
                            );
                          })}
                        </svg>
                      );
                    })()}
                    {/* Hover tooltip - shows count */}
                    {hoveredHistogramBin && hoveredHistogramBin.count > 0 && (
                      <div style={{
                        position: "absolute",
                        left: hoveredHistogramBin.x > 200 ? `${hoveredHistogramBin.x - 28}px` : `${hoveredHistogramBin.x + 8}px`,
                        top: `${Math.max(hoveredHistogramBin.y - 16, 4)}px`,
                        background: "rgba(0, 0, 0, 0.85)",
                        padding: "2px 5px",
                        borderRadius: "3px",
                        fontSize: "8px",
                        color: "#fff",
                        pointerEvents: "none",
                        zIndex: 10,
                      }}>
                        {hoveredHistogramBin.count}
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: "-2px", left: "8px", right: "8px", display: "flex", justifyContent: "space-between", fontSize: "7px", color: "var(--muted)" }}>
                      <span>0</span>
                      <span>0.5</span>
                      <span>1.0</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Label Gauges - Peak & Median (ALL labels, with sort toggle) */}
              {Object.keys(scoreHistory).length > 0 && (
                <div style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "8px",
                  padding: "12px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                      All Labels (Peak / Median)
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "2px", fontSize: "8px" }}>
                        <button
                          type="button"
                          onClick={() => setTableSortBy("median")}
                          style={{
                            padding: "2px 6px",
                            background: tableSortBy === "median" ? "var(--accent)" : "rgba(255, 255, 255, 0.1)",
                            color: tableSortBy === "median" ? "#fff" : "var(--muted)",
                            border: "none",
                            borderRadius: "3px 0 0 3px",
                            cursor: "pointer",
                            fontSize: "8px",
                          }}
                        >
                          Median
                        </button>
                        <button
                          type="button"
                          onClick={() => setTableSortBy("peak")}
                          style={{
                            padding: "2px 6px",
                            background: tableSortBy === "peak" ? "var(--accent)" : "rgba(255, 255, 255, 0.1)",
                            color: tableSortBy === "peak" ? "#fff" : "var(--muted)",
                            border: "none",
                            borderRadius: "0 3px 3px 0",
                            cursor: "pointer",
                            fontSize: "8px",
                          }}
                        >
                          Peak
                        </button>
                      </div>
                      <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                        {Object.keys(scoreHistory).length}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                    {(() => {
                      const stats = Object.entries(scoreHistory).map(([label, scores]) => {
                        const peak = Math.max(...scores);
                        const sorted = [...scores].sort((a, b) => a - b);
                        const median = sorted[Math.floor(sorted.length / 2)] || 0;
                        return { label, peak, median, count: scores.length };
                      }).sort((a, b) => tableSortBy === "median" ? b.median - a.median : b.peak - a.peak);

                      return stats.map(({ label, peak, median, count }) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "90px", fontSize: "9px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>
                            {label.length > 12 ? `${label.slice(0, 12)}...` : label}
                          </div>
                          <div style={{ flex: 1, height: "10px", background: "rgba(0, 0, 0, 0.4)", borderRadius: "5px", overflow: "hidden", position: "relative" }}>
                            <div style={{
                              width: `${Math.max(0, Math.min(100, peak * 100))}%`,
                              height: "100%",
                              background: `linear-gradient(90deg, ${median < 0.33 ? "#ff6b6b" : median < 0.66 ? "#fbbf24" : "#5ce3a2"}, ${peak < 0.33 ? "#ff6b6b" : peak < 0.66 ? "#fbbf24" : "#5ce3a2"})`,
                              borderRadius: "5px",
                              opacity: 0.7,
                            }} />
                            <div style={{
                              position: "absolute",
                              left: `${Math.max(0, Math.min(97, median * 100))}%`,
                              top: 0,
                              bottom: 0,
                              width: "2px",
                              background: "#fff",
                              boxShadow: "0 0 4px rgba(0,0,0,0.5)",
                            }} />
                          </div>
                          <div style={{ width: "70px", fontSize: "8px", color: "var(--muted)", textAlign: "right", fontFamily: "monospace" }}>
                            {peak.toFixed(2)} / {median.toFixed(2)}
                          </div>
                          <div style={{ width: "30px", fontSize: "7px", color: "var(--muted)", textAlign: "right" }}>
                            ({count})
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {Object.keys(scoreHistory).length === 0 && (
                <div style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "var(--muted)",
                }}>
                  <div style={{ fontSize: "24px", marginBottom: "12px", color: "var(--muted)" }}>No data yet</div>
                  <div style={{ fontSize: "10px", marginTop: "4px" }}>Start analyzing audio to see cumulative statistics</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Prompts Modal */}
        {showPromptsModal && (
          <div
            className="floating-video-modal floating-labels-modal"
            style={{
              position: "fixed",
              left: promptsModalPosition.x,
              top: promptsModalPosition.y,
              width: 320,
              height: promptsModalHeight,
              zIndex: 502,
              background: "rgba(15, 20, 30, 0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drag handle - top bar */}
            <div
              className="modal-drag-handle"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingPromptsModal(true);
                promptsModalDragOffsetRef.current = {
                  x: e.clientX - promptsModalPosition.x,
                  y: e.clientY - promptsModalPosition.y,
                };
              }}
              style={{
                height: "28px",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 10px",
                cursor: "grab",
                borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                Prompts
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setShowPromptsModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "2px 4px",
                }}
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Presets section */}
            <div style={{
              padding: "8px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
            }}>
              <span style={{ fontSize: "9px", color: "var(--muted)", width: "100%", marginBottom: "4px" }}>
                PRESETS
              </span>
              {[
                { name: "Default", prompts: DEFAULT_PROMPTS },
                { name: "Dialog", prompts: DIALOG_MOVIE_PROMPTS },
                { name: "Action", prompts: ACTION_MOVIE_PROMPTS },
                { name: "Sports", prompts: SPORTS_PROMPTS },
                { name: "Music", prompts: MUSIC_DECOMPOSITION_PROMPTS },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setPromptsModalInput(preset.prompts.join("; "));
                  }}
                  style={{
                    padding: "4px 10px",
                    fontSize: "10px",
                    background: promptsModalInput === preset.prompts.join("; ")
                      ? "rgba(255, 122, 61, 0.2)"
                      : "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    color: promptsModalInput === preset.prompts.join("; ")
                      ? "var(--accent)"
                      : "var(--muted)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Prompts textarea */}
            <div style={{
              flex: 1,
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              overflow: "hidden",
            }}>
              <textarea
                value={promptsModalInput}
                onChange={(e) => setPromptsModalInput(e.target.value)}
                placeholder="Enter prompts separated by semicolons..."
                style={{
                  flex: 1,
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                  padding: "8px",
                  fontSize: "11px",
                  color: "var(--text)",
                  resize: "none",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const newPrompts = promptsModalInput
                      .split(";")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0);
                    if (newPrompts.length > 0) {
                      setPrompts(newPrompts);
                      setPromptInput(promptsModalInput);
                      promptsRef.current = newPrompts;
                      setShowPromptsModal(false);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "8px",
                    fontSize: "11px",
                    fontWeight: 500,
                    background: "rgba(255, 122, 61, 0.2)",
                    border: "1px solid var(--accent)",
                    borderRadius: "4px",
                    color: "var(--accent)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPromptsModalInput(prompts.join("; "));
                  }}
                  style={{
                    padding: "8px 12px",
                    fontSize: "11px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "4px",
                    color: "var(--muted)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Resize handle - bottom edge */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingPromptsModal(true);
                promptsModalResizeStartRef.current = {
                  height: promptsModalHeight,
                  mouseY: e.clientY,
                };
              }}
              style={{
                height: "8px",
                cursor: "ns-resize",
                background: "transparent",
                borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div style={{
                width: "40px",
                height: "3px",
                borderRadius: "2px",
                background: "rgba(255, 255, 255, 0.2)",
              }} />
            </div>
          </div>
        )}

        {/* Bottom Controls Bar */}
        <footer className="immersive-footer">
          {/* Video Player / Mic Status */}
          <div className="footer-section">
            {inputMode === "youtube" && youtubeVideo ? (
              // Video is playing in floating modal - show minimal status
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Video playing</span>
                {youtubeAnalyzing && (
                  <span style={{ fontSize: "11px", color: "var(--success)" }}>● Analyzing</span>
                )}
              </div>
            ) : inputMode === "youtube" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Paste YouTube URL..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  style={{
                    width: "280px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "rgba(15, 21, 32, 0.8)",
                    color: "var(--text)",
                    fontSize: "13px"
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!youtubeUrl.trim()) return;
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
                    setYoutubeAnalyzing(false);
                    setYoutubePreparing(true);
                    setYoutubeError("");
                    try {
                      const result = await prepareYouTubeVideo(youtubeUrl);
                      setYoutubeVideo(result);
                    } catch (err) {
                      setYoutubeError(err instanceof Error ? err.message : "Failed");
                    } finally {
                      setYoutubePreparing(false);
                    }
                  }}
                  disabled={youtubePreparing || !modelStatus?.loaded}
                  style={{ padding: "8px 16px", fontSize: "13px" }}
                >
                  {youtubePreparing ? "Loading..." : "Load"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Microphone</span>
                {status === "running" ? (
                  <button type="button" className="ghost" onClick={stopMonitoring} style={{ padding: "6px 12px", fontSize: "12px" }}>
                    Stop
                  </button>
                ) : (
                  <button type="button" onClick={startMonitoring} style={{ padding: "6px 12px", fontSize: "12px" }}>
                    Start
                  </button>
                )}
                <div style={{ width: "60px", height: "6px", background: "rgba(10,16,24,0.8)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${levelPercent}%`, height: "100%", background: "linear-gradient(90deg, #ff7a3d, #2ad1ff)" }} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (webcamActive) {
                      stopWebcam();
                    } else {
                      startWebcam();
                    }
                  }}
                  className="ghost"
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                  }}
                >
                  {webcamActive ? "Stop Camera" : "Camera"}
                </button>
              </div>
            )}
          </div>

          <div className="footer-divider" />

          {/* Preset Buttons */}
          <div className="footer-section">
            <button
              type="button"
              className={`preset-btn ${prompts === DIALOG_MOVIE_PROMPTS ? "active" : ""}`}
              onClick={() => {
                setPrompts(DIALOG_MOVIE_PROMPTS);
                setPromptInput(DIALOG_MOVIE_PROMPTS.join("; "));
                setClassificationScores({});
                setMusicDecomposition(false);
              }}
            >
              Dialog
            </button>
            <button
              type="button"
              className={`preset-btn ${prompts === ACTION_MOVIE_PROMPTS ? "active" : ""}`}
              onClick={() => {
                setPrompts(ACTION_MOVIE_PROMPTS);
                setPromptInput(ACTION_MOVIE_PROMPTS.join("; "));
                setClassificationScores({});
                setMusicDecomposition(false);
              }}
            >
              Action
            </button>
            <button
              type="button"
              className={`preset-btn ${prompts === SPORTS_PROMPTS ? "active" : ""}`}
              onClick={() => {
                setPrompts(SPORTS_PROMPTS);
                setPromptInput(SPORTS_PROMPTS.join("; "));
                setClassificationScores({});
                setMusicDecomposition(false);
              }}
            >
              Sports
            </button>
            <button
              type="button"
              className={`preset-btn ${musicDecomposition ? "active" : ""}`}
              onClick={() => {
                setPrompts(MUSIC_DECOMPOSITION_PROMPTS);
                setPromptInput(MUSIC_DECOMPOSITION_PROMPTS.join("; "));
                setClassificationScores({});
                setMusicDecomposition(true);
              }}
            >
              Music
            </button>
          </div>

          <div className="footer-divider" />

          {/* Buffer Control */}
          <div className="footer-section">
            <div className="compact-control">
              <label>Buffer</label>
              <input
                type="range"
                min={MIN_BUFFER_SECONDS}
                max={MAX_BUFFER_SECONDS}
                value={bufferSeconds}
                onChange={(e) => setBufferSeconds(Number(e.target.value))}
              />
              <span className="value">{bufferSeconds}s</span>
            </div>
          </div>

          <div className="footer-section grow" />

          {/* Model Status */}
          <div className="footer-section">
            <div className={`model-badge ${modelStatus?.loaded ? "ready" : ""}`}>
              <span className="badge-dot" />
              <span>{modelStatus?.loaded ? `FLAM (${modelStatus.device})` : "Loading..."}</span>
            </div>
            {inferenceCount > 0 && (
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                #{inferenceCount} | {lastInferenceTime ? `${(lastInferenceTime / 1000).toFixed(1)}s` : "—"}
              </span>
            )}
          </div>

          {/* Layout Toggle */}
          <div className="footer-section">
            <button
              type="button"
              className="preset-btn"
              onClick={() => setLayoutMode("classic")}
              title="Switch to Classic layout"
            >
              Classic View
            </button>
          </div>
        </footer>

          {/* About Modal */}
          {showAboutModal && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Backdrop */}
              <div
                onClick={() => setShowAboutModal(false)}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0, 0, 0, 0.6)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              />
              {/* Modal Card */}
              <div
                style={{
                  position: "relative",
                  width: "min(420px, 90vw)",
                  maxHeight: "85vh",
                  background: "rgba(15, 20, 30, 0.85)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  boxShadow: "0 16px 64px rgba(0, 0, 0, 0.5)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>
                    About SonoTag
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAboutModal(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      fontSize: "20px",
                      padding: "4px 8px",
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Content */}
                <div
                  style={{
                    padding: "24px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    gap: "16px",
                  }}
                >
                  {/* App Info */}
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>🎧</div>
                    <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--text)" }}>SonoTag</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>Version 0.4.6</div>
                  </div>

                  <div style={{ height: "1px", width: "60%", background: "rgba(255, 255, 255, 0.1)" }} />

                  {/* Developer */}
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>Developed by</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>
                      Sergio Peña
                    </div>
                    <a
                      href="https://www.linkedin.com/in/sergio-pena-a8108684/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        padding: "10px 20px",
                        borderRadius: "999px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        color: "var(--text)",
                        fontSize: "13px",
                        fontWeight: 500,
                        textDecoration: "none",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      Connect on LinkedIn
                    </a>
                  </div>

                  <div style={{ height: "1px", width: "60%", background: "rgba(255, 255, 255, 0.1)" }} />

                  {/* Powered By */}
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "12px" }}>Powered by</div>
                    <div
                      style={{
                        background: "rgba(0, 0, 0, 0.3)",
                        borderRadius: "12px",
                        padding: "16px",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--accent)", marginBottom: "4px" }}>
                        OpenFLAM
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "12px" }}>
                        Frame-wise Language-Audio Modeling
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--muted)", lineHeight: 1.5, textAlign: "left" }}>
                        <strong>Citation:</strong><br />
                        Wu, Y., Tsirigotis, C., Chen, K., Huang, C.A., Courville, A., Nieto, O., Seetharaman, P., & Salamon, J. (2025).
                        <em> FLAM: Frame-Wise Language-Audio Modeling.</em> ICML 2025.
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                        <a
                          href="https://arxiv.org/abs/2505.05335"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: "rgba(255, 122, 61, 0.15)",
                            border: "1px solid rgba(255, 122, 61, 0.3)",
                            fontSize: "10px",
                            fontWeight: 500,
                            color: "var(--accent)",
                            textDecoration: "none",
                          }}
                        >
                          arXiv
                        </a>
                        <a
                          href="https://github.com/adobe-research/openflam"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            fontSize: "10px",
                            fontWeight: 500,
                            color: "var(--text)",
                            textDecoration: "none",
                          }}
                        >
                          GitHub
                        </a>
                        <a
                          href="https://flam-model.github.io/"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: "rgba(42, 209, 255, 0.15)",
                            border: "1px solid rgba(42, 209, 255, 0.3)",
                            fontSize: "10px",
                            fontWeight: 500,
                            color: "var(--accent-2)",
                            textDecoration: "none",
                          }}
                        >
                          Website
                        </a>
                      </div>
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", marginTop: "8px", opacity: 0.7 }}>
                      ⚠️ OpenFLAM is licensed under Adobe Research License (non-commercial only)
                    </div>
                  </div>

                  <div style={{ height: "1px", width: "60%", background: "rgba(255, 255, 255, 0.1)" }} />

                  {/* Built With */}
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "10px" }}>
                      Built as a fun experiment with
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px" }}>
                      {["Claude Sonnet 4", "React", "FastAPI", "PyTorch"].map((tech) => (
                        <span
                          key={tech}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            fontSize: "10px",
                            fontWeight: 500,
                            color: "var(--muted)",
                          }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ height: "1px", width: "60%", background: "rgba(255, 255, 255, 0.1)" }} />

                  {/* Copyright */}
                  <div style={{ fontSize: "11px", color: "var(--muted)", opacity: 0.7 }}>
                    © 2025 Sergio Peña. All rights reserved.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Slide-Out Panel */}
        <div className={`settings-overlay ${settingsOpen ? "open" : ""}`} onClick={() => setSettingsOpen(false)}>
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h2>Settings</h2>
              <button type="button" className="settings-close" onClick={() => setSettingsOpen(false)}>×</button>
            </div>
            <div className="settings-content">
              {/* Sound Categories */}
              <div className="settings-section">
                <h3>Sound Categories</h3>
                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="speech; music; gunshot; ..."
                />
                <button
                  type="button"
                  onClick={() => {
                    const parsed = promptInput.split(";").map((p) => p.trim()).filter((p) => p.length > 0);
                    const seen = new Set<string>();
                    const uniquePrompts: string[] = [];
                    for (const prompt of parsed) {
                      const lowerPrompt = prompt.toLowerCase();
                      if (!seen.has(lowerPrompt)) {
                        seen.add(lowerPrompt);
                        uniquePrompts.push(prompt);
                      }
                    }
                    if (uniquePrompts.length > 0) {
                      setPrompts(uniquePrompts);
                      setPromptInput(uniquePrompts.join("; "));
                      setClassificationScores({});
                    }
                  }}
                >
                  Update Prompts
                </button>
                <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0 }}>
                  {prompts.length} active • Use semicolons to separate
                </p>
              </div>

              {/* Detection Mode */}
              <div className="settings-section">
                <h3>Detection Mode</h3>
                <div className="settings-row">
                  <label>Relative mode (min-max)</label>
                  <input
                    type="checkbox"
                    checked={normalizeScores}
                    onChange={(e) => setNormalizeScores(e.target.checked)}
                  />
                </div>
                <div className="settings-row">
                  <label>Sort by score</label>
                  <input
                    type="checkbox"
                    checked={sortByScore}
                    onChange={(e) => setSortByScore(e.target.checked)}
                  />
                </div>
              </div>

              {/* Color Theme */}
              <div className="settings-section">
                <h3>Color Theme</h3>
                <div className="theme-selector">
                  {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      className={`theme-option ${colorTheme === theme ? "active" : ""}`}
                      onClick={() => setColorTheme(theme)}
                      style={{
                        background: colorTheme === theme
                          ? `linear-gradient(135deg, ${getColorFromStops(0.3, COLOR_THEMES[theme].stops)}, ${getColorFromStops(0.7, COLOR_THEMES[theme].stops)})`
                          : "rgba(15, 21, 32, 0.8)",
                      }}
                    >
                      {COLOR_THEMES[theme].name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inference Settings */}
              <div className="settings-section">
                <h3>Inference</h3>
                <div className="settings-row">
                  <label>Buffer duration</label>
                  <input
                    type="range"
                    min={MIN_BUFFER_SECONDS}
                    max={MAX_BUFFER_SECONDS}
                    value={bufferSeconds}
                    onChange={(e) => setBufferSeconds(Number(e.target.value))}
                  />
                  <span className="value">{bufferSeconds}s</span>
                </div>
                <div className="settings-row">
                  <label>Slide speed</label>
                  <input
                    type="range"
                    min={MIN_SLIDE_SPEED}
                    max={MAX_SLIDE_SPEED}
                    value={slideSpeed}
                    onChange={(e) => setSlideSpeed(Number(e.target.value))}
                  />
                  <span className="value">{slideSpeed}</span>
                </div>
              </div>

              {/* Frequency Range */}
              <div className="settings-section">
                <h3>Frequency Range</h3>
                <div className="settings-row">
                  <label>Min Hz</label>
                  <input
                    type="number"
                    value={freqMin}
                    onChange={handleFreqMinChange}
                    style={{ width: "80px", padding: "6px 8px", fontSize: "12px" }}
                  />
                </div>
                <div className="settings-row">
                  <label>Max Hz</label>
                  <input
                    type="number"
                    value={freqMax}
                    onChange={handleFreqMaxChange}
                    style={{ width: "80px", padding: "6px 8px", fontSize: "12px" }}
                  />
                </div>
                <button type="button" className="ghost" onClick={setFullRange} style={{ fontSize: "12px" }}>
                  Full Range ({formatHz(nyquist, true)})
                </button>
              </div>

              {/* Timing */}
              {timingBreakdown && (
                <div className="settings-section">
                  <h3>Last Inference Timing</h3>
                  <div className="timing-grid">
                    <span className="timing-label">Read</span>
                    <span className="timing-value">{timingBreakdown.read_ms.toFixed(1)}ms</span>
                    <span className="timing-label">Decode</span>
                    <span className="timing-value">{timingBreakdown.decode_ms.toFixed(1)}ms</span>
                    <span className="timing-label">FLAM</span>
                    <span className="timing-value highlight">{timingBreakdown.audio_embed_ms.toFixed(1)}ms</span>
                    <span className="timing-label">Total</span>
                    <span className="timing-value">{timingBreakdown.total_ms.toFixed(1)}ms</span>
                  </div>
                </div>
              )}

              {/* System Info */}
              <div className="settings-section">
                <h3>System</h3>
                <div className="system-info-grid">
                  <span>CPU</span>
                  <span>{hostCpuModel || `${hostCpuLogical} threads`}</span>
                  <span>Memory</span>
                  <span>{formatBytes(hostMemoryBytes)}</span>
                  <span>Platform</span>
                  <span>{hostPlatform || browserInfo.platform}</span>
                  <span>Sample Rate</span>
                  <span>{sampleRate ? `${sampleRate} Hz` : "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

// Classic Layout (original)
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
          <button
            type="button"
            className="ghost"
            onClick={() => setLayoutMode("immersive")}
            style={{ marginTop: "8px", fontSize: "11px", padding: "6px 10px" }}
          >
            ✨ Immersive View
          </button>
        </div>
      </header>

      <div className="layout">
<aside className="panel controls">
          {/* Mode Tabs */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid #333",
            marginBottom: "1rem"
          }}>
            <button
              type="button"
              onClick={() => {
                setInputMode("youtube");
                // Stop mic if running
                if (status === "running") {
                  stopMonitoring();
                }
              }}
              style={{
                flex: 1,
                padding: "0.75rem",
                background: inputMode === "youtube" ? "rgba(255, 122, 61, 0.2)" : "transparent",
                border: "none",
                borderBottom: inputMode === "youtube" ? "2px solid #ff7a3d" : "2px solid transparent",
                color: inputMode === "youtube" ? "#ff7a3d" : "#888",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: inputMode === "youtube" ? 600 : 400
              }}
            >
            YouTube
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode("microphone");
                // Stop YouTube analysis and cleanup
                setYoutubeAnalyzing(false);
                videoAudioBufferRef.current = [];
                if (youtubeVideo) {
                  cleanupVideo(youtubeVideo.video_id);
                  setYoutubeVideo(null);
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
                }
              }}
              style={{
                flex: 1,
                padding: "0.75rem",
                background: inputMode === "microphone" ? "rgba(255, 122, 61, 0.2)" : "transparent",
                border: "none",
                borderBottom: inputMode === "microphone" ? "2px solid #ff7a3d" : "2px solid transparent",
                color: inputMode === "microphone" ? "#ff7a3d" : "#888",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: inputMode === "microphone" ? 600 : 400
              }}
            >
              Microphone
            </button>
          </div>

          {/* YouTube Mode */}
          {inputMode === "youtube" && (
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
                onChange={(e) => setYoutubeUrl(e.target.value)}
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
                    setYoutubeError("Please enter a YouTube URL");
                    return;
                  }

                  // Cleanup previous video audio context before loading new video
                  // This is critical because createMediaElementSource can only be called once per element
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
                  setYoutubeAnalyzing(false);

                  setYoutubePreparing(true);
                  setYoutubeError("");
                  setYoutubeVideo(null);
                  try {
                    const result = await prepareYouTubeVideo(youtubeUrl);
                    setYoutubeVideo(result);
                  } catch (err) {
                    setYoutubeError(err instanceof Error ? err.message : "Failed to prepare video");
                  } finally {
                    setYoutubePreparing(false);
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

                      // Create audio context and connect to video
                      if (!videoAudioContextRef.current) {
                        const audioContext = new AudioContext();
                        const source = audioContext.createMediaElementSource(videoRef.current);
                        const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

                        // Create analyser for spectrogram
                        const analyser = audioContext.createAnalyser();
                        analyser.fftSize = 2048;
                        analyser.smoothingTimeConstant = 0.8;

                        // Connect: source -> analyser -> scriptProcessor -> destination
                        source.connect(analyser);
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(audioContext.destination);
                        source.connect(audioContext.destination); // Also play through speakers

const maxBufferSamples = audioContext.sampleRate * bufferSeconds;
                        void maxBufferSamples; // Used in closure below via bufferSecondsRef
                        let currentBufferSamples = 0;

scriptProcessor.onaudioprocess = (event) => {
                          // Only process audio if video is actually playing
                          if (!youtubeAnalyzingRef.current) {
                            return;
                          }

                          const inputData = event.inputBuffer.getChannelData(0);
                          const samples = new Float32Array(inputData);

                          videoAudioBufferRef.current.push(samples);
                          currentBufferSamples += samples.length;

                          // Use ref to get latest buffer duration (allows dynamic changes)
                          const currentMaxSamples = audioContext.sampleRate * bufferSecondsRef.current;

                          // When buffer is full, trigger classification
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
                    }}
onPause={() => {
                      setYoutubeAnalyzing(false);
                      // Clear any pending audio buffer to prevent stale classification
                      videoAudioBufferRef.current = [];
                    }}
                    onEnded={() => {
                      setYoutubeAnalyzing(false);
                      // Clear any pending audio buffer
                      videoAudioBufferRef.current = [];
                    }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      className="ghost"
                      onClick={async () => {
                        if (youtubeVideo) {
                          await cleanupVideo(youtubeVideo.video_id);
                          setYoutubeVideo(null);
                          // Cleanup audio context
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
          )}

          {/* Microphone Mode */}
          {inputMode === "microphone" && (
            <>
          <section className="block">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ margin: 0 }}>Microphone Capture</h2>
              <button
                type="button"
                onClick={() => {
                  if (webcamActive) {
                    stopWebcam();
                  } else {
                    startWebcam();
                  }
                }}
                style={{
                  padding: "6px 12px",
                  background: webcamActive ? "rgba(255, 122, 61, 0.2)" : "rgba(15, 21, 32, 0.8)",
                  border: "1px solid",
                  borderColor: webcamActive ? "var(--accent)" : "rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  color: webcamActive ? "var(--accent)" : "var(--muted)",
                  cursor: "pointer",
                  fontSize: "12px",
                  transition: "all 0.2s ease",
                }}
                title={webcamActive ? "Stop Webcam" : "Start Webcam"}
              >
                {webcamActive ? "Stop Camera" : "Camera"}
              </button>
            </div>
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
            </>
          )}

          {/* Shared: Prompts Configuration */}
          <section className="block">
            <CollapsibleHeader
              title="Sound Categories"
              isCollapsed={collapsedSections.soundCategories}
              onToggle={() => setCollapsedSections(prev => ({ ...prev, soundCategories: !prev.soundCategories }))}
            />
            {!collapsedSections.soundCategories && (
            <div className="stack" style={{ marginTop: "14px" }}>
              <label className="label" htmlFor="prompt-input">
                Sound categories to detect (semicolon-separated)
              </label>
              <textarea
                id="prompt-input"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                rows={4}
                placeholder="speech; music; child singing; male speech, man speaking; ..."
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
                    .split(";")
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0);

                  // Deduplicate prompts (case-insensitive)
                  const seen = new Set<string>();
                  const uniquePrompts: string[] = [];
                  for (const prompt of parsed) {
                    const lowerPrompt = prompt.toLowerCase();
                    if (!seen.has(lowerPrompt)) {
                      seen.add(lowerPrompt);
                      uniquePrompts.push(prompt); // Keep original casing
                    }
                  }

                  if (uniquePrompts.length > 0) {
                    setPrompts(uniquePrompts);
                    // Update textarea to show deduplicated prompts
                    setPromptInput(uniquePrompts.join("; "));
                    setClassificationScores({});
                    // Update music decomposition toggle state
                    setMusicDecomposition(
                      uniquePrompts.length === MUSIC_DECOMPOSITION_PROMPTS.length &&
                      uniquePrompts.every((p, i) => p.toLowerCase() === MUSIC_DECOMPOSITION_PROMPTS[i].toLowerCase())
                    );
                  }
                }}
              >
                Update prompts
              </button>
              <p className="muted">
                {prompts.length} active prompts. Use semicolons to separate; commas are allowed within prompts.
              </p>

{/* Music Decomposition Toggle - subtle, below prompts */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "0.25rem"
              }}>
                <input
                  type="checkbox"
                  id="music-decomposition-toggle"
                  checked={musicDecomposition}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setMusicDecomposition(enabled);
                    if (enabled) {
                      setPrompts(MUSIC_DECOMPOSITION_PROMPTS);
                      setPromptInput(MUSIC_DECOMPOSITION_PROMPTS.join("; "));
                      setClassificationScores({});
                      setScoresExpanded(false);
                    } else {
                      setPrompts(DEFAULT_PROMPTS);
                      setPromptInput(DEFAULT_PROMPTS.join("; "));
                      setClassificationScores({});
                    }
                  }}
                />
                <label htmlFor="music-decomposition-toggle" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    Music decomposition mode
                  </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="normalize-toggle"
                  checked={normalizeScores}
                  onChange={(e) => setNormalizeScores(e.target.checked)}
                />
                <label htmlFor="normalize-toggle" style={{ fontSize: "0.85rem" }}>
                  Relative mode (min-max normalization)
                </label>
              </div>
<p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                {normalizeScores
                  ? "Showing relative differences (best=1, worst=0)"
                  : "Clamped mode: negative→0, positive→value (matches paper)"}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="sort-toggle"
                  checked={sortByScore}
                  onChange={(e) => setSortByScore(e.target.checked)}
                />
                <label htmlFor="sort-toggle" style={{ fontSize: "0.85rem" }}>
                  Sort by score (highest first)
                </label>
              </div>
              {classifyError && <p className="error">{classifyError}</p>}
            </div>
            )}
          </section>

          <section className="block">
            <CollapsibleHeader
              title="Inference Settings"
              isCollapsed={collapsedSections.inferenceSettings}
              onToggle={() => setCollapsedSections(prev => ({ ...prev, inferenceSettings: !prev.inferenceSettings }))}
            />
            {!collapsedSections.inferenceSettings && (
            <div className="stack" style={{ marginTop: "14px" }}>
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

              <label className="label" htmlFor="slide-speed-slider" style={{ marginTop: "0.75rem" }}>
                Slide speed: {slideSpeed}px/frame
              </label>
              <input
                id="slide-speed-slider"
                type="range"
                min={MIN_SLIDE_SPEED}
                max={MAX_SLIDE_SPEED}
                step={1}
                value={slideSpeed}
                onChange={(e) => setSlideSpeed(Number(e.target.value))}
                style={{ width: "100%" }}
              />
                <div className="info-line" style={{ fontSize: "0.75rem" }}>
                  <span>{MIN_SLIDE_SPEED} (slower/zoomed)</span>
                  <span>{MAX_SLIDE_SPEED} (faster/compressed)</span>
                </div>
              </div>
              )}
            </section>

<section className="block">
              <CollapsibleHeader
                title="System snapshot"
                isCollapsed={collapsedSections.systemInfo}
                onToggle={() => setCollapsedSections(prev => ({ ...prev, systemInfo: !prev.systemInfo }))}
              />
              {!collapsedSections.systemInfo && (
              <div className="stack" style={{ marginTop: "14px" }}>
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
            )}
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

            {/* Scrolling heatmap visualization - labels on right */}
            {(() => {
              // Dynamic height: minimum 240px, or 12px per prompt for readability
              const heatmapHeight = Math.max(240, prompts.length * 12);
              return (
                <div className="heatmap-wrap" style={{ height: heatmapHeight }}>
                  <canvas
                    ref={heatmapRef}
                    width={960}
                    height={heatmapHeight}
                    className="plot-canvas"
                  />
                  <div className="heatmap-labels" style={{ height: heatmapHeight }}>
                    {prompts.map((prompt) => (
                      <span key={prompt}>{prompt}</span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Expand/Collapse button */}
            {prompts.length > MAX_VISIBLE_PROMPTS && (
              <button
                type="button"
                onClick={() => setScoresExpanded(!scoresExpanded)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.5rem",
                  marginBottom: "0.5rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  color: "#aaa",
                  cursor: "pointer",
                  fontSize: "0.8rem"
                }}
              >
                {scoresExpanded
                  ? `▲ Collapse (showing ${prompts.length} prompts)`
                  : `▼ Expand all ${prompts.length} prompts (showing ${MAX_VISIBLE_PROMPTS})`}
              </button>
            )}

            {/* Numerical scores display - now below heatmap, collapsible */}
            <div className="scores-panel" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "6px",
              marginBottom: "0.75rem",
              fontSize: "0.8rem",
              maxHeight: scoresExpanded ? "none" : "320px",
              overflowY: scoresExpanded ? "visible" : "auto"
            }}>
              {(() => {
                // Compute display scores based on mode
                // Default (normalizeScores=false): Clamp to [0,1] - matches paper
                // Relative mode (normalizeScores=true): Min-max normalization
                const displayScores = Object.keys(classificationScores).length > 0
                  ? (normalizeScores
                      ? normalizeScoresMinMax(classificationScores)
                      : clampScoresToPositive(classificationScores))
                  : null;

                // Get prompts to display based on expanded state and sorting
                let sortedPrompts = [...prompts];
                if (sortByScore && Object.keys(classificationScores).length > 0) {
                  sortedPrompts.sort((a, b) => {
                    const scoreA = classificationScores[a] ?? -Infinity;
                    const scoreB = classificationScores[b] ?? -Infinity;
                    return scoreB - scoreA; // Descending order
                  });
                }
                const visiblePrompts = scoresExpanded
                  ? sortedPrompts
                  : sortedPrompts.slice(0, MAX_VISIBLE_PROMPTS);

                return visiblePrompts.map((prompt) => {
                  const rawScore = classificationScores[prompt];
                  const hasScore = rawScore !== undefined;

                  // For display intensity, use computed display scores
                  let displayIntensity = 0;
                  if (hasScore && displayScores) {
                    displayIntensity = displayScores[prompt] ?? 0;
                  }

                  const isTop = hasScore && rawScore === Math.max(...Object.values(classificationScores));

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
                            width: `${displayIntensity * 100}%`,
                            height: "100%",
                            background: getColorFromStops(displayIntensity, COLOR_THEMES[colorTheme].stops),
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
                          {hasScore ? (rawScore > 0 ? "+" : "") + rawScore.toFixed(3) : "---"}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
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

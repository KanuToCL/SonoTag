import type { RefObject } from "react";
import type { InputMode, MonitoringStatus, PermissionState } from "../types/app";
import type { ColorTheme } from "../types/themes";
import type {
  BackendInfo,
  BrowserInfo,
  FreqRange,
  ModelStatusResponse,
  Recommendation,
  PrepareVideoResponse,
  PrepareMediaResponse,
} from "../types";
import { ClassicSidebar } from "./ClassicSidebar";
import { ClassicVisualization } from "./ClassicVisualization";

export interface ClassicLayoutProps {
  // Layout
  onSetLayoutMode: (mode: "immersive" | "classic") => void;
  // Status
  status: MonitoringStatus;
  permissionState: PermissionState;
  error: string;
  // Input mode
  inputMode: InputMode;
  onSetInputMode: (mode: InputMode) => void;
  // Devices
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSetSelectedDeviceId: (id: string) => void;
  onRequestPermission: () => Promise<boolean>;
  onRefreshDevices: () => Promise<void>;
  onStartMonitoring: () => Promise<void>;
  onStopMonitoring: () => Promise<void>;
  // Webcam
  webcamActive: boolean;
  onStartWebcam: () => void;
  onStopWebcam: () => void;
  // YouTube
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
  classifyVideoBuffer: (sampleRate: number) => void;
  // SoundCloud
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
  classifySoundcloudBuffer: (sampleRate: number) => void;
  // SC player state
  scIsPlaying: boolean;
  scCurrentTime: number;
  scDuration: number;
  scIsSeeking: boolean;
  onSetScIsPlaying: (playing: boolean) => void;
  onSetScCurrentTime: (time: number) => void;
  onSetScDuration: (duration: number) => void;
  onSetScIsSeeking: (seeking: boolean) => void;
  // Prompts
  prompts: string[];
  promptInput: string;
  onSetPrompts: (prompts: string[]) => void;
  onSetPromptInput: (input: string) => void;
  musicDecomposition: boolean;
  onSetMusicDecomposition: (enabled: boolean) => void;
  // Scores
  classificationScores: Record<string, number>;
  onSetClassificationScores: (scores: Record<string, number>) => void;
  normalizeScores: boolean;
  onSetNormalizeScores: (normalize: boolean) => void;
  sortByScore: boolean;
  onSetSortByScore: (sort: boolean) => void;
  scoresExpanded: boolean;
  onSetScoresExpanded: (expanded: boolean) => void;
  isClassifying: boolean;
  classifyError: string;
  // Inference
  bufferSeconds: number;
  onSetBufferSeconds: (seconds: number) => void;
  slideSpeed: number;
  onSetSlideSpeed: (speed: number) => void;
  modelStatus: ModelStatusResponse | null;
  lastInferenceTime: number | null;
  inferenceCount: number;
  timingBreakdown: {
    read_ms: number;
    decode_ms: number;
    tensor_ms: number;
    audio_embed_ms: number;
    similarity_ms: number;
    total_ms: number;
  } | null;
  // Freq range
  freqRange: FreqRange;
  freqMin: number;
  freqMax: number;
  nyquist: number;
  freqAxisLabels: string[];
  onHandleFreqMinChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onHandleFreqMaxChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSetFullRange: () => void;
  // Canvas refs
  spectrogramRef: RefObject<HTMLCanvasElement | null>;
  heatmapRef: RefObject<HTMLCanvasElement | null>;
  // Level meter
  levelPercent: number;
  // System info
  backendInfo: BackendInfo | null;
  backendError: string;
  browserInfo: BrowserInfo;
  recommendation: Recommendation;
  sampleRate: number | null;
  // Collapsible sections
  collapsedSections: Record<string, boolean>;
  onSetCollapsedSections: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  // Color theme
  colorTheme: ColorTheme;
  // API base URL
  apiBaseUrl: string;
}

export function ClassicLayout({
  onSetLayoutMode,
  status,
  permissionState,
  error,
  inputMode,
  onSetInputMode,
  devices,
  selectedDeviceId,
  onSetSelectedDeviceId,
  onRequestPermission,
  onRefreshDevices,
  onStartMonitoring,
  onStopMonitoring,
  webcamActive,
  onStartWebcam,
  onStopWebcam,
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
  classifyVideoBuffer,
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
  classifySoundcloudBuffer,
  scIsPlaying,
  scCurrentTime,
  scDuration,
  scIsSeeking,
  onSetScIsPlaying,
  onSetScCurrentTime,
  onSetScDuration,
  onSetScIsSeeking,
  prompts,
  promptInput,
  onSetPrompts,
  onSetPromptInput,
  musicDecomposition,
  onSetMusicDecomposition,
  classificationScores,
  onSetClassificationScores,
  normalizeScores,
  onSetNormalizeScores,
  sortByScore,
  onSetSortByScore,
  scoresExpanded,
  onSetScoresExpanded,
  isClassifying,
  classifyError,
  bufferSeconds,
  onSetBufferSeconds,
  slideSpeed,
  onSetSlideSpeed,
  modelStatus,
  lastInferenceTime,
  inferenceCount,
  timingBreakdown,
  freqRange,
  nyquist,
  freqAxisLabels,
  onHandleFreqMinChange,
  onHandleFreqMaxChange,
  onSetFullRange,
  spectrogramRef,
  heatmapRef,
  levelPercent,
  backendInfo,
  backendError,
  browserInfo,
  recommendation,
  sampleRate,
  collapsedSections,
  onSetCollapsedSections,
  colorTheme,
  apiBaseUrl,
}: ClassicLayoutProps) {
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
          <span className="meta">API: {apiBaseUrl}</span>
          <button
            type="button"
            className="ghost"
            onClick={() => onSetLayoutMode("immersive")}
            style={{ marginTop: "8px", fontSize: "11px", padding: "6px 10px" }}
          >
            ✨ Immersive View
          </button>
        </div>
      </header>

      <div className="layout">
        <ClassicSidebar
          status={status}
          permissionState={permissionState}
          error={error}
          inputMode={inputMode}
          onSetInputMode={onSetInputMode}
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSetSelectedDeviceId={onSetSelectedDeviceId}
          onRequestPermission={onRequestPermission}
          onRefreshDevices={onRefreshDevices}
          onStartMonitoring={onStartMonitoring}
          onStopMonitoring={onStopMonitoring}
          webcamActive={webcamActive}
          onStartWebcam={onStartWebcam}
          onStopWebcam={onStopWebcam}
          youtubeUrl={youtubeUrl}
          youtubeVideo={youtubeVideo}
          youtubeAnalyzing={youtubeAnalyzing}
          youtubePreparing={youtubePreparing}
          youtubeError={youtubeError}
          onSetYoutubeUrl={onSetYoutubeUrl}
          onSetYoutubeVideo={onSetYoutubeVideo}
          onSetYoutubePreparing={onSetYoutubePreparing}
          onSetYoutubeError={onSetYoutubeError}
          onSetYoutubeAnalyzing={onSetYoutubeAnalyzing}
          videoRef={videoRef}
          videoAudioContextRef={videoAudioContextRef}
          videoSourceRef={videoSourceRef}
          videoScriptProcessorRef={videoScriptProcessorRef}
          videoAnalyserRef={videoAnalyserRef}
          videoAudioBufferRef={videoAudioBufferRef}
          youtubeAnalyzingRef={youtubeAnalyzingRef}
          bufferSecondsRef={bufferSecondsRef}
          classifyVideoBuffer={classifyVideoBuffer}
          soundcloudUrl={soundcloudUrl}
          soundcloudMedia={soundcloudMedia}
          soundcloudAnalyzing={soundcloudAnalyzing}
          soundcloudPreparing={soundcloudPreparing}
          soundcloudError={soundcloudError}
          onSetSoundcloudUrl={onSetSoundcloudUrl}
          onSetSoundcloudMedia={onSetSoundcloudMedia}
          onSetSoundcloudPreparing={onSetSoundcloudPreparing}
          onSetSoundcloudError={onSetSoundcloudError}
          onSetSoundcloudAnalyzing={onSetSoundcloudAnalyzing}
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
          onSetScIsPlaying={onSetScIsPlaying}
          onSetScCurrentTime={onSetScCurrentTime}
          onSetScDuration={onSetScDuration}
          onSetScIsSeeking={onSetScIsSeeking}
          prompts={prompts}
          promptInput={promptInput}
          onSetPrompts={onSetPrompts}
          onSetPromptInput={onSetPromptInput}
          musicDecomposition={musicDecomposition}
          onSetMusicDecomposition={onSetMusicDecomposition}
          classificationScores={classificationScores}
          onSetClassificationScores={onSetClassificationScores}
          normalizeScores={normalizeScores}
          onSetNormalizeScores={onSetNormalizeScores}
          sortByScore={sortByScore}
          onSetSortByScore={onSetSortByScore}
          scoresExpanded={scoresExpanded}
          onSetScoresExpanded={onSetScoresExpanded}
          classifyError={classifyError}
          bufferSeconds={bufferSeconds}
          onSetBufferSeconds={onSetBufferSeconds}
          slideSpeed={slideSpeed}
          onSetSlideSpeed={onSetSlideSpeed}
          modelStatus={modelStatus}
          lastInferenceTime={lastInferenceTime}
          inferenceCount={inferenceCount}
          timingBreakdown={timingBreakdown}
          levelPercent={levelPercent}
          backendInfo={backendInfo}
          backendError={backendError}
          browserInfo={browserInfo}
          recommendation={recommendation}
          sampleRate={sampleRate}
          collapsedSections={collapsedSections}
          onSetCollapsedSections={onSetCollapsedSections}
        />

        <ClassicVisualization
          prompts={prompts}
          classificationScores={classificationScores}
          normalizeScores={normalizeScores}
          sortByScore={sortByScore}
          scoresExpanded={scoresExpanded}
          onSetScoresExpanded={onSetScoresExpanded}
          isClassifying={isClassifying}
          freqRange={freqRange}
          nyquist={nyquist}
          freqAxisLabels={freqAxisLabels}
          onHandleFreqMinChange={onHandleFreqMinChange}
          onHandleFreqMaxChange={onHandleFreqMaxChange}
          onSetFullRange={onSetFullRange}
          spectrogramRef={spectrogramRef}
          heatmapRef={heatmapRef}
          modelStatus={modelStatus}
          bufferSeconds={bufferSeconds}
          lastInferenceTime={lastInferenceTime}
          inferenceCount={inferenceCount}
          colorTheme={colorTheme}
        />
      </div>
    </div>
  );
}

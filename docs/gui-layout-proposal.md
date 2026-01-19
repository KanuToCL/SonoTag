# SonoTag GUI Layout Proposal

> **Created**: January 19, 2026
> **Updated**: January 19, 2026
> **Purpose**: Reorganize the UI for better UX given all current features

---

## Layout Overview

| Layout | Status | Description |
|--------|--------|-------------|
| Focus Mode | Proposed | Minimal, visualization-first design |
| Power User Mode | Proposed | All controls visible in sidebar |
| **Immersive Flow** | **Implemented (v0.4.2)** | Dynamic labels, edge fade, sync canvases |
| Mobile/Compact Mode | Proposed | For narrow screens |
| **Glassmorphism** | **Proposed** | Full-screen video with floating glass panels |

See [Glassmorphism Layout](./glassmorphism-layout.md) for the full-screen video concept.

---

## Current Features Inventory

### Audio Capture
- Microphone selection dropdown
- Request access / Refresh devices buttons
- Start / Stop monitoring buttons
- Mic level meter (RMS)
- Permission state indicator

### FLAM Detection
- Custom prompts textarea (semicolon-separated)
- Update prompts button
- Normalization mode toggle (Clamped vs Relative)
- Postprocessing toggle (Loudness Relabel)
- Threshold slider for postprocessing

### Inference Settings
- Audio buffer duration slider (1-10s)
- Slide speed control (1-5)
- Model status indicator (ready/loading)
- Last inference time
- Inference count
- Timing breakdown panel

### Visualization
- Spectrogram canvas (scrolling)
- Frequency range controls (min/max Hz)
- Heatmap canvas (scrolling, per-prompt rows)
- Scores panel (grid with progress bars)
- Color scale legend

### System Info
- Host CPU/Memory/GPU info
- Browser info
- Recommended buffer
- Backend connection status

---

## Proposed Layout: "Focus Mode"

A cleaner, more focused design that prioritizes visualization and reduces cognitive load.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🎤 SonoTag                                    [⚙️ Settings] [ℹ️ Info] [🔴 REC]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │                         SPECTROGRAM                                     │ │
│  │                    (Full-width, scrolling)                              │ │
│  │                                                                         │ │
│  │  ← time ──────────────────────────────────────────────────────── now → │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  speech        ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████  0.82 │ │
│  │  music         ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0.12 │ │
│  │  dog barking   ░░░░░░░░░░░░░░░░░░████████████░░░░░░░░░░░░░░░░░░  0.67 │ │
│  │  silence       ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0.23 │ │
│  │                                                                         │ │
│  │                         DETECTION HEATMAP                               │ │
│  │                (Per-prompt rows, aligned with spectrogram)              │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐ │
│  │ 🎙️ MacBook Pro │ │ ⏱️ Buffer: 5s  │ │ 🎚️ Speed: 2   │ │ ✅ FLAM Ready    │ │
│  │   Microphone   │ │ ━━━━━○━━━━━━  │ │ ━━○━━━━━━━━━━ │ │ Last: 1.24s #42  │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Changes

1. **Top Bar**: Simplified header with mode toggles
   - Settings gear opens slide-out panel
   - Info icon shows system details
   - REC button (red = recording) replaces Start/Stop

2. **Visualization First**: Spectrogram + Heatmap take 80% of screen
   - Full-width for better temporal resolution
   - Heatmap labels on left, current scores on right

3. **Quick Controls Bar**: Horizontal strip at bottom
   - Mic selector (compact dropdown)
   - Buffer duration (compact slider)
   - Slide speed (compact slider)
   - Status indicator

---

## Proposed Layout: "Power User Mode"

For users who want all controls visible at once.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🎤 SonoTag - Realtime Audio Console                    [Focus] [Power] [⚙️] │
├────────────────────────────────────┬─────────────────────────────────────────┤
│                                    │                                         │
│  ┌────────────────────────────┐   │  PROMPTS                                │
│  │                            │   │  ┌─────────────────────────────────┐   │
│  │       SPECTROGRAM          │   │  │ speech; music; dog barking;    │   │
│  │                            │   │  │ child singing; silence;        │   │
│  │                            │   │  │ footsteps; glass breaking      │   │
│  └────────────────────────────┘   │  └─────────────────────────────────┘   │
│                                    │  [Update] [Reset Default] [Presets ▼] │
│  ┌────────────────────────────┐   │                                         │
│  │                            │   │  DETECTION MODE                        │
│  │       HEATMAP              │   │  ○ Clamped (paper default)             │
│  │    (per-prompt rows)       │   │  ● Relative (normalized 0-1)           │
│  │                            │   │                                         │
│  └────────────────────────────┘   │  ☑ Postprocess (Loudness Relabel)      │
│                                    │    Threshold: [0.5] ━━━━━○━━━━━━       │
│  ┌────────────────────────────┐   │                                         │
│  │  speech      ████░░  0.82 │   ├─────────────────────────────────────────┤
│  │  music       ░░░░░░  0.12 │   │                                         │
│  │  dog barking ███░░░  0.67 │   │  AUDIO CAPTURE                          │
│  │  silence     █░░░░░  0.23 │   │  🎙️ [MacBook Pro Microphone     ▼]      │
│  │  (live scores with bars)  │   │                                         │
│  └────────────────────────────┘   │  [▶ Start]  [⏹ Stop]  [🔄 Refresh]     │
│                                    │                                         │
│                                    │  Level: ████████░░░░░░░░░ 62%          │
│                                    │                                         │
│                                    ├─────────────────────────────────────────┤
│                                    │                                         │
│                                    │  INFERENCE                              │
│                                    │  Buffer:  5s  ━━━━━○━━━━━ (1-10)       │
│                                    │  Speed:   2   ━━○━━━━━━━━ (1-5)        │
│                                    │  Freq:    [0] to [12000] Hz [Full]     │
│                                    │                                         │
│                                    │  Status: ✅ Ready (cpu)                │
│                                    │  Last:   1.24s | Count: 42             │
│                                    │                                         │
│                                    │  ┌─ Timing ──────────────────────┐     │
│                                    │  │ Read:     1.2ms               │     │
│                                    │  │ Decode:   150ms               │     │
│                                    │  │ FLAM:     1050ms ⬅ bottleneck │     │
│                                    │  │ Postproc: 0.3ms               │     │
│                                    │  │ Total:    1204ms              │     │
│                                    │  └────────────────────────────────┘     │
│                                    │                                         │
└────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## Proposed Layout: "Immersive Flow" ⭐ RECOMMENDED — ✅ IMPLEMENTED (v0.4.2)

> **Status**: Implemented in v0.4.2 on January 19, 2026
> **Files**: `frontend/src/App.tsx`, `frontend/src/styles.css`

A visualization-first design with dynamic elements that create a sense of audio "flowing" through the interface.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🎧 SonoTag                              [YouTube │ Mic]  [⚙️]  ● Recording      │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┊████████████████████████████████████████│ │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┊████████████████████████████████████████│ │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┊█████████ SPECTROGRAM █████████████████│ │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┊████████████████████████████████████████│ │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┊████████████████████████████████████████│ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┊██████████████████  EXPLOSION    ▌ 0.94 │ │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┊█████████████████░  gunshot      ▌ 0.89 │ │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┊███████████████░░░  speech       ▌ 0.72 │ │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┊████████░░░░░░░░░░  car chase      0.45 │ │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┊█████░░░░░░░░░░░░░  footsteps      0.23 │ │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┊░░░░░░░░░░░░░░░░░░  silence        0.05 │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│              ◄── buffering (faded) ──►┊◄── classified (solid) ──►              │
│                                                                                  │
│  ┌─────────────────────────────┐                                                │
│  │  ▶ 2:34 / 4:26   🔊 ━━━○━━  │  🎬 Action │ 🏈 Sports │ 🎵 Music    Buffer: 4s │
│  │  Neo vs Merovingian         │                                                │
│  └─────────────────────────────┘                                                │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Key Features

#### 1. Edge Fade Effect (Vignette)
Left edge fades from transparent → solid, creating a sense of audio "flowing in" from the left.

```css
.visualization-container::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 200px;
  background: linear-gradient(to right,
    rgba(9, 13, 18, 1) 0%,
    rgba(9, 13, 18, 0) 100%
  );
  pointer-events: none;
  z-index: 10;
}
```

#### 2. Dynamic Label Styling Based on Score

Labels are **sorted by score (highest first)** by default, with dynamic styling:

| Score | Opacity | Font Weight | Visual Effect |
|-------|---------|-------------|---------------|
| 0.9+  | 1.0     | 700 (bold)  | Bright, prominent |
| 0.7   | 0.8     | 600         | Strong |
| 0.5   | 0.65    | 500         | Medium |
| 0.3   | 0.5     | 450         | Subtle |
| 0.1   | 0.35    | 400         | Faded, ghost-like |

```tsx
const getLabelStyle = (score: number) => ({
  opacity: 0.3 + (score * 0.7),              // 0.3 to 1.0
  fontWeight: 400 + Math.round(score * 300), // 400 to 700
  color: `rgba(255, ${180 + score * 75}, ${150 + score * 50}, ${0.6 + score * 0.4})`,
});
```

Visual result - labels appear to "emerge" from the heatmap:
```
██████████████████████████████  EXPLOSION    0.94  ← bold, bright, opaque
█████████████████████████░░░░░  gunshot      0.89  ← bold, slightly dimmer
████████████████░░░░░░░░░░░░░░  speech       0.72  ← medium weight
██████░░░░░░░░░░░░░░░░░░░░░░░░  car chase    0.45  ← lighter weight, faded
███░░░░░░░░░░░░░░░░░░░░░░░░░░░  footsteps    0.23  ← light, transparent
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  silence      0.05  ← ghost-like, nearly invisible
```

#### 3. Spectrogram ↔ Heatmap Temporal Sync

**The Problem:**
Currently, the spectrogram scrolls in real-time while the heatmap updates in chunks. This creates a visual disconnect where the heatmap shows classification for audio that hasn't reached the same x-position in the spectrogram.

**The Solution: Aligned Classification Zone**

```
SPECTROGRAM:
│ ░░░░░░░░░░ BUFFERING ZONE ░░░░░░░░░░ │██████ DISPLAY ZONE ██████│
│ (faded, audio being collected)        │ (solid, already processed) │
│◄────────── bufferSeconds ───────────►│◄────── history ──────────►│
                                        ▲
                                   SYNC POINT

HEATMAP:
│ ░░░░░░░░░░ PENDING ZONE ░░░░░░░░░░░░ │██████ CLASSIFIED ZONE ████│
│ (faded, waiting for FLAM)             │ (solid, painted with scores)│
│◄────────── bufferSeconds ───────────►│◄────── history ──────────►│
                                        ▲
                                   SYNC POINT (same x-position)
```

**Implementation Approach:**

1. **Track buffer start position**: Record canvas x-position when audio buffering begins
2. **Draw pending zone**: Both visualizations show a faded zone for the current buffer
3. **Retroactive painting**: When classification completes, use `frame_scores` to paint the heatmap retroactively from buffer_start_x to current_x
4. **Visual sync marker**: Optional subtle vertical line showing the classification boundary

```tsx
// Conceptual implementation
const bufferStartXRef = useRef<number>(canvasWidth);
const isBufferingRef = useRef<boolean>(false);

// When buffer starts
const onBufferStart = () => {
  bufferStartXRef.current = currentCanvasX;
  isBufferingRef.current = true;
};

// When classification completes
const onClassificationComplete = (frameScores: Record<string, number[]>) => {
  const startX = bufferStartXRef.current;
  const endX = currentCanvasX;
  const pixelWidth = endX - startX;

  // Paint each frame to its corresponding pixel column
  for (const [prompt, scores] of Object.entries(frameScores)) {
    const row = prompts.indexOf(prompt);
    scores.forEach((score, frameIdx) => {
      const x = startX + (frameIdx / scores.length) * pixelWidth;
      paintHeatmapColumn(x, row, score);
    });
  }

  isBufferingRef.current = false;
};

// In draw loop - fade pending zone
const drawPendingZone = (ctx: CanvasRenderingContext2D) => {
  if (isBufferingRef.current) {
    const pendingWidth = currentCanvasX - bufferStartXRef.current;
    ctx.fillStyle = 'rgba(9, 13, 18, 0.5)';
    ctx.fillRect(bufferStartXRef.current, 0, pendingWidth, canvas.height);
  }
};
```

### Implementation Notes (v0.4.2)

The Immersive Flow layout was implemented with the following components:

#### Files Modified
- `frontend/src/App.tsx` - Added ~500 lines for Immersive layout render, state, and helpers
- `frontend/src/styles.css` - Added ~650 lines of CSS for Immersive layout styling

#### Key Implementation Details

1. **Layout Toggle State**
   ```tsx
   const [layoutMode, setLayoutMode] = useState<"immersive" | "classic">("immersive");
   ```
   - Immersive is now the default layout
   - Toggle buttons in both layouts to switch between them

2. **Dynamic Label Styling** - Implemented as `getDynamicLabelStyle()`:
   ```tsx
   const getDynamicLabelStyle = (score: number, theme: ThemeColors): React.CSSProperties => {
     const normalizedScore = Math.max(0, Math.min(1, score));
     const [r, g, b] = theme.labelAccent;
     return {
       opacity: 0.3 + (normalizedScore * 0.7),
       fontWeight: 400 + Math.round(normalizedScore * 300),
       color: `rgba(${r}, ${g}, ${b}, ${0.6 + normalizedScore * 0.4})`,
       transition: 'all 0.3s ease',
     };
   };
   ```

3. **Canvas Width Synchronization** - Solved the speed mismatch:
   - Both spectrogram and heatmap sections use flexbox with `display: flex`
   - Canvas wrappers use `flex: 1` to fill available space
   - Spectrogram has a 220px transparent spacer (`.spectrogram-label-spacer`)
   - Heatmap has the 220px labels panel (`.dynamic-labels`)
   - Result: Both canvases have identical visible widths - identical scroll speeds

4. **Heatmap Always-Shift Fix**:
   ```tsx
   // Draw heatmap - ALWAYS shift to stay in sync with spectrogram
   heatmapContext.drawImage(heatmapCanvas, -1, 0);
   ```
   - Previously only shifted when scores existed, causing desync
   - Now shifts unconditionally like the spectrogram

5. **Labels in Original Order**:
   - `promptsWithScores` computed using `prompts.map()` to preserve original order
   - Labels stay aligned to their corresponding heatmap rows
   - Sorting only affects the scores panel in Classic mode

6. **Settings Slide-Out Panel**:
   - `.settings-overlay` with opacity transition
   - `.settings-panel` with `transform: translateX()` animation
   - Full settings controls moved to panel (prompts, modes, inference, frequency, timing)

7. **Compact Footer Controls**:
   - Video player or mic controls
   - Preset buttons (Action, Sports, Music)
   - Buffer duration slider
   - Model status badge

#### CSS Architecture
- New CSS variables for darker theme (`--bg: #090d12`)
- Immersive styles in `/* IMMERSIVE FLOW LAYOUT */` section (~650 lines)
- Legacy styles preserved in `/* LEGACY STYLES */` section
- Mobile responsive adjustments for `.immersive-footer`, `.dynamic-labels`, `.settings-panel`

---

### Implementation Notes (v0.4.3) - Color Themes

Added 5 selectable color themes for spectrogram and heatmap visualization.

#### Theme Definitions

```tsx
type ColorTheme = "inferno" | "matrix" | "bone" | "plasma" | "ocean";

interface ThemeColors {
  name: string;              // Display name
  stops: HeatColorStop[];    // Gradient color stops
  labelAccent: [r, g, b];    // RGB for dynamic label color
  canvasBg: string;          // Canvas background
}
```

#### Available Themes

| Theme | Color Range | Use Case |
|-------|-------------|----------|
| **Inferno** | Black - Purple - Orange - Yellow - White | Classic spectrogram, high contrast |
| **Matrix** | Dark blue - Teal - Green - Cyan | Cyberpunk aesthetic, cool tones |
| **Bone** | Pure grayscale black to white | Clinical/scientific, accessibility |
| **Plasma** | Purple - Magenta - Orange - Yellow | Vibrant, perceptually uniform |
| **Ocean** | Deep blue - Teal - Light cyan | Calming, cool palette |

#### Implementation

1. **State and Ref**:
   ```tsx
   const [colorTheme, setColorTheme] = useState<ColorTheme>("inferno");
   const colorThemeRef = useRef<ColorTheme>("inferno");
   ```

2. **Color Function**:
   ```tsx
   const getColorFromStops = (value: number, stops: HeatColorStop[]): string => {
     // Interpolate between color stops based on value (0-1)
   };
   ```

3. **Canvas Drawing** - Uses current theme from ref:
   ```tsx
   const themeStops = COLOR_THEMES[colorThemeRef.current].stops;
   spectrogramContext.fillStyle = getColorFromStops(intensity, themeStops);
   ```

4. **Settings UI** - 2x2 grid of theme buttons:
   ```tsx
   <div className="theme-selector">
     {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((theme) => (
       <button
         className={`theme-option ${colorTheme === theme ? "active" : ""}`}
         onClick={() => setColorTheme(theme)}
       >
         {COLOR_THEMES[theme].name}
       </button>
     ))}
   </div>
   ```

---

### Comparison: Current vs Immersive Flow

| Feature | Current | Immersive Flow |
|---------|---------|----------------|
| **Edge fade** | None | Left fade-in vignette |
| **Label opacity** | Static | Dynamic (0.3-1.0) based on score |
| **Label weight** | Static 400 | Dynamic (400-700) based on score |
| **Label order** | Toggle (default off) | **Sorted by score ON by default** |
| **Spectrogram/Heatmap sync** | Misaligned | Aligned at classification boundary |
| **Pending zone** | None | Faded zone showing buffer collection |
| **Retroactive paint** | None | Use `frame_scores` for frame-level detail |
| **Overall feel** | Static dashboard | Flowing, alive, immersive |

### Why This Layout Works

1. **Visualization-first**: 80%+ of screen dedicated to spectrogram and heatmap
2. **Information hierarchy**: High scores naturally draw attention (bold, bright)
3. **Temporal clarity**: Sync point makes it clear what audio corresponds to what classification
4. **Sense of flow**: Fade effects create a feeling of audio streaming through the interface
5. **Reduced cognitive load**: Labels that matter are prominent; irrelevant ones fade away

---

## Proposed Layout: "Mobile/Compact Mode"

For narrow screens or embedded use.

```
┌─────────────────────────────────┐
│  🎤 SonoTag          [⚙️] [▶/⏹] │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐ │
│  │      SPECTROGRAM          │ │
│  │      (compact height)     │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ speech      ████░░  0.82 │ │
│  │ music       ░░░░░░  0.12 │ │
│  │ dog barking ███░░░  0.67 │ │
│  │ (heatmap + live scores)   │ │
│  └───────────────────────────┘ │
│                                 │
│  🎙️ [MacBook Pro ▼] Level: 62% │
│  Buffer: 5s  Speed: 2  ✅ Ready │
│                                 │
└─────────────────────────────────┘
```

---

## Component Breakdown

### 1. Header Bar
```tsx
<header className="header-bar">
  <Logo />
  <StatusPill status={monitoringStatus} />
  <ModeToggle modes={["Focus", "Power"]} />
  <SettingsButton onClick={openSettings} />
</header>
```

### 2. Visualization Stack
```tsx
<div className="viz-stack">
  <SpectrogramCanvas
    freqRange={freqRange}
    slideSpeed={slideSpeed}
  />
  <HeatmapCanvas
    prompts={prompts}
    scores={classificationScores}
    frameScores={frameScores}
    smoothedScores={smoothedFrameScores}
    showSmoothed={postprocess}
  />
  <LiveScoresPanel
    prompts={prompts}
    scores={classificationScores}
    normalized={normalizeScores}
  />
</div>
```

### 3. Quick Controls (Bottom Bar)
```tsx
<div className="quick-controls">
  <MicSelector
    devices={devices}
    selected={selectedDeviceId}
    onSelect={setSelectedDeviceId}
  />
  <BufferSlider
    value={bufferSeconds}
    min={1} max={10}
    onChange={setBufferSeconds}
  />
  <SpeedSlider
    value={slideSpeed}
    min={1} max={5}
    onChange={setSlideSpeed}
  />
  <StatusIndicator
    modelStatus={modelStatus}
    inferenceTime={lastInferenceTime}
    inferenceCount={inferenceCount}
  />
</div>
```

### 4. Settings Panel (Slide-out or Modal)
```tsx
<SettingsPanel isOpen={settingsOpen}>
  <Section title="Prompts">
    <PromptsTextarea value={promptInput} onChange={setPromptInput} />
    <PromptPresets onSelect={loadPreset} />
    <Button onClick={updatePrompts}>Update</Button>
  </Section>

  <Section title="Detection Mode">
    <RadioGroup
      options={["Clamped (paper)", "Relative (normalized)"]}
      value={normalizeScores ? "relative" : "clamped"}
      onChange={...}
    />
    <Checkbox
      label="Loudness Relabel Postprocessing"
      checked={postprocess}
      onChange={setPostprocess}
    />
    <Slider
      label="Threshold"
      value={threshold}
      min={0} max={1} step={0.05}
      onChange={setThreshold}
      disabled={!postprocess}
    />
  </Section>

  <Section title="Frequency Range">
    <FreqRangeInputs
      min={freqMin} max={freqMax}
      nyquist={nyquist}
      onChange={...}
    />
  </Section>

  <Section title="System Info" collapsible>
    <SystemInfoPanel
      backendInfo={backendInfo}
      browserInfo={browserInfo}
      recommendation={recommendation}
    />
  </Section>
</SettingsPanel>
```

---

## Feature: Prompt Presets

Add quick-select presets for common use cases:

```tsx
const PROMPT_PRESETS = {
  "General Audio": [
    "speech", "music", "silence", "noise"
  ],
  "Voice Detection": [
    "speech", "male speech, man speaking",
    "female speech, woman speaking",
    "child speech, kid speaking", "singing"
  ],
  "Pet Sounds": [
    "dog barking", "cat meowing", "bird chirping",
    "animal sounds"
  ],
  "Environment": [
    "traffic noise", "rain", "wind",
    "construction", "crowd noise"
  ],
  "Security": [
    "glass breaking", "gunshot", "screaming",
    "alarm", "siren"
  ],
  "Music Analysis": [
    "music", "drums", "guitar", "piano",
    "vocals", "bass"
  ]
};
```

---

## Feature: Temporal Heatmap View

New visualization option that shows frame-wise detection over time:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TEMPORAL DETECTION (10s window, 20 frames × 0.5s)                         │
│                                                                             │
│  speech      │▓▓▓▓│▓▓▓▓│▓▓▓▓│░░░░│░░░░│░░░░│░░░░│▓▓▓▓│▓▓▓▓│▓▓▓▓│▓▓▓▓│▓▓▓▓│
│  music       │░░░░│░░░░│░░░░│░░░░│░░░░│░░░░│░░░░│░░░░│░░░░│░░░░│░░░░│░░░░│
│  dog barking │░░░░│░░░░│░░░░│▓▓▓▓│▓▓▓▓│▓▓▓▓│▓▓▓▓│░░░░│░░░░│░░░░│░░░░│░░░░│
│              └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
│               0s   1s   2s   3s   4s   5s   6s   7s   8s   9s  10s        │
│                                                                             │
│  ○ Raw Scores  ● Smoothed (Loudness Relabel)                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

This uses the `frame_scores` / `smoothed_frame_scores` from `/classify-local`.

---

## Color Scheme Options

### Current (Warm/Sepia)
```css
--bg-dark: #0b0f14;
--bg-panel: #1a120d;
--accent: #ff7a3d;
--text: #eee;
--heat-low: rgb(26, 20, 16);
--heat-high: rgb(244, 219, 173);
```

### Alternative: Cool/Technical
```css
--bg-dark: #0a0e14;
--bg-panel: #0d1117;
--accent: #58a6ff;
--text: #e6edf3;
--heat-low: rgb(13, 17, 23);
--heat-high: rgb(88, 166, 255);
```

### Alternative: High Contrast
```css
--bg-dark: #000000;
--bg-panel: #111111;
--accent: #00ff88;
--text: #ffffff;
--heat-low: rgb(0, 0, 0);
--heat-high: rgb(0, 255, 136);
```

---

## Implementation Priority

1. **Phase 1: Quick Controls Bar** (1-2 hours)
   - Move mic selector, buffer, speed to bottom bar
   - Compact inline sliders

2. **Phase 2: Settings Slide-out** (2-3 hours)
   - Move prompts, detection mode, system info to slide-out
   - Clean up main view

3. **Phase 3: Prompt Presets** (1 hour)
   - Add preset dropdown
   - Store custom presets in localStorage

4. **Phase 4: Temporal Heatmap** (2-3 hours)
   - Use frame_scores to draw per-frame blocks
   - Toggle between scrolling and static view

5. **Phase 5: Mode Toggle** (1-2 hours)
   - Focus mode (minimal UI)
   - Power mode (all controls visible)
   - Mobile mode (responsive)

---

## Accessibility Considerations

- All controls keyboard-navigable
- ARIA labels for screen readers
- Color scheme meets WCAG contrast ratios
- Focus indicators on interactive elements
- Reduce motion option for animations

---

## Files to Modify

| File | Changes |
|------|---------|
| `App.tsx` | Main layout restructure |
| `styles.css` | New component styles |
| `components/Header.tsx` | New header component |
| `components/QuickControls.tsx` | Bottom bar component |
| `components/SettingsPanel.tsx` | Slide-out settings |
| `components/PromptPresets.tsx` | Preset dropdown |
| `components/TemporalHeatmap.tsx` | New frame-wise viz |

---

## Summary

The proposed layout prioritizes:

1. **Visualization first** - Spectrogram and heatmap get maximum screen space
2. **Progressive disclosure** - Advanced settings hidden in panel
3. **Quick access** - Essential controls always visible in bottom bar
4. **Flexibility** - Mode toggle for different user needs
5. **Temporal clarity** - New frame-wise heatmap shows detection over time

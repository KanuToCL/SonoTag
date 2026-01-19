# SonoTag Glassmorphism Layout Proposal

> **Created**: January 19, 2026
> **Status**: Concept / Future Development
> **Purpose**: Full-screen video playback with floating glass-effect FLAM components

---

## Vision

A cinematic viewing experience where the YouTube video plays in full-screen behind semi-transparent, glass-effect FLAM analysis panels. The user watches content naturally while real-time audio classification floats elegantly on top.

---

## Design Concept

```
+--------------------------------------------------------------------------------+
|                                                                                |
|                         FULL-SCREEN VIDEO PLAYBACK                             |
|                           (YouTube video fills                                 |
|                            entire browser viewport)                            |
|                                                                                |
|   +----------------------------------+                                         |
|   |  SPECTROGRAM                     |                                         |
|   |  (Glassmorphism panel)           |                                         |
|   |  - Translucent background        |                                         |
|   |  - Blur effect (backdrop-filter) |                                         |
|   |  - Subtle border glow            |                                         |
|   +----------------------------------+                                         |
|                                                                                |
|   +----------------------------------+     +------------------+                 |
|   |  HEATMAP + LABELS                |     |  CONTROLS        |                 |
|   |  (Glassmorphism panel)           |     |  (Mini panel)    |                 |
|   |  - Floating over video           |     |  - Play/Pause    |                 |
|   |  - Dynamic opacity               |     |  - Volume        |                 |
|   |  - Draggable position?           |     |  - Settings      |                 |
|   +----------------------------------+     +------------------+                 |
|                                                                                |
+--------------------------------------------------------------------------------+
```

---

## Glassmorphism CSS Properties

The glass effect is achieved using CSS backdrop-filter combined with semi-transparent backgrounds:

```css
.glass-panel {
  /* Semi-transparent background */
  background: rgba(9, 13, 18, 0.65);

  /* Blur effect - the key to glassmorphism */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  /* Subtle border for definition */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;

  /* Soft shadow for depth */
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  /* Optional: subtle gradient overlay */
  background-image: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0) 50%
  );
}

.glass-panel-dark {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.glass-panel-light {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

---

## Layout Architecture

### Full-Screen Video Container

```css
.video-fullscreen-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  background: #000;
}

.video-fullscreen-container video {
  width: 100%;
  height: 100%;
  object-fit: cover; /* or 'contain' for letterboxing */
}
```

### Floating Glass Panels

```css
.floating-panel {
  position: fixed;
  z-index: 100;
  pointer-events: auto;
}

.spectrogram-glass {
  top: 20px;
  left: 20px;
  right: 20px;
  height: 180px;
}

.heatmap-glass {
  bottom: 100px;
  left: 20px;
  width: 400px;
  max-height: 50vh;
}

.controls-glass {
  bottom: 20px;
  right: 20px;
  width: 200px;
}
```

---

## Component Hierarchy

```
<div className="glassmorphism-page">
  {/* Full-screen video backdrop */}
  <div className="video-fullscreen-container">
    <video ref={videoRef} ... />
  </div>

  {/* Floating glass panels */}
  <div className="glass-overlay">
    {/* Spectrogram - top edge */}
    <div className="floating-panel spectrogram-glass glass-panel">
      <canvas ref={spectrogramRef} ... />
    </div>

    {/* Heatmap + Labels - bottom left */}
    <div className="floating-panel heatmap-glass glass-panel">
      <canvas ref={heatmapRef} ... />
      <div className="dynamic-labels glass-labels">
        {/* labels */}
      </div>
    </div>

    {/* Mini controls - bottom right */}
    <div className="floating-panel controls-glass glass-panel-dark">
      <button>Play/Pause</button>
      <input type="range" /> {/* Volume */}
      <button>Settings</button>
    </div>
  </div>
</div>
```

---

## Interaction Patterns

### Panel Visibility Modes

1. **Always Visible**: Panels stay at fixed opacity
2. **Fade on Idle**: Panels fade to lower opacity after 3s of no mouse movement
3. **Hide on Click**: Click video to toggle panels visibility
4. **Hover Reveal**: Panels only appear when mouse is in their area

```tsx
const [panelsVisible, setPanelsVisible] = useState(true);
const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null);

const handleMouseMove = () => {
  setPanelsVisible(true);
  if (idleTimer) clearTimeout(idleTimer);
  setIdleTimer(setTimeout(() => setPanelsVisible(false), 3000));
};
```

### Draggable Panels (Optional)

Allow users to reposition panels by dragging:

```tsx
const [panelPosition, setPanelPosition] = useState({ x: 20, y: 20 });
const [isDragging, setIsDragging] = useState(false);

// Use onMouseDown, onMouseMove, onMouseUp to implement drag
```

---

## Considerations

### Browser Support

- `backdrop-filter` has good modern browser support
- Safari requires `-webkit-backdrop-filter` prefix
- Fallback for older browsers: solid semi-transparent background

```css
.glass-panel {
  /* Fallback for browsers without backdrop-filter */
  background: rgba(9, 13, 18, 0.85);
}

@supports (backdrop-filter: blur(12px)) {
  .glass-panel {
    background: rgba(9, 13, 18, 0.65);
    backdrop-filter: blur(12px);
  }
}
```

### Performance

- `backdrop-filter` can be GPU-intensive
- Consider reducing blur radius on lower-end devices
- Use `will-change: transform` on panels for smoother animations

### Video Controls

- Need custom video controls (native controls hidden in fullscreen)
- Keyboard shortcuts: Space (play/pause), Arrow keys (seek), M (mute)
- Picture-in-picture option for the FLAM panels?

---

## Future Enhancements

1. **Panel Opacity Slider**: User control over glass transparency
2. **Panel Size Controls**: Resize panels with drag handles
3. **Layout Presets**: Save/load panel arrangements
4. **Theme Integration**: Glass tint color matches current color theme
5. **VR/AR Mode**: Floating panels in 3D space for XR viewing
6. **Multi-Monitor**: Video on one screen, FLAM panels on another

---

## Implementation Priority

| Priority | Feature | Effort |
|----------|---------|--------|
| 1 | Full-screen video playback | Medium |
| 2 | Basic glass panels (spectrogram, heatmap) | Medium |
| 3 | Mini controls panel | Low |
| 4 | Fade on idle behavior | Low |
| 5 | Draggable panels | Medium |
| 6 | Panel visibility toggles | Low |
| 7 | Custom video controls | High |

---

## Related Documentation

- [GUI Layout Proposal](./gui-layout-proposal.md) - Other layout options including Immersive Flow
- [CHANGELOG](../CHANGELOG.md) - Version history and feature additions

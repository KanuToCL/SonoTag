# SonoTag UI Style Guide

> **Last Updated**: January 20, 2026
> **Status**: Active
> **Purpose**: Design standards for consistent UI development

---

## Core Design Principles

1. **Glassmorphism First** — Floating modals use translucent, blurred backgrounds
2. **Minimal Chrome** — Reduce visual clutter; let content breathe
3. **Dark-Native** — Optimized for dark themes with subtle highlights
4. **Non-Intrusive** — UI elements should feel like they float over content

---

## Color Palette

### Base Colors (CSS Variables)

```css
:root {
  --bg: #090d12;           /* Main background */
  --bg-accent: #0f1520;    /* Elevated surfaces */
  --panel: #121a26;        /* Panel backgrounds */
  --panel-soft: #0f1520;   /* Subtle panel variant */
  --border: #223045;       /* Standard borders */
  --text: #f5f7fb;         /* Primary text */
  --muted: #9aa7bd;        /* Secondary text */
  --accent: #ff7a3d;       /* Primary accent (orange) */
  --accent-2: #2ad1ff;     /* Secondary accent (cyan) */
  --success: #5ce3a2;      /* Success states */
  --danger: #ff6b6b;       /* Error states */
}
```

### Glassmorphism Transparency Levels

| Use Case | Background RGBA | Blur |
|----------|-----------------|------|
| **Floating Modals** | `rgba(15, 20, 30, 0.55)` | `12px` |
| **Overlay Panels** | `rgba(0, 0, 0, 0.65)` | `12px` |
| **Subtle Glass** | `rgba(255, 255, 255, 0.05)` | `8px` |
| **Dark Glass** | `rgba(0, 0, 0, 0.5)` | `20px` |

---

## Glassmorphism Components

### Floating Modal Pattern

All floating modals (Labels, Video, etc.) should follow this pattern:

```tsx
<div
  className="floating-modal"
  style={{
    position: "fixed",
    background: "rgba(15, 20, 30, 0.55)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
    overflow: "hidden",
  }}
>
  {/* Transparent drag handle / topbar */}
  <div
    className="modal-drag-handle"
    style={{
      height: "28px",
      background: "transparent",
      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    }}
  >
    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
      Title
    </span>
    <button>×</button>
  </div>

  {/* Content area */}
  <div className="modal-content">
    {/* ... */}
  </div>
</div>
```

### Key Properties

| Property | Value | Purpose |
|----------|-------|---------|
| `background` | `rgba(15, 20, 30, 0.55)` | Semi-transparent dark |
| `backdropFilter` | `blur(12px)` | Frosted glass effect |
| `WebkitBackdropFilter` | `blur(12px)` | Safari support |
| `border` | `1px solid rgba(255, 255, 255, 0.08)` | Subtle edge definition |
| `boxShadow` | `0 8px 32px rgba(0, 0, 0, 0.4)` | Depth/elevation |
| `borderRadius` | `8px` | Consistent corner rounding |

### Topbar / Drag Handle

The topbar should be **transparent** to maintain the glassmorphism effect:

```css
.modal-drag-handle {
  height: 28px;
  background: transparent;  /* NOT opaque! */
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: grab;
}
```

---

## Scrollbar Styling

Scrollbars within glass panels should be minimal and transparent:

```css
/* Webkit (Chrome, Safari, Edge) */
.floating-modal ::-webkit-scrollbar {
  width: 6px;
}

.floating-modal ::-webkit-scrollbar-track {
  background: transparent;
}

.floating-modal ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.floating-modal ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Firefox */
.floating-modal * {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
```

---

## Typography

### Font Stack

```css
font-family: "Space Grotesk", "Segoe UI", sans-serif;
```

### Sizes

| Element | Size | Weight |
|---------|------|--------|
| Modal title | `11px` | 400 |
| Labels | `11px` | 400-600 |
| Section headers | `10px` | 500 (uppercase) |
| Scores/values | `9px` | 400 (monospace) |

### Section Headers (e.g., "Spectrogram", "FLAM Detection")

```css
.section-header {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(154, 167, 189, 0.6);
}
```

---

## Button Patterns

### Quick Action Buttons

```css
.quick-action-btn {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-action-btn:hover,
.quick-action-btn.active {
  background: rgba(255, 255, 255, 0.15);
  color: var(--text);
}
```

### Close Button (×)

```css
.close-btn {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
}
```

---

## Z-Index Hierarchy

| Layer | z-index | Elements |
|-------|---------|----------|
| Base content | 0-10 | Spectrogram, heatmap, main UI |
| Labels overlay | 15 | Section labels ("Spectrogram", "FLAM Detection") |
| Settings panel | 100 | Side panels, dropdowns |
| Video modal | 500 | Floating video player |
| Labels modal | 501 | Floating labels panel |
| Tooltips | 1000 | Hover tooltips |

---

## Animation & Transitions

### Standard Transitions

```css
transition: all 0.2s ease;
```

### Modal Visibility

```css
/* Hide/show without unmounting (preserves state) */
visibility: hidden;  /* or visible */
opacity: 0;          /* or 1 */
transition: opacity 0.2s ease, visibility 0.2s ease;
```

### Pulse Animation (Live indicator)

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.live-indicator {
  animation: pulse 2s ease infinite;
}
```

---

## Browser Compatibility

### Backdrop Filter Support

```css
/* Fallback for browsers without backdrop-filter */
.glass-panel {
  background: rgba(9, 13, 18, 0.85);
}

@supports (backdrop-filter: blur(12px)) {
  .glass-panel {
    background: rgba(15, 20, 30, 0.55);
    backdrop-filter: blur(12px);
  }
}
```

---

## Checklist for New Components

- [ ] Uses glassmorphism background (`rgba` + `backdrop-filter`)
- [ ] Transparent topbar (not opaque)
- [ ] Subtle border (`rgba(255, 255, 255, 0.08)`)
- [ ] Consistent border-radius (`8px`)
- [ ] Transparent scrollbars if scrollable
- [ ] Uses CSS variables for colors
- [ ] Proper z-index layer
- [ ] Smooth transitions (`0.2s ease`)

---

## Related Documentation

- [Glassmorphism Layout Proposal](./glassmorphism-layout.md) — Original concept document
- [GUI Layout Proposal](./gui-layout-proposal.md) — Layout architecture options

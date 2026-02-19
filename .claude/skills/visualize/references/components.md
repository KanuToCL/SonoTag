# Component Library

Opt-in building blocks for visualizations. Use these when your design needs them — don't force-include them all. Style each component to match your creative direction (fonts, colors, spacing). These are starting points, not finished designs.

---

## Metrics Card

A prominent number with label and optional trend indicator. Use for KPIs, stats, or any numeric highlight.

**Structure**: Value (large, colored), label (small, muted), optional trend arrow with percentage.
**Layout**: Typically in a grid (`repeat(auto-fit, minmax(200px, 1fr))`).
**Styling**: Surface background, border, rounded corners (12px), center-aligned.

---

## Callout / Alert

A highlighted message box with icon, title, and body text. Use for warnings, key decisions, important notes, or tips.

**Structure**: Icon (left), title (bold) + body text (right). Left border accent (4px solid).
**Variants**: Info (blue), success (green), warning (amber), error (red). Use `color-mix()` for tinted backgrounds.
**Icons**: Info → ℹ, Success → ✓, Warning → ⚠, Error → ✕

---

## Collapsible Section

Progressive disclosure via `<details>/<summary>`. Use for secondary content, deep dives, or optional detail.

**Structure**: `<details>` with styled `<summary>`. Arrow indicator rotates on open.
**Styling**: Border, rounded corners, background change on hover. Content area has top border separator.

---

## Code Block with Copy

Syntax-highlighted code with a copy button. Use when showing code examples, configurations, or CLI commands.

**Structure**: Header bar (language label + copy button) over dark pre/code block.
**Styling**: Dark background (#0f172a), monospace font, 0.85rem size. Copy button in header.
**Script**: `navigator.clipboard.writeText()` with "Copied!" feedback.

---

## Sortable Data Table

A table with clickable column headers for sorting. Use for structured comparisons or tabular data.

**Structure**: `<table>` with `data-sortable` attribute. `<th>` elements have `data-sort="string|number"`.
**Styling**: Uppercase headers (0.8rem), alternating row hover, border-bottom separators.
**Script**: Sort rows on header click, toggle ascending/descending, show ↕ indicator.

---

## Tabs

Switch between content panels without page reload. Use for comparing approaches, showing different views of the same data, or organizing related sections.

**Structure**: Tab buttons in a row (`.tab-list`) + content panels (`.tab-panel`). Active state via class toggle.
**Styling**: Bottom border on active tab (primary color), transparent background, smooth transitions.
**Script**: Click handler toggles active class on buttons and panels.

---

## Timeline

Vertical sequence of events with date markers. Use for session summaries, project history, incident timelines, or chronological narratives.

**Structure**: Vertical line (left), circular markers, date/title/body stacked right of the line.
**Styling**: Line uses gradient (primary → border color). Markers are circles with border ring. Stagger animate-in.

---

## Progress Bar

A horizontal fill bar showing completion or proportion. Use for project status, loading states, or comparative metrics.

**Structure**: Label row (name + percentage, `justify-content: space-between`) over track with fill.
**Styling**: Track is 8px tall, rounded, muted background. Fill is primary color with width transition.

---

## Tag / Badge

Small inline labels for categorization or status. Use for status indicators, category labels, or metadata.

**Structure**: Inline-block `<span>` with padding and border-radius (20px pill shape).
**Variants**: Primary, success, warning, error, neutral. Use `color-mix()` for tinted backgrounds.
**Sizing**: 0.75rem, 500 weight, tight letter-spacing.

---

## Chart (Chart.js)

Data visualization via Chart.js. Use for bar charts, line charts, pie charts, or any quantitative visualization.

**CDN**: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4" crossorigin="anonymous" defer></script>`
**Container**: Relative-positioned div with fixed height (300px), canvas element inside.
**Config**: `responsive: true`, `maintainAspectRatio: false`, legend at bottom.
**Types**: bar, line, pie, doughnut, radar, polarArea.

---

## Mermaid Diagram

Flowcharts, sequence diagrams, and other structured diagrams via Mermaid. Use for system architecture, workflows, state machines, or any process visualization.

**CDN**: `<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js" crossorigin="anonymous" defer></script>`
**Container**: `<pre class="mermaid">` inside a styled container div.
**Init**: `mermaid.initialize({ startOnLoad: true, theme: 'default' })` — adjust theme for dark mode.
**Types**: graph TD/LR, sequenceDiagram, stateDiagram, classDiagram, gantt, pie.

---

## Auto-Generated Table of Contents

Sticky sidebar navigation generated from page headings. Use for long-form content with multiple sections.

**Structure**: Fixed `<nav>` (left side), auto-populated `<ul>` from `<h2>` and `<h3>` elements.
**Behavior**: IntersectionObserver highlights the active section. Indent h3 items.
**Responsive**: Hide on screens narrower than 1400px.
**Print**: Hidden via `@media print`.

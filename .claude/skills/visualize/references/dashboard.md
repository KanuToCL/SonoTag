# Dashboard

A metrics-forward format for monitoring project health, system status, or business KPIs. Dense, data-rich, status-at-a-glance.

---

## When to Use

Detect this archetype when:
- User mentions "dashboard", "status", "metrics", "KPIs", or "monitoring"
- Content is primarily numeric: health scores, counts, percentages, trends
- User wants a "status board", "health check", or "overview"
- Data needs to be compared against targets or historical baselines
- There is a need to answer "how are we doing?" in under 3 seconds
- Multiple related metrics need to be monitored simultaneously

---

## Communication Goal

A dashboard communicates system or business health through numbers, trends, and status signals. The reader should be able to assess overall status at a glance, identify anything that needs attention, and drill into specifics only when something looks wrong. Every visual element earns its place by answering a question the reader actually has.

---

## Layout DNA

The page opens with a header bar showing the dashboard title, a "last updated" timestamp, and an overall status badge that gives an instant health read. Immediately below, a row of 4-6 key metric cards displays the top-level KPIs with trend indicators (up/down arrows, sparklines, or delta values). The middle section uses a 2-3 column grid for charts showing trends over time, placed side by side for easy comparison. Below the charts, detailed metric tables or card groups provide component-level breakdowns organized by category. An alerts section near the bottom surfaces active warnings, threshold violations, or recent incidents that need attention.

---

## Interaction DNA

Dashboards feel alive even when static. Trend indicators and sparklines create a sense of motion and recency. Status colors (green, yellow, red) function as a traffic light system that the reader processes pre-consciously before reading any numbers. Sortable tables in the detail sections let readers reorder by severity or value to find outliers. Hover states on metric cards can reveal additional context like historical ranges or target thresholds. The reading pattern is Z-shaped: KPI row left to right, then charts left to right, then scanning the alerts section for anything red.

---

## Flavor Seeds

**Mission Control** — The nerve center at Houston during a launch sequence: banks of glowing monitors, each showing a different subsystem's vitals. Dark background, electric cyan and amber readouts, monospace numbers ticking in real time. Every screen is a window into something that could go wrong. The tension of constant vigilance made beautiful.

**Weather Station** — A meteorologist's multi-panel forecast display: pressure maps, temperature gradients, wind vectors, precipitation probability gauges. Each panel tells a different part of the same atmospheric story. Soft blues and whites, clean iconography, data presented as natural phenomena rather than abstract numbers.

**Cockpit Instrument Panel** — The analog gauges of a vintage aircraft: altimeter, airspeed indicator, artificial horizon, fuel gauge. Each instrument has a green arc (normal), yellow arc (caution), red line (danger). Round dials with needles that communicate state through position. Functional beauty born from life-or-death clarity.

**Trading Floor Terminal** — A Bloomberg terminal's dense grid of tickers, charts, and alerts. Black background, sharp green and red for gains and losses, numbers updating in flickers. Information density pushed to the extreme, where every pixel carries meaning. The beauty of data as a living organism.

**Greenhouse Monitor** — A smart greenhouse's environmental dashboard: soil moisture bars, light intensity curves, temperature gradients, growth rate sparklines. Warm greens and earth tones, organic shapes for data visualization, the patient rhythm of things growing. Technology in service of something alive.

---

## CDN Dependencies

- **Chart.js** (for line charts, bar charts, doughnut charts): `<script src="https://cdn.jsdelivr.net/npm/chart.js@4" crossorigin="anonymous" defer></script>`
- **Sparkline libraries** (optional, for inline trend indicators): can be achieved with inline SVG or Chart.js

---

## Anti-Patterns

- Don't display more than 6-8 top-level KPIs. Too many metrics dilutes attention and makes nothing feel important.
- Don't show numbers without trend indicators. A value without direction is half the story.
- Don't use status colors (green, yellow, red) decoratively. They must consistently mean good, warning, and critical, or the whole color system loses trust.
- Don't write paragraphs of explanation on a dashboard. Dashboards are for scanning, not reading.
- Don't omit a "last updated" timestamp. Data freshness is critical for trust, and stale dashboards are dangerous.
- Don't give equal visual weight to all sections. The hierarchy is KPIs at the top, then trends, then details, then alerts.
- Don't create charts without clear axis labels and legends. An unlabeled chart is worse than no chart because it invites misinterpretation.

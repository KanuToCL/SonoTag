# Experiment Report

A structured, data-forward format for presenting experimental results, debug investigations, and metric deep-dives. Verdict-first, evidence-layered, actionable.

---

## When to Use

Detect this archetype when:
- User mentions "experiment", "A/B test", "results", "analysis", "findings", or "debug"
- Content has a hypothesis/question being tested with data
- There are metrics, statistical results, or before/after comparisons
- User asks to "report on", "summarize results of", or "deep dive into" an experiment

---

## Design Principles

1. **Lead with the verdict.** The very first element should be a callout stating the conclusion with severity (positive/negative/neutral). Don't bury it.
2. **Progressive depth.** Structure as layers: Executive Summary (3-second read) → Key Metrics (10-second scan) → Detailed Breakdowns (deep read) → Root Cause (expert analysis). Each layer adds detail without requiring you to read everything.
3. **Multi-level breakdowns.** Show data at multiple scopes using tabs: Overall → Segment → Sub-segment → Conversion type. Let readers drill into the level they care about.
4. **Readable numbers, colored containers.** All metric values must be in DARK text (near-black) — never use colored text for data values. Instead, use color on the CONTAINER: background tints, border accents, and small badge pills next to the value. Saturation should scale with magnitude — a +15.9% lift gets a more saturated green background tint than a +7.5% lift. Negative results get red-tinted containers. Neutral/NSS results get gray.
5. **Statistical context always.** Every number needs: confidence interval `[-0.49%, -0.13%]`, significance indicator (SS/NSS), and comparison baseline. Use small badge pills next to values in table cells.
5. **Show the "smoking gun."** When a root cause is found, give it its own section with a dramatic title. Highlight the specific data that clinches it.
6. **Hypothesis cards with confidence levels.** Present root cause hypotheses as cards: Primary (high confidence), Secondary (moderate), Tertiary (low). Each with evidence bullets and verification steps.
7. **Historical comparison.** Compare current results with previous experiments. This context is often more valuable than the raw numbers alone.
8. **Actionable recommendations.** Numbered, specific, with linked data sources. Each recommendation should say what to do, why, and how to verify.
9. **Link everything.** Every data claim should link to its source: Deltoid queries, Daiquery notebooks, Scuba dashboards, Unidash widgets.

---

## Layout Architecture

**Page structure:** Single scrollable page with card-based sections, tabs for multi-scope data, charts inline.

```
[Gradient Header]      → Title, experiment ID, QRT universe, date range, platform
[Executive Summary]    → Verdict callout (severity-colored) + 4-6 metric cards
[Detailed Metrics]     → Tabbed tables at multiple scopes (e.g., Carousel → Feed → Topline → By Surface)
[Smoking Gun]          → The key breakdown that explains the result (conversion type, funnel, etc.)
[Daily Trend]          → Line chart showing the metric over time (novelty? persistence? stabilization?)
[Historical Comparison]→ Side-by-side table + chart vs previous experiments
[Root Cause Analysis]  → Hypothesis cards (Primary/Secondary/Tertiary) with evidence and verification steps
[Recommendations]      → Numbered action items with specifics and linked queries
[Data Source Links]     → Reference table of all Deltoid/Daiquery/Scuba links used
```

**Visual density:** High. This is a working document for engineers and data scientists. Dense tables, inline significance badges, two-column layouts for side-by-side comparisons — all expected. Use cards with clear section headers to organize the density.

---

## Design Flavor Spectrum

| Flavor | Characteristics |
|--------|----------------|
| **Scientific/Academic** | Clean serif headings, tight grids, footnotes, citation-style references |
| **Data Dashboard** | Dark theme, neon accents on charts, dense metric grids, monitoring feel |
| **Corporate Clean** | Light backgrounds, blue/gray palette, generous whitespace, executive-friendly |
| **Notebook/Lab** | Monospace elements, code-adjacent feel, raw data alongside polished charts |
| **Editorial Data** | NYT/Economist style — beautiful chart typography, annotation-heavy visualizations |

---

## Recommended Components

| Component | How to Use |
|-----------|-----------|
| **Metrics Card** | Executive summary row — 4-6 key numbers with color-coded values and SS/NSS badges |
| **Callout (error/warning/info)** | Verdict banner, key insights, caveats. Use error (red) for regressions, success (green) for wins, warning (amber) for mixed. |
| **Tabs** | Multi-scope breakdowns: Overall → Segment → Sub-segment. Each tab contains its own data table. |
| **Sortable Data Table** | Primary data display. Inline SS badges (`🔴 SS Regression` / `⚪ Not SS` / `🟢 SS Improvement`). Confidence intervals in cells. |
| **Chart (Chart.js)** | Bar charts for conversion type breakdowns, line charts for daily trends, grouped bars for historical comparison |
| **Two-column layout** | Side-by-side comparisons (e.g., distance_70 vs distance_100, 2023 vs 2026) |
| **Hypothesis Card** | Bordered card with confidence label (PRIMARY/SECONDARY/TERTIARY), title, explanation, evidence bullets, verification steps |
| **Numbered Recommendations** | Numbered circle + title + description + linked verification query |
| **Collapsible Section** | Methodology details, raw data tables, supplementary analysis |
| **Tag/Badge** | HIGH IMPACT tags, SS/NSS inline badges, platform tags (iOS/Android) |
| **Data Links Table** | Bottom reference table mapping query names to Deltoid/Daiquery/Scuba URLs |

---

## Anti-Patterns

| Don't | Why |
|-------|-----|
| Bury the conclusion at the bottom | Busy readers need the verdict in the first 3 seconds |
| Use colored text for data values | Numbers must be dark/black. Use colored CONTAINERS (background tints, borders, badges) instead. Colored numbers are hard to read. |
| Show numbers without confidence intervals | `-0.31%` alone is ambiguous — `[-0.49%, -0.13%]` tells the full story |
| Present numbers without SS/NSS indicators | Every metric cell needs a small badge pill for significance status |
| Use flat/uniform color intensity | Saturation should scale with magnitude — a +15% lift should look more vivid than a +3% lift |
| Show only one scope level | Always provide multiple breakdowns (overall → segment → sub-segment) |
| Cherry-pick favorable segments | Show overall results AND all segment breakdowns, including neutral ones |
| Use pie charts for small deltas | Bar charts are better for comparing close values, especially deltas around zero |
| Skip the historical comparison | Current results without past context lose half their meaning |
| Present hypotheses without evidence | Every hypothesis needs specific data points and verification steps |
| Forget data source links | Every claim should be verifiable — link to the actual queries |
| Write paragraphs where a table would do | Dense tabular data > prose descriptions of numbers |

---

## Reference: Gradient Header

```html
<header class="header">
    <div>
        <h1>{Experiment Title} — {Metric} {Direction}</h1>
        <p class="meta">{experiment_flag} · QRT: {universe} · Exp ID: {id} · {date_range} · {platform}</p>
    </div>
    <div class="actions">
        <button onclick="toggleDarkMode()">◐</button>
    </div>
</header>

<style>
.header {
    background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
    border-radius: 16px;
    padding: 2.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    color: white;
}
.header h1 { font-size: 1.75rem; color: white; }
.header .meta { color: rgba(255,255,255,0.85); font-size: 0.875rem; }
</style>
```

## Reference: Readable Numbers + Colored Containers

**Core rule:** All data values are dark text. Color goes on the CONTAINER (background, border, badge), not the number itself. Saturation intensity scales with the magnitude of the result.

```html
<!-- Metric card: dark number, colored background tint -->
<div class="metric-card" style="background: rgba(22, 163, 74, 0.08); border-left: 4px solid rgba(22, 163, 74, 0.6);">
    <div class="metric-value">+15.9%</div>  <!-- ALWAYS dark text -->
    <div class="metric-label">Fashion CTR Lift</div>
    <span class="ss-badge green"><span class="ss-dot"></span> SS</span>
</div>

<!-- Higher magnitude = more saturated background -->
<div class="metric-card" style="background: rgba(22, 163, 74, 0.15); border-left: 4px solid rgba(22, 163, 74, 0.9);">
    <!-- +15.9% gets MORE saturation than +7.5% -->
</div>
<div class="metric-card" style="background: rgba(22, 163, 74, 0.05); border-left: 4px solid rgba(22, 163, 74, 0.3);">
    <!-- +7.5% gets LESS saturation -->
</div>

<!-- Negative result: red-tinted container -->
<div class="metric-card" style="background: rgba(220, 38, 38, 0.08); border-left: 4px solid rgba(220, 38, 38, 0.6);">
    <div class="metric-value">-0.31%</div>  <!-- Still dark text -->
    <span class="ss-badge red"><span class="ss-dot"></span> SS</span>
</div>

<!-- Table cell with badge pill -->
<td>
    <span class="cell-value">+11.3%</span>
    <span class="ss-badge green"><span class="ss-dot"></span> SS</span>
</td>

<style>
/* All values: DARK text, never colored */
.metric-value {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--text-primary); /* near-black */
}
.cell-value {
    font-weight: 600;
    color: var(--text-primary);
}

/* SS badges: small pills next to values */
.ss-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 600;
    margin-left: 0.4rem;
}
.ss-badge.green {
    background: rgba(22, 163, 74, 0.12);
    color: #16a34a;
}
.ss-badge.red {
    background: rgba(220, 38, 38, 0.12);
    color: #dc2626;
}
.ss-badge.amber {
    background: rgba(217, 119, 6, 0.12);
    color: #d97706;
}
.ss-badge.gray {
    background: var(--bg-tertiary);
    color: var(--text-tertiary);
}
.ss-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
}

/* Saturation scaling helper: use inline styles to vary intensity */
/* Low magnitude (< 5%):   rgba(color, 0.04) bg, rgba(color, 0.3) border */
/* Medium magnitude (5-10%): rgba(color, 0.08) bg, rgba(color, 0.5) border */
/* High magnitude (10%+):  rgba(color, 0.14) bg, rgba(color, 0.8) border */
</style>
```

## Reference: Color-Coded Data Table (Deltoid-style)

Data tables should have **colored cell backgrounds** that indicate direction and magnitude. Every cell with a delta value gets a background tint. Dark text always. This mimics the Deltoid experiment UI.

```html
<table class="data-table">
    <thead>
        <tr>
            <th>Metric</th>
            <th>Control</th>
            <th>Treatment</th>
            <th>Delta</th>
            <th>CI</th>
            <th>SS</th>
        </tr>
    </thead>
    <tbody>
        <!-- Strong positive: saturated green background -->
        <tr>
            <td>Fashion CTR</td>
            <td class="mono">2.14%</td>
            <td class="mono">2.48%</td>
            <td class="mono cell-positive-high">+15.9%</td>
            <td class="mono">[+12.1%, +19.7%]</td>
            <td><span class="ss-badge green"><span class="ss-dot"></span> SS</span></td>
        </tr>
        <!-- Moderate positive: medium green -->
        <tr>
            <td>Electronics CTR</td>
            <td class="mono">1.87%</td>
            <td class="mono">2.01%</td>
            <td class="mono cell-positive-med">+7.5%</td>
            <td class="mono">[+4.2%, +10.8%]</td>
            <td><span class="ss-badge green"><span class="ss-dot"></span> SS</span></td>
        </tr>
        <!-- Weak positive: light green -->
        <tr>
            <td>Impressions</td>
            <td class="mono">45.9M</td>
            <td class="mono">46.0M</td>
            <td class="mono cell-positive-low">+0.2%</td>
            <td class="mono">[-0.1%, +0.5%]</td>
            <td><span class="ss-badge gray"><span class="ss-dot"></span> NSS</span></td>
        </tr>
        <!-- Neutral: no color -->
        <tr>
            <td>Supply</td>
            <td class="mono">12.4K</td>
            <td class="mono">12.4K</td>
            <td class="mono cell-neutral">0.00%</td>
            <td class="mono">[-0.02%, +0.02%]</td>
            <td><span class="ss-badge gray"><span class="ss-dot"></span> NSS</span></td>
        </tr>
        <!-- Negative: red background, scaling intensity -->
        <tr>
            <td>CPA</td>
            <td class="mono">$12.40</td>
            <td class="mono">$13.10</td>
            <td class="mono cell-negative-med">-5.6%</td>
            <td class="mono">[-8.1%, -3.2%]</td>
            <td><span class="ss-badge red"><span class="ss-dot"></span> SS</span></td>
        </tr>
    </tbody>
</table>

<style>
/* Color-coded cells: background tint scales with magnitude */
/* Positive (green) */
.cell-positive-high { background: rgba(22, 163, 74, 0.18); }  /* 10%+ */
.cell-positive-med  { background: rgba(22, 163, 74, 0.10); }  /* 5-10% */
.cell-positive-low  { background: rgba(22, 163, 74, 0.05); }  /* 0-5% */

/* Negative (red) */
.cell-negative-high { background: rgba(220, 38, 38, 0.18); }  /* 10%+ */
.cell-negative-med  { background: rgba(220, 38, 38, 0.10); }  /* 5-10% */
.cell-negative-low  { background: rgba(220, 38, 38, 0.05); }  /* 0-5% */

/* Neutral */
.cell-neutral { background: transparent; }

/* ALL cell text stays dark */
.data-table td {
    color: var(--text-primary);
    font-weight: 500;
}

/* Apply color to the entire row if showing overall result */
tr.row-positive-high td { background: rgba(22, 163, 74, 0.06); }
tr.row-negative-high td { background: rgba(220, 38, 38, 0.06); }

/* For metric cards grid, apply the same saturation scaling */
.metric-card.positive-high { background: rgba(22, 163, 74, 0.12); border-left: 4px solid rgba(22, 163, 74, 0.7); }
.metric-card.positive-med  { background: rgba(22, 163, 74, 0.07); border-left: 4px solid rgba(22, 163, 74, 0.4); }
.metric-card.positive-low  { background: rgba(22, 163, 74, 0.04); border-left: 4px solid rgba(22, 163, 74, 0.25); }
.metric-card.negative-high { background: rgba(220, 38, 38, 0.12); border-left: 4px solid rgba(220, 38, 38, 0.7); }
.metric-card.negative-med  { background: rgba(220, 38, 38, 0.07); border-left: 4px solid rgba(220, 38, 38, 0.4); }
.metric-card.negative-low  { background: rgba(220, 38, 38, 0.04); border-left: 4px solid rgba(220, 38, 38, 0.25); }
.metric-card.neutral       { background: var(--bg-secondary); border-left: 4px solid var(--border); }
</style>
```

**Key rules for color-coded tables:**
- Delta columns get colored backgrounds based on direction (green/red) and magnitude (opacity)
- Control and Treatment value columns stay neutral (no background color)
- Text is ALWAYS dark — the background tint provides the visual signal
- Entire rows can be subtly tinted for the overall/summary row
- In dark mode, increase opacity slightly (e.g., 0.18 → 0.22) since dark backgrounds absorb more color

## Reference: Hypothesis Card

```html
<div class="hypo-card primary">
    <div class="hypo-label likely">PRIMARY — HIGH CONFIDENCE</div>
    <h3>{Hypothesis Title}</h3>
    <p>{Explanation of the mechanism}</p>
    <ul class="evidence">
        <li><strong>Evidence:</strong> {specific data point supporting this hypothesis}</li>
        <li><strong>Evidence:</strong> {another data point}</li>
        <li><strong>Mechanism:</strong> {how the causal chain works}</li>
        <li><strong>To verify:</strong> {specific query or check to confirm}</li>
    </ul>
</div>

<style>
.hypo-card {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.25rem;
    margin: 0.75rem 0;
    position: relative;
}
.hypo-card.primary {
    border-color: var(--error);
    border-width: 2px;
}
.hypo-label {
    position: absolute;
    top: -0.6rem;
    left: 1rem;
    background: var(--bg-primary);
    padding: 0 0.5rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.hypo-label.likely { color: var(--error); }
.hypo-label.possible { color: var(--warning); }
.hypo-label.unlikely { color: var(--text-secondary); }
</style>
```

## Reference: Numbered Recommendation

```html
<div class="rec-item">
    <div class="rec-num">1</div>
    <div class="rec-text">
        <strong>{Action title}</strong>
        {Detailed description with specific thresholds, queries, and links}
    </div>
</div>

<style>
.rec-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
}
.rec-num {
    background: var(--primary);
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
    flex-shrink: 0;
}
</style>
```

## Reference: Data Source Links Table

```html
<table class="data-table">
    <thead><tr><th>Query</th><th>Link</th></tr></thead>
    <tbody>
        <tr><td>Overall A&A</td><td><a href="{url}">fburl.com/deltoid3/{id}</a></td></tr>
        <tr><td>Segment Breakdown</td><td><a href="{url}">fburl.com/deltoid3/{id}</a></td></tr>
    </tbody>
</table>
```

---

## Variations

- **A/B test report** (two-arm comparison, lift calculations, segment breakdowns)
- **Experiment debug/regression report** (negative result investigation, root cause analysis, hypothesis cards, "smoking gun" section)
- **Multi-variant test** (3+ arms, tabbed comparison, winner highlight)
- **Metric deep-dive** (single metric trend analysis, anomaly detection, root cause)
- **Launch retrospective** (pre/post launch comparison, target vs actual, lessons learned)
- **Historical comparison report** (current vs past experiment, what changed and why)

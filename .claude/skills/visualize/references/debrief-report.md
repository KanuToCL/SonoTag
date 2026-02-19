# Debrief Report

An editorial, magazine-style format for presenting a structured work digest — what someone accomplished over a period. Bullet-point TLDR, project cards with What/Why/How summaries and highlight bundles, clean and scannable.

---

## When to Use

Detect this archetype when:
- User mentions "debrief", "work digest", "work recap", "weekly update", or "PSC"
- Content is a structured digest with projects, highlight cards, artifacts (diffs, tasks, posts, docs), and coverage data
- The input file is a `digest.md` with sections: Meta, Summary, Projects (each with What/Why/How + Highlights + collapsed Artifacts), Diffs Reviewed, Coverage
- User asks to "visualize a digest", "create a report from digest", or "generate a debrief report"
- Content describes one person's work over a time period with categorized artifacts

---

## Communication Goal

A debrief report communicates the breadth and impact of someone's work over a time period. The reader (the person themselves, their manager, or a peer) should understand in 10 seconds what the top projects were and what was achieved. In 30 seconds, they should grasp the full scope. The report is optimized for sharing — polished enough to post in a Workplace group or include in a PSC packet, but not so corporate that it loses the texture of real engineering work.

**Critical design principle: This is a narrative report, NOT an artifact list.** Individual diffs and tasks are raw material — the report synthesizes them into themed highlights that tell a story about what was accomplished and why it matters.

---

## Layout DNA

The page opens with an **editorial header** — the person's name, period, and a clean dateline. No gradient banners or hero images; this is a magazine article, not a slide deck.

Immediately below, a **TLDR block** with bullet points — one bullet per major project/workstream, each with the project name bolded and a one-sentence impact statement. This is the "if you read nothing else" section. Styled with a subtle accent-colored left border and light tinted background.

A **stats ribbon** runs below the TLDR: compact inline counters for total diffs landed, diffs reviewed, tasks, posts, docs, thanks. Small, secondary, but present for completeness.

The **body** is a series of **always-visible project cards** — NOT collapsed. Each card has:
- A **prominent title** (serif, large) with an artifact count badge
- A **What/Why/How summary block** — three compact lines in a subtly styled container (muted background or left-border accent). What = outcome achieved, Why = business impact, How = technical approach. This gives the reader immediate context without reading highlights.
- **Exactly 3 highlight cards** — each with a bold title and 2-3 sentence narrative summarizing a bundle of related work (not an individual diff). Uses category tags like `[Shipped]`, `[Impact]`, `[Community]`, `[Planning]`, `[Infra]` as small colored pills. Highlights reference specific diffs/docs parenthetically `(D12345, D12346)` but the text is the story.
- A **collapsed "Artifacts (N diffs, N tasks, ...)"** section at the bottom with the raw diff/task/post/doc links for evidence

After all projects, a **"Workplace Activity" section** — a cross-cutting view of where the subject is most engaged. Shows a **Top Themes table** (theme, post count, comment count, key groups), **Notable Posts** (3-5 most impactful posts with 1-sentence summaries), an **Active Discussions** narrative (1-2 sentences), and collapsed full lists of all posts and comments. This section reveals what's top-of-mind beyond code work.

Below that, a **compact "Diffs Reviewed" section** — thematic summaries by domain (not individual listings) with a collapsed full list. Shows collaboration breadth without dominating the page.

At the bottom, a **small coverage table** showing data sources, tools used, and result counts. Footer-tier element.

**Visual density:** Medium. Generous whitespace between cards, comfortable padding within them, but dense highlight bullets within each card.

**Max width:** 900px centered column. Editorial content.

---

## Interaction DNA

The page is primarily a reading experience:

- **Project cards are always visible.** No collapsing. The reader sees the full scope immediately — title + What/Why/How + 3 highlight cards for every project without clicking anything.
- **"Artifacts" is collapsed** (`<details>/<summary>`) within each card for those who want the raw list. Most readers won't open this.
- **"Workplace Activity" shows engagement themes** — Top Themes table and Notable Posts always visible, full post/comment lists collapsed.
- **"Diffs Reviewed" shows thematic summaries** — domain-grouped summaries always visible, full list collapsed.
- **Hover on cards** — subtle shadow deepening. Not dramatic.
- **Links open in new tabs** — every artifact link has `target="_blank"`.
- **Category tags** are colored pills (Shipped=blue, Impact=green, Community=pink, Planning=amber, Infra=purple). Muted — these are labels, not alerts.
- **No charts, sparklines, or animations beyond entrance.** Text-forward.

Reading flow: header → TLDR bullets (10 seconds) → scan card titles → read highlights of interest → workplace activity themes → optionally expand raw artifact lists.

---

## Flavor Seeds

**Long-form Journalism** — A well-designed feature article in The Atlantic or Aeon: generous serif headings, comfortable body text, themed sections that each tell a story. White background with warm undertones, occasional color accents. The content breathes.

**Annual Report** — A nonprofit's annual impact report: clean, dignified, organized around themes rather than chronology. Each section tells a story about a body of work. Statistics are present but subordinate to narrative. The design says "this work mattered."

**Research Lab Notebook** — A well-kept lab journal, digitized: neat section headings, themed entries, cross-references between related items. Monospace accents for identifiers, a systematic color scheme for entry types. The satisfying organization of real intellectual work catalogued properly.

**Architecture Portfolio** — A portfolio website: one project per section, each with a concise description and key highlights. Clean grid, restrained palette. The work speaks for itself. The layout communicates professionalism and attention to craft.

**Curated Exhibition Catalog** — A museum catalog for a themed exhibition: each body of work gets thematic grouping with a curator's narrative. The design is spare and respectful, with typography doing the heavy lifting.

---

## CDN Dependencies

None required. Purely structural and typographic. No charts, no D3, no external JS.

---

## Recommended Components

| Component | How to Use |
|-----------|-----------|
| **TLDR Block** | Accent-bordered box with bullet points. One bullet per major project — bolded name + impact sentence. |
| **Stats Ribbon** | Horizontal inline stat counters: "51 diffs · 10 reviewed · 1 task · 5 posts · 13 docs · 8 thanks". Small, centered. |
| **Project Card** | Always-visible card with: serif title + count badge, What/Why/How summary block, 3 highlight cards, collapsed artifact list. |
| **What/Why/How Block** | Compact 3-line block inside each project card. Subtle styling (muted background or left-border accent). Each line labeled **What**/**Why**/**How** in bold. |
| **Highlight Card** | Bold title + 2-3 sentence narrative bundle. Category tag pill. References artifact IDs parenthetically. Exactly 3 per project. |
| **Category Tag** | Small colored pill on each highlight card: Shipped (blue), Impact (green), Community (pink), Planning (amber), Infra (purple). |
| **Collapsed Artifact List** | `<details>/<summary>` at bottom of each project card: "Artifacts (N diffs, N tasks, ...)" → raw diff/task list with IDs and links. |
| **Workplace Activity Section** | Top Themes table (theme, posts, comments, groups), Notable Posts (3-5 with summaries), Active Discussions narrative, collapsed full lists. |
| **Reviewed Section** | Thematic summaries by domain always visible + collapsed full list. Secondary. |
| **Coverage Table** | Small footer table. Columns: Source, Tool, Count, Coverage. Minimal styling. |

---

## Anti-Patterns

| Don't | Why |
|-------|-----|
| List individual diffs as the primary content | The report should tell a STORY, not be a changelog. Synthesize diffs into themed highlights. |
| Use collapsible/accordion for workstream sections | Workstreams should be immediately visible. Collapsed sections hide the work and require clicks to understand scope. |
| Use a gradient hero banner or dark header | Editorial report, not a slide deck. The content IS the hero. |
| Use charts or sparklines for artifact counts | Numbers are too small for charts. "23 diffs" as text is more honest than a bar chart. |
| Color-code metrics (red/green) | No "good" or "bad" in a work recap. Avoid value judgments on artifact counts. |
| Use a dashboard grid layout | Reading document, not a monitoring screen. Single-column editorial. |
| Make the coverage table prominent | Methodology metadata, not content. Small, at the bottom. |
| Use heavy card borders or shadows | Editorial tone = subtle dividers and whitespace, not Material Design elevation. |
| Put Diffs Reviewed in the same visual tier as workstreams | Reviews are secondary. Compact counter + expandable list. |
| Skip the TLDR | The bullet-point summary is the most important element. If someone reads 5 bullets and leaves, they got the full picture. |

---

## Reference: Digest Input Format

The debrief report is generated from a `digest.md` file with this structure:

```markdown
# Work Digest: Alex Ahn | 2026-02-09 to 2026-02-16

## Meta
- Subject: Alex Ahn (alexahn)
- Period: 2026-02-09 to 2026-02-16
- Digest Version: 3.0

## Summary
2-3 sentence overview.

## Projects

### InfraCloud CLI

- **What**: Shipped 8 new platform commands enabling comprehensive work artifact tracking from the CLI.
- **Why**: Fills critical data gaps in debrief and recap workflows, enabling 12-source coverage.
- **How**: Built on InternPowerSearch and Google Drive APIs with consistent owner/date filtering patterns.

#### Highlights

1. **Shipped Bifrost platform commands** — Built 6 commands for iRev/capacity management with project CRUD and goal tracking (D12345, D12346, D12347).

2. **Added review tracking** — Single `--actioned-on` flag replaces 5 separate queries, capturing all review actions in one call (D23456).

3. **Expanded data sources** — Added thanks, SEV comments, workplace notes, and Google Slides with owner and date filtering (D34567, D34568).

<details>
<summary>Artifacts (8 diffs, 2 tasks)</summary>

- **D12345** [Closed] Add bifrost.project list (2026-02-15) — url
- **D12346** [Closed] Add bifrost.goal list (2026-02-14) — url
- **T67890** [CLOSED] Track bifrost platform support (2026-02-13) — url

</details>

### Debrief Plugin
...

## Workplace Activity (5 posts, 30 comments)

### Top Themes
| Theme | Posts | Comments | Key Groups |
|-------|-------|----------|------------|
| AI Tooling & Claude Code | 3 | 18 | Claude Code Community, HOTD |
| GenAI MVP | 1 | 8 | GenAI MVP E2E Working Group |
| Team & Org | 1 | 4 | Instagram Business Engineering |

### Notable Posts
- **"/Deep-Engineering: The Paradigm Shift"** (Claude Code Community) — Proposed persistent file-based planning for complex multi-diff projects. url
- **"Visualize Anything using Claude"** (HOTD) — Launched the /visualize skill with 8 output archetypes. url

### Active Discussions
Actively participated in AI tooling discussions across Claude Code Community and HOTD, sharing technical insights on plugin architecture, skill design, and data analytics workflows.

<details>
<summary>All posts (5)</summary>

- **"Title"** (Group, 2026-02-15) — url

</details>

<details>
<summary>All comments (30)</summary>

- On "Post title" (2026-02-14) — url

</details>

## Diffs Reviewed (12)

**Claude Templates**: Reviewed 5 diffs for jlauer and cmoffitt, focusing on UI redesign and file management.
**GenAI MVP**: Reviewed 3 diffs for jackworden on recipe architecture changes.

<details>
<summary>All reviewed diffs (12)</summary>

- **D34567** [Closed] Title (2026-02-15) — Reviewed for author. url

</details>

## Coverage
| Source | Tool | Results Found | Coverage Level |
...

<!-- DIGEST_COMPLETE -->
```

**Mapping digest → report:**
- `## Summary` → TLDR bullet points (synthesize into one bullet per project, not raw summary text)
- `## Projects` → Project cards (each with What/Why/How block, 3 highlight cards, collapsed artifacts)
- `## Workplace Activity` → Top Themes table, Notable Posts, Active Discussions narrative, collapsed full lists
- `## Diffs Reviewed` → Thematic summaries + collapsed full list
- `## Coverage` → Footer table

**Key principle:** The digest already contains synthesized highlights and What/Why/How summaries. The report renders them visually — it does NOT need to re-synthesize. Map the digest structure directly to the visual components.

---

## Reference: TLDR Block

```html
<div class="tldr">
    <div class="tldr-label">TLDR</div>
    <ul>
        <li><strong>InfraCloud CLI:</strong> Added 8 new platform commands with owner/date filtering — now covers 12 data sources</li>
        <li><strong>Visualize Skill:</strong> Secured CDN dependencies, shipped hamburger menu — 1,700+ installations, 5 thanks</li>
        <li><strong>Debrief Plugin:</strong> Built multi-agent pipeline, parallelized sourcing — reduced time from 20 min to 7 min</li>
        <li><strong>125 total artifacts</strong> across 51 diffs, 10 reviews, 5 posts, 13 docs, 8 thanks</li>
    </ul>
</div>

<style>
.tldr {
    margin: 2rem 0 2.5rem;
    padding: 1.5rem 1.75rem;
    background: var(--accent-light);
    border-left: 3px solid var(--accent);
    border-radius: 0 8px 8px 0;
}

.tldr-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    margin-bottom: 0.75rem;
}

.tldr ul { list-style: none; padding: 0; }

.tldr li {
    position: relative;
    padding-left: 1.1rem;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
    line-height: 1.55;
}

.tldr li::before {
    content: '—';
    position: absolute;
    left: 0;
    color: var(--accent);
    font-weight: 600;
}

.tldr li strong { font-weight: 600; }
</style>
```

---

## Reference: Project Card

```html
<div class="project-card">
    <div class="project-header">
        <div class="project-title">InfraCloud CLI Platform Expansion</div>
        <span class="project-count">32 artifacts</span>
    </div>
    <div class="project-wwh">
        <div class="wwh-line"><span class="wwh-label">What</span> Shipped 8 new platform commands enabling comprehensive work artifact tracking from the CLI.</div>
        <div class="wwh-line"><span class="wwh-label">Why</span> Fills critical data gaps in debrief and recap workflows, enabling 12-source coverage.</div>
        <div class="wwh-line"><span class="wwh-label">How</span> Built on InternPowerSearch and Google Drive APIs with consistent owner/date filtering patterns.</div>
    </div>
    <div class="highlight-cards">
        <div class="highlight-card">
            <div class="highlight-title"><span class="highlight-tag shipped">Shipped</span> <strong>Bifrost platform commands</strong></div>
            <p class="highlight-body">Built 6 commands for iRev/capacity management with project CRUD and goal tracking. Follows the same owner/date filtering pattern as existing platforms. <span class="highlight-refs">(D12345, D12346, D12347)</span></p>
        </div>
        <div class="highlight-card">
            <div class="highlight-title"><span class="highlight-tag shipped">Shipped</span> <strong>Review action tracking</strong></div>
            <p class="highlight-body">Single <code>--actioned-on</code> flag replaces 5 separate queries for finding diffs a user reviewed. Captures all review actions in one call. <span class="highlight-refs">(D23456)</span></p>
        </div>
        <div class="highlight-card">
            <div class="highlight-title"><span class="highlight-tag impact">Impact</span> <strong>Expanded data sources</strong></div>
            <p class="highlight-body">Added thanks, SEV comments, workplace notes, and Google Slides with owner and date filtering. Unblocks complete debrief coverage. <span class="highlight-refs">(D34567, D34568)</span></p>
        </div>
    </div>
    <details class="artifact-details">
        <summary>Artifacts (8 diffs, 2 tasks)</summary>
        <ul class="artifact-list">
            <li><span class="artifact-id">D93386097</span> <a href="url" target="_blank">Add summary column</a></li>
            <li><span class="artifact-id">D93345537</span> <a href="url" target="_blank">Add sevmanager.comment list</a></li>
        </ul>
    </details>
</div>

<style>
.project-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 2rem;
    margin-bottom: 1.5rem;
}

.project-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
}

.project-title {
    font-family: 'Libre Baskerville', serif;
    font-size: 1.25rem;
    font-weight: 700;
}

.project-count {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-tertiary);
    background: var(--bg-tertiary);
    padding: 0.2rem 0.65rem;
    border-radius: 12px;
}

/* What / Why / How block */
.project-wwh {
    background: var(--bg-secondary);
    border-left: 3px solid var(--accent);
    border-radius: 0 6px 6px 0;
    padding: 0.75rem 1rem;
    margin-bottom: 1.25rem;
}

.wwh-line {
    font-size: 0.88rem;
    line-height: 1.5;
    color: var(--text-secondary);
    padding: 0.15rem 0;
}

.wwh-label {
    font-weight: 700;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--accent);
    margin-right: 0.4rem;
    display: inline-block;
    min-width: 2.5rem;
}

/* Highlight cards */
.highlight-cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.highlight-card {
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-light);
}

.highlight-card:last-child { border-bottom: none; }

.highlight-title {
    font-size: 0.92rem;
    margin-bottom: 0.35rem;
}

.highlight-body {
    font-size: 0.88rem;
    color: var(--text-secondary);
    line-height: 1.55;
    margin: 0;
}

.highlight-refs {
    font-size: 0.8rem;
    color: var(--text-tertiary);
}
</style>
```

---

## Reference: Category Tags

```html
<span class="highlight-tag shipped">Shipped</span>
<span class="highlight-tag impact">Impact</span>
<span class="highlight-tag community">Community</span>
<span class="highlight-tag planning">Planning</span>
<span class="highlight-tag infra">Infra</span>

<style>
.highlight-tag {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-right: 0.3rem;
    vertical-align: middle;
}

/* Muted, distinguishable colors */
.highlight-tag.shipped   { background: #dbeafe; color: #1e40af; }
.highlight-tag.impact    { background: #d1fae5; color: #065f46; }
.highlight-tag.community { background: #fce7f3; color: #9d174d; }
.highlight-tag.planning  { background: #fef3c7; color: #92400e; }
.highlight-tag.infra     { background: #ede9fe; color: #5b21b6; }

/* Dark mode */
.dark-mode .highlight-tag.shipped   { background: rgba(59,130,246,0.15); color: #93c5fd; }
.dark-mode .highlight-tag.impact    { background: rgba(16,185,129,0.15); color: #6ee7b7; }
.dark-mode .highlight-tag.community { background: rgba(236,72,153,0.15); color: #f9a8d4; }
.dark-mode .highlight-tag.planning  { background: rgba(245,158,11,0.15); color: #fcd34d; }
.dark-mode .highlight-tag.infra     { background: rgba(139,92,246,0.15); color: #c4b5fd; }
</style>
```

**Tag usage guidelines:**
- **Shipped** — code landed, feature completed, diff closed
- **Impact** — measurable improvement (performance, elimination of bottleneck, error reduction)
- **Community** — thanks received, knowledge sharing, workplace engagement
- **Planning** — design docs, roadmaps, proposals, experiment setup
- **Infra** — refactoring, naming consistency, CI improvements, tooling cleanup

---

## Reference: Workplace Activity Section

```html
<div class="workplace-activity">
    <div class="section-header">
        <h2>Workplace Activity</h2>
        <span class="section-count">22 posts · 164 comments</span>
    </div>
    <p class="activity-narrative">Actively participated in AI tooling discussions across Claude Code Community and HOTD groups, sharing technical insights on plugin architecture, skill design, and data analytics workflows.</p>

    <table class="themes-table">
        <thead>
            <tr><th>Theme</th><th>Posts</th><th>Comments</th><th>Key Groups</th></tr>
        </thead>
        <tbody>
            <tr><td>AI Tooling & Claude Code</td><td>8</td><td>45</td><td>Claude Code Community, HOTD</td></tr>
            <tr><td>GenAI MVP</td><td>4</td><td>12</td><td>GenAI MVP E2E Working Group</td></tr>
            <tr><td>Team & Org</td><td>3</td><td>8</td><td>Instagram Business Engineering</td></tr>
        </tbody>
    </table>

    <div class="notable-posts">
        <h3>Notable Posts</h3>
        <div class="notable-post">
            <div class="notable-post-title"><a href="url" target="_blank">"Deep-Engineering: The Paradigm Shift"</a></div>
            <div class="notable-post-group">Claude Code Community</div>
            <div class="notable-post-summary">Proposed persistent file-based planning for complex multi-diff projects.</div>
        </div>
        <div class="notable-post">
            <div class="notable-post-title"><a href="url" target="_blank">"Visualize Anything using Claude"</a></div>
            <div class="notable-post-group">HOTD</div>
            <div class="notable-post-summary">Launched the /visualize skill with 8 output archetypes.</div>
        </div>
    </div>

    <details class="artifact-details">
        <summary>All posts (22)</summary>
        <ul class="artifact-list">
            <li><span class="post-group">Claude Code Community</span> <a href="url" target="_blank">"Post title"</a> <span class="post-date">2026-02-15</span></li>
        </ul>
    </details>
    <details class="artifact-details">
        <summary>All comments (164)</summary>
        <ul class="artifact-list">
            <li>On <a href="url" target="_blank">"Post title"</a> <span class="post-date">2026-02-14</span></li>
        </ul>
    </details>
</div>

<style>
.workplace-activity {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 2rem;
    margin-bottom: 1.5rem;
}

.workplace-activity .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.workplace-activity h2 {
    font-family: 'Libre Baskerville', serif;
    font-size: 1.25rem;
    margin: 0;
}

.section-count {
    font-size: 0.78rem;
    color: var(--text-tertiary);
    background: var(--bg-tertiary);
    padding: 0.2rem 0.65rem;
    border-radius: 12px;
}

.activity-narrative {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.55;
    margin-bottom: 1.25rem;
}

.themes-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    margin-bottom: 1.25rem;
}

.themes-table th {
    text-align: left;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-tertiary);
    padding: 0.5rem 0.75rem;
    border-bottom: 2px solid var(--border);
}

.themes-table td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--border-light);
    color: var(--text-secondary);
}

.themes-table td:first-child {
    font-weight: 600;
    color: var(--text-primary);
}

.themes-table td:nth-child(2),
.themes-table td:nth-child(3) {
    text-align: center;
    font-variant-numeric: tabular-nums;
}

.notable-posts { margin-bottom: 1rem; }
.notable-posts h3 {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-tertiary);
    margin-bottom: 0.5rem;
}

.notable-post {
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--border-light);
}

.notable-post:last-child { border-bottom: none; }

.notable-post-title a {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
    text-decoration: none;
}
.notable-post-title a:hover { color: var(--accent); }

.notable-post-group {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: 0.1rem;
}

.notable-post-summary {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: 0.2rem;
    line-height: 1.5;
}

.post-group {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-right: 0.3rem;
}

.post-date {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-left: 0.3rem;
}
</style>
```

---

## Reference: Collapsed Artifact List

```html
<details class="artifact-details">
    <summary>View all 32 artifacts</summary>
    <ul class="artifact-list">
        <li><span class="artifact-id">D93386097</span> <a href="url" target="_blank">Add summary column</a></li>
        <li><span class="artifact-id">D93345537</span> <a href="url" target="_blank">Add sevmanager.comment list</a></li>
    </ul>
</details>

<style>
.artifact-details { margin-top: 1rem; }

.artifact-details summary {
    cursor: pointer;
    color: var(--text-tertiary);
    font-size: 0.8rem;
    font-weight: 500;
    list-style: none;
    user-select: none;
}

.artifact-details summary::-webkit-details-marker { display: none; }
.artifact-details summary::before { content: '▸ '; font-size: 0.7rem; }
.artifact-details[open] summary::before { content: '▾ '; }
.artifact-details summary:hover { color: var(--accent); }

.artifact-list { list-style: none; padding: 0.5rem 0 0; }

.artifact-list li {
    padding: 0.3rem 0;
    font-size: 0.82rem;
    color: var(--text-secondary);
}

.artifact-id {
    font-weight: 600;
    font-size: 0.78rem;
    color: var(--text-tertiary);
}
</style>
```

---

## Variations

- **Self-debrief** (default): Narrative tone focused on impact and achievements
- **Manager view / roll-up**: Multiple people's digests combined, comparison across team members
- **PSC packet insert**: More formal, achievement-focused, metrics emphasized
- **Weekly update post**: Shorter, conversational, designed for Workplace sharing
- **Project-scoped debrief**: Single project across a longer period, deeper narrative per workstream

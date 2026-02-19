# Presentation Deck

A slide-based format for communicating ideas with visual impact. One concept per slide, minimal text, maximum clarity.

---

## When to Use

Detect this archetype when:
- User mentions "slides", "presentation", "deck", "talk", or "pitch"
- Content needs to be presented to an audience (sync, review, showcase)
- Information is sequential/narrative and benefits from pacing
- User asks to "present" or "share" findings/results

---

## Design Principles

1. **One idea per slide.** If a slide has two ideas, make two slides.
2. **Exactly fullscreen — no scrolling.** Each slide must be exactly `100vw × 100vh`. Content must fit within the viewport. No horizontal or vertical scrolling. Use `overflow: hidden` on both body and each slide.
3. **Large type, minimal text.** Headlines 2.5rem+. Body text 1.25rem+. Max 6 lines of text per slide.
4. **Visual dominance.** Each slide should have a clear visual anchor — a chart, image, diagram, or large number. Text-only slides are the exception, not the rule.
5. **Button + keyboard navigation only.** Left/Right arrow buttons visible on screen. Left/Right arrow keys on keyboard. No scroll-based navigation. One slide visible at a time.
6. **Progressive revelation.** Build ideas across slides. Slide 3 should build on Slide 2. Don't dump everything at once.
7. **Strong endings.** Last slide should be a clear ask, summary, or call to action — not "Questions?"
8. **Download as PDF.** Include a button that triggers `window.print()` with `@media print` styles that render each slide as a separate page (`page-break-after: always`).

---

## Layout Architecture

**Page structure:** Exactly one slide visible at a time. No scrolling. Navigation via buttons and keyboard only.

```
[Slide 1: Title]         → Full-bleed, bold headline, subtitle, date
[Slide 2: Context]       → The problem or opportunity
[Slides 3-N: Content]    → One idea each, with supporting visual
[Slide N+1: Summary]     → Key takeaways (3 bullets max)
[Slide N+2: Call to Action] → What you want from the audience
```

**Each slide:** Exactly `100vw × 100vh`, `overflow: hidden`, centered content with `padding: 8vh 10vw`. Only the current slide is visible (`display: none` on others, or `transform: translateX` off-screen).

**Navigation controls:**
- **Arrow buttons** — Left (`←`) and right (`→`) buttons fixed on screen edges, always visible
- **Keyboard** — Left/Right arrow keys navigate between slides
- **Slide counter** — Shows "3 / 7" in bottom-right corner
- **Progress bar** — Thin bar at top showing position through the deck
- **Download PDF button** — Fixed button that triggers `window.print()` with print styles rendering each slide as a full page

**CRITICAL: No scrolling.** Set `html, body { overflow: hidden; height: 100vh; }`. Slides transition via JS toggling visibility or CSS transforms — never via scroll.

---

## Typography

**Default recommendation:** Use **Geist** (Google Fonts, SIL Open Font License) for both headings and body. It's clean, highly readable at all sizes, and designed for UI/presentations. Use heavier weights (700-800) for headlines to create contrast.

Alternative pairings if Geist doesn't fit the tone:
- **DM Sans + DM Serif Display** — Clean modern body with editorial headlines
- **Plus Jakarta Sans** — Geometric but softer, excellent readability
- **Manrope** — Wide open letterforms, very readable at distance

**Avoid for slides:** Syne, Space Mono, JetBrains Mono, or any condensed/narrow fonts as primary body text — they sacrifice readability at presentation scale.

---

## Design Flavor Spectrum

| Flavor | Characteristics |
|--------|----------------|
| **Editorial/Magazine** | Dramatic type sizes, asymmetric layouts, full-bleed backgrounds, high contrast |
| **Luxury/Refined** | Serif fonts, muted palette, generous whitespace, subtle gold/copper accents |
| **Bold/Geometric** | Oversized numbers, geometric shapes as decoration, strong grid, vibrant colors |
| **Dark/Cinematic** | Dark backgrounds, light text, full-screen imagery, dramatic lighting feel |
| **Minimal/Swiss** | Grid-locked layout, sans-serif, maximum whitespace, content speaks for itself |

Pick a flavor that matches the content's tone and audience. A product launch ≠ a quarterly review ≠ a technical deep-dive.

---

## Recommended Components

| Component | How to Use |
|-----------|-----------|
| **Metrics Card** | Hero stat on a single slide — one large number with context |
| **Chart (Chart.js)** | One chart per slide, sized to fill 60-70% of slide area |
| **Mermaid Diagram** | Architecture or flow diagrams, simplified for readability at a distance |
| **Callout** | Highlight a key insight or quote on its own slide |
| **Progress Bar** | Show project completion or adoption metrics |
| **Tag/Badge** | Status indicators, category labels |

**Components to AVOID in decks:**
- Sortable data tables (too dense for slides)
- Collapsible sections (defeats the point of pacing)
- Table of Contents (navigation replaces this)
- Long code blocks (use 5-10 lines max, enlarged font)

---

## Anti-Patterns

| Don't | Why |
|-------|-----|
| Wall of text | If you need paragraphs, it's a document, not a deck |
| Data tables with 5+ columns | Too dense to read from a distance. Use a chart. |
| Tiny fonts (< 1rem) | Unreadable in presentation context |
| No visual hierarchy | Every slide needs a clear focal point |
| "Agenda" slide with 15 items | Keep scope tight — 3-5 agenda items max |
| Decoration without meaning | Every visual element should support the message |

---

## Reference: Slide Shell

```html
<style>
/* CRITICAL: No scrolling anywhere */
html, body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
}

.slide {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: none; /* only active slide is visible */
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 8vh 10vw;
    overflow: hidden; /* content must fit */
}

.slide.active {
    display: flex;
}

.slide-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 700;
    text-align: center;
    max-width: 80%;
    line-height: 1.15;
}

.slide-body {
    font-size: clamp(1rem, 2vw, 1.5rem);
    text-align: center;
    max-width: 70%;
    margin-top: 1.5rem;
    color: var(--text-secondary);
    line-height: 1.6;
}

/* Navigation arrows — always visible */
.nav-btn {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1000;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: var(--text-primary);
    width: 48px;
    height: 48px;
    border-radius: 50%;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}
.nav-btn:hover {
    background: rgba(255,255,255,0.2);
    transform: translateY(-50%) scale(1.1);
}
.nav-btn:disabled {
    opacity: 0.2;
    cursor: default;
}
.nav-prev { left: 1.5rem; }
.nav-next { right: 1.5rem; }

/* Slide counter */
.slide-counter {
    position: fixed;
    bottom: 2rem;
    right: 3rem;
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
    z-index: 1000;
}

/* Progress bar */
.slide-progress {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: var(--primary);
    transition: width 0.3s ease;
    z-index: 1000;
}

/* Download PDF button */
.download-btn {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    z-index: 1000;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: var(--text-primary);
    padding: 0.4rem 1rem;
    border-radius: 8px;
    font-size: 0.8rem;
    cursor: pointer;
}

/* Print styles: each slide = one page */
@media print {
    html, body { overflow: visible; height: auto; }
    .nav-btn, .nav-next, .nav-prev, .slide-counter,
    .slide-progress, .download-btn { display: none !important; }
    .slide {
        position: relative;
        display: flex !important;
        width: 100vw;
        height: 100vh;
        page-break-after: always;
        break-after: page;
    }
    .slide:last-child { page-break-after: avoid; }
}
</style>

<!-- Navigation buttons -->
<button class="nav-btn nav-prev" onclick="goSlide(-1)">&#8592;</button>
<button class="nav-btn nav-next" onclick="goSlide(1)">&#8594;</button>
<div class="slide-counter"><span id="current">1</span> / <span id="total">7</span></div>
<div class="slide-progress" id="progress"></div>
<button class="download-btn" onclick="window.print()">&#8615; Download PDF</button>

<script>
const slides = document.querySelectorAll('.slide');
let current = 0;

function goSlide(dir) {
    const next = current + dir;
    if (next < 0 || next >= slides.length) return;
    slides[current].classList.remove('active');
    current = next;
    slides[current].classList.add('active');
    updateUI();
}

function updateUI() {
    document.getElementById('current').textContent = current + 1;
    document.getElementById('total').textContent = slides.length;
    document.getElementById('progress').style.width =
        ((current + 1) / slides.length * 100) + '%';
    document.querySelector('.nav-prev').disabled = current === 0;
    document.querySelector('.nav-next').disabled = current === slides.length - 1;
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goSlide(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goSlide(-1); }
});

// Initialize
slides[0].classList.add('active');
updateUI();
</script>
```

---

## Variations

- **Lightning talk** (5 slides max, ultra-bold, high energy)
- **Project review** (metrics-forward, progress bars, before/after)
- **Technical deep-dive** (code snippets allowed, more text tolerance, diagram-heavy)
- **Pitch deck** (problem → solution → traction → ask, investor-style pacing)

# FAQ / Reference

A searchable, categorized knowledge base format for frequently asked questions, runbooks, or reference guides. Scannable, searchable, designed for repeated access.

---

## When to Use

Detect this archetype when:
- User mentions "FAQ", "reference", "guide", "runbook", "how-to", or "knowledge base"
- Content is question-answer pairs or step-by-step instructions organized by topic
- User wants to create documentation for onboarding, troubleshooting, or self-service
- Information is meant to be referenced repeatedly, not read linearly
- Content serves newcomers who need answers to common questions fast
- There is a collection of discrete knowledge items that benefit from categorization

---

## Communication Goal

An FAQ communicates structured answers optimized for retrieval rather than reading. The reader arrives with a specific question and should find the answer within seconds through search or category browsing. Trust comes from consistent formatting, visible maintenance dates, and answers that respect the reader's time by being concise and linking out for depth rather than expanding inline.

---

## Layout DNA

The page opens with a prominent search or filter input that signals "start here" to every visitor. Below the search, content organizes into categories, either as a sidebar navigation on wide screens or as stacked sections on narrow screens. Each category contains a heading and a stack of collapsible question-answer pairs where the question is always visible and the answer expands on click. Answers are compact (under 150 words) with code examples, numbered steps, or short bullet lists as their primary format. A "Contact / Escalation" section at the bottom provides a safety net for questions the FAQ does not cover. Metadata ("Last updated", category labels, difficulty tags) appears small and secondary but present, establishing that the content is maintained.

---

## Interaction DNA

Search filtering is the primary interaction: as the user types, non-matching questions fade or hide, and matching categories remain visible. This client-side filtering provides instant feedback without page reloads. Collapsible question-answer pairs use the accordion pattern, where clicking a question reveals its answer and optionally collapses others. The expand/collapse indicator (plus/minus or chevron) provides clear affordance. Category navigation via sidebar links or tabs lets users jump to a topic area without scrolling. The overall interaction model is "hunt and peck" rather than linear reading, so every element supports random access.

---

## Flavor Seeds

**Library Card Catalog** — Rows of wooden drawers, each labeled with a subject range, each containing alphabetized cards with precise references. The drawer pulls open with a satisfying click, revealing exactly what you need filed in its proper place. Warm wood tones, typewritten labels, the quiet authority of a system that has organized knowledge for centuries.

**Medical Symptom Checker** — An emergency room triage board: symptoms listed down the left, severity across the top, recommended actions at each intersection. Clean, clinical, designed to be read under stress by people who need answers immediately. High contrast, bold category headers, every answer actionable. No ambiguity allowed.

**Jukebox Selector** — Pages of song titles organized by genre, each with a letter-number code. Flip through the categories, find your track, punch in the code. Neon-lit glass, chrome bezels, the satisfying mechanical click of selection. The interface between wanting something and getting it, reduced to its simplest form.

**Recipe Index** — A well-worn cookbook's index: categories (Appetizers, Mains, Desserts), each entry with page number and prep time. Dog-eared pages, pencil annotations in the margins, checkmarks next to favorites. The accumulated wisdom of someone who has answered "what should I cook?" a thousand times.

**Switchboard Operator's Directory** — A telephone exchange directory: names, departments, extension numbers, organized for speed. The operator's finger runs down the column, finds the match, plugs in the connection. Monospace type, tight leading, every entry following the exact same format because consistency is what makes speed possible.

---

## CDN Dependencies

None required. Search filtering is achievable with lightweight inline scripting. No external libraries needed.

---

## Anti-Patterns

- Don't omit search or filtering capability. Users arrive with a specific question and should never have to scroll through 50 items to find it.
- Don't use inconsistent answer formats across questions. Every Q&A should follow the same structural pattern so the reader's eye knows where to look.
- Don't write answers longer than 150 words inline. Link to detailed documentation for deep dives; the FAQ answer should be the short version.
- Don't present an unstructured flat list of questions without category grouping. Thirty ungrouped questions are unusable.
- Don't omit "last updated" dates or maintenance signals. Missing freshness indicators make readers wonder if they can trust the information.
- Don't use jargon without explanation. FAQ audiences often include newcomers who lack domain vocabulary.
- Don't skip the escalation path. Every FAQ needs a "still have questions?" section that tells the reader where to go when the FAQ falls short.

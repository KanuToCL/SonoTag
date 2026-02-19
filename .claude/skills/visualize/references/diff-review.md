# Diff Review

A card-based format for visualizing code changes to help human reviewers understand diffs quickly and comprehensively.

---

## When to Use

Detect this archetype when:
- User mentions "diff", "D12345678", "review", "changes", or "what changed"
- User says "visualize my changes" or "visualize this diff"
- Content is a Phabricator diff or uncommitted local changes
- User wants to explain code changes to reviewers
- Content includes file modifications, additions, or deletions with a commit message
- User asks to prepare a diff for review or explain what a diff does

---

## Communication Goal

This format translates raw code changes into a reviewer-friendly briefing. It answers three questions in rapid succession: what changed, why it changed, and what deserves scrutiny. The goal is to give a reviewer who has zero mental context of the change full comprehension in under 60 seconds.

---

## Layout DNA

The page is a single scrollable column built entirely from cards, never bullet lists or dense paragraphs. The top section is a header with the diff title, D-number (linked to Phabricator), author, date, and status badge, followed immediately by a compact stats bar showing files changed, lines added, lines removed, and risks found.

Below the stats bar, three bold "What Changed" cards sit in a horizontal row. These are the headline of the entire page and should be scannable in 5 seconds. Beneath them, a trio of "Why" cards (Motivation, Approach, Not Changing) provide reasoning with colored top-border accents. The lower half of the page contains compact file cards (one per file, showing path and purpose), a 2x2 interactive review checklist grid, and severity-tagged risk cards with left-border accents.

Every section uses cards. The full diff is on Phabricator; this visualization explains in plain English, it never duplicates code.

---

## Interaction DNA

The review checklist section features interactive checkboxes. Clicking a checkbox marks the item as reviewed, adding a strikethrough and fading the card. This lets reviewers track their progress through the review directly in the visualization.

Hovering on change cards produces a subtle lift effect with a top-border accent appearing, providing visual feedback without distraction. The header and footer both contain prominent links back to the full diff on Phabricator, ensuring the reviewer can always jump to the source of truth.

For larger diffs, file cards can be grouped into collapsible directory sections, allowing reviewers to expand only the areas they care about.

---

## Flavor Seeds

1. **The Airport Departure Board.** Imagine a split-flap display where each card flips to reveal a change. Dense, monospaced, information-rich, every cell earns its space. Status colors blink with urgency. Mechanical precision meets real-time updates.

2. **The Surgeon's Pre-Op Brief.** Clinical white, every risk highlighted in red with precise location markers. The change summary reads like an operative plan: here is what we will touch, here is what we will not touch, here is what could go wrong. Calm authority.

3. **The Jazz Album Liner Notes.** Rich typography, generous whitespace, the "What Changed" cards feel like track listings. Each card is a movement in a composition. The approach section reads like the artist's statement. Warm, editorial, narrative-driven.

4. **The NASA Mission Patch.** Dark background, each change card is a self-contained emblem with an icon, title, and description. The stats bar reads like telemetry. Risk cards glow amber or red like warning indicators. Engineering pride in presentation.

5. **The Bento Box.** Clean compartments, each section precisely bounded, nothing spills into the next. Japanese-inspired minimalism where negative space is a design choice. Monochrome with a single accent color for risk. Every element earns its place through restraint.

---

## Required Data Elements

Every diff review visualization MUST include these elements. Missing any of these is a failure:

- **Diff number** (e.g., D12345678) prominently displayed in the header, linked to Phabricator (`https://www.internalfb.com/diff/D12345678`)
- **Author** name or username
- **Status** badge (Needs Review, Accepted, Closed, etc.)
- **Stats bar** with files changed, lines added, lines removed
- **File list** with actual file paths (not generic names)
- **Phabricator link** in both header and footer — the reviewer must be able to jump to the real diff instantly

---

## Anti-Patterns

- Don't show full raw diff or code blocks, because that is what Phabricator does. Use plain English to explain changes.
- Don't use bullet lists instead of cards, because cards are more scannable and visually distinct.
- Don't write long Why sections, because max 2 sentences per card forces clarity and respects the reviewer's time.
- Don't flag everything as risky, because if everything is a risk, nothing is. Cap at 5 risk cards.
- Don't use generic risk labels like "Potential issue," because they are useless. Be specific: "Removes null check on user input at line 47."
- Don't omit the Phabricator link, because reviewers need a direct path to the canonical source.
- Don't repeat the diff summary verbatim, because the visualization should be a reviewer-focused interpretation, not a copy-paste of the commit message.

# Diff Stack Review

A chapter-based format for visualizing an entire Phabricator diff stack as a knowledge transfer document, showing the full engineering story from foundation to finish.

---

## When to Use

Detect this archetype when:
- User mentions "stack", "diff stack", "stack review", or references multiple related diffs
- User provides a diff number and asks to "visualize the stack" or "explain the stack"
- Content involves multiple related diffs that form a logical unit of work
- User wants to share a stack for knowledge transfer or onboarding
- User asks about cross-diff dependencies or how changes relate to each other
- Multiple D-numbers appear together in conversation

---

## Communication Goal

A diff stack tells a story: foundation, then feature, then polish. This format presents that narrative as a coherent document where someone new can understand the entire body of work in one sitting. The unique value is cross-diff insight, showing how individual diffs relate to each other in ways that isolated Phabricator pages cannot.

---

## Layout DNA

The page opens with a header synthesizing the overall goal of the stack, followed by three overview cards (Goal, Approach, Impact) and aggregate stats across all diffs. The centerpiece of the top section is a Stack Map: a vertical pipeline of connected cards showing every diff in dependency order, each card displaying its chapter number, D-number, title, status badge, and file count. This pipeline serves as both a table of contents and a navigation tool.

Below the Stack Map, each diff becomes a "chapter" using the same card-based layout as the single-diff archetype: What Changed cards, Why cards, file cards, review checklist, and risk cards. Chapters are separated by prominent dividers with chapter labels. A cross-diff context callout appears in each chapter where relevant, explicitly stating how that diff relates to others in the stack.

For small stacks (2-4 diffs), all chapters are expanded. For larger stacks (5+), chapters are collapsible with summaries always visible. The footer links to all individual diffs and provides an overall narrative summary.

---

## Interaction DNA

The Stack Map pipeline is clickable. Tapping any card in the pipeline smooth-scrolls to that chapter in the page. This makes the Stack Map function as persistent navigation even while reading deep into a chapter.

Each chapter's review checklist has interactive checkboxes, just like the single-diff archetype. Reviewers can track their progress per chapter. For collapsible chapters, clicking the summary expands the full chapter content.

Hovering on Stack Map cards highlights them with a border color change and shadow lift, providing clear affordance that they are interactive.

---

## Flavor Seeds

1. **The Graphic Novel.** Each chapter is an issue in a limited series. The Stack Map is the cover gallery. Bold chapter headers break the narrative into episodes. Cross-diff context cards read like "Previously in..." recap boxes. Visual storytelling through sequential art.

2. **The Geological Core Sample.** The stack is a cross-section through layers of sediment. The bottom of the stack is the oldest stratum, the top is the most recent deposit. Each layer has a distinct texture and composition. The pipeline visualization is literally a vertical column of strata, reading the history of the codebase from bottom to top.

3. **The Train Route Map.** Each diff is a station on a rail line. The Stack Map is the transit diagram with color-coded lines and station markers. Express stops (key diffs) are larger markers. Transfer points show where diffs depend on each other. Clean, diagrammatic, wayfinding-focused.

4. **The Cookbook Chapter.** The stack overview is the recipe introduction. Each chapter is a course in the meal. Ingredients (files) are listed, technique (approach) is explained, and plating (final result) is shown. Cross-diff cards read like "while that is simmering, prepare the next element."

5. **The Space Mission Timeline.** The Stack Map is a vertical launch sequence: ignition (D1), ascent (D2-D3), orbit insertion (D4), mission operations (D5). Each chapter is a mission phase with status telemetry. Cross-diff context cards are mission control callouts. Dark background, glowing status indicators.

---

## Required Data Elements

Every diff stack review MUST include these elements. Missing any of these is a failure:

- **Each diff's D-number** (e.g., D001, D002) prominently displayed in the Stack Map and chapter headers, each linked to Phabricator (`https://www.internalfb.com/diff/DXXXXXXXX`)
- **Stack-level summary** — overall Goal, Approach, and Impact (not just per-diff summaries)
- **Stack Map** — visual pipeline showing all diffs in dependency order with status badges
- **Dependency indicators** — each chapter must state what it builds on (e.g., "Builds on D001's data model")
- **Per-diff stats** — file count, lines changed for each diff
- **Aggregate stats** — total files, total lines, total diffs in the stack
- **Footer with all diff links** — a consolidated list linking to every diff in the stack

---

## Anti-Patterns

- Don't treat each diff in isolation, because the stack-level narrative (Goal/Approach/Impact) is the unique value this format provides over individual diff pages.
- Don't show raw code in chapters, because plain English only. Full diffs are on Phabricator.
- Don't skip the Stack Map, because the pipeline visualization is the table of contents and the primary navigation element.
- Don't make all chapters the same length, because some diffs are more important than others. Vary detail by significance.
- Don't forget cross-diff context, because "Builds on D1's API" is exactly what individual diff pages cannot show.
- Don't use inconsistent chapter structure, because every chapter should follow the same layout for predictability and reduced cognitive load.
- Don't include too many review items per chapter, because the reader is reviewing the stack, not each diff in isolation. Cap at 3-4 per chapter.

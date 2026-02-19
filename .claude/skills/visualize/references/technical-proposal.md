# Technical Proposal

A structured format for presenting technical decisions, architecture designs, and implementation plans. Problem-driven, alternatives-aware, recommendation-clear.

---

## When to Use

Detect this archetype when:
- User mentions "proposal", "RFC", "design doc", "architecture", or "technical plan"
- Content presents a problem and proposes solutions with trade-offs
- There are system diagrams, API designs, or phased implementation plans
- User asks to "propose", "recommend", or "design" a technical approach
- The audience needs to evaluate and approve a technical direction
- Content includes migration strategies, rollback plans, or phased rollouts

---

## Communication Goal

Technical proposals persuade through structured reasoning. They establish why something matters before presenting how to solve it, and they build credibility by honestly evaluating alternatives. The reader should finish understanding the problem, the recommended solution, why it beats the alternatives, what could go wrong, and what happens next. The format rewards intellectual honesty -- showing your work, naming your risks, and flagging open questions.

---

## Layout DNA

The page is a single scrollable document with a sticky sidebar table of contents for navigation. It opens with a status header showing the proposal state (Draft, In Review, Approved) as a colored badge, alongside the date and author. A TL;DR paragraph immediately follows -- three sentences maximum covering what and why. The body flows through discrete sections: problem statement, goals and non-goals, proposed solution with architecture diagrams, alternatives considered with a trade-off comparison matrix, detailed technical design with data models and API shapes, a phased implementation plan with milestones, risks and mitigations, and open questions. Diagrams (Mermaid flowcharts, sequence diagrams, component diagrams) appear inline and are sized to dominate their sections. Code blocks show concrete API examples rather than abstract descriptions. The visual density is medium -- dense enough for a working document but with clear breathing room between sections.

---

## Interaction DNA

Users navigate primarily by scrolling, assisted by a sidebar table of contents that highlights the current section. Clicking a TOC entry scrolls directly to that section. Tabs may be used to compare different approaches side-by-side within the alternatives section. Collapsible sections hide detailed implementation notes and alternative deep-dives that only some readers need. Code blocks have syntax highlighting. Mermaid diagrams render inline from their text definitions. Status badges in the header may link to the approval workflow. The document is designed for commenting -- reviewers annotate specific sections with questions and feedback.

---

## Flavor Seeds

- **The Architect's Blueprint.** A drafting-table aesthetic: faint grid backgrounds, precise blue lines, technical annotations in a drafting hand. The diagrams look like actual architectural blueprints -- white-on-blue or blue-on-white with dimension lines and callout markers. The trade-off matrix resembles an engineering specification sheet. The entire document feels like it was produced by someone who builds things for a living.

- **The War Room Whiteboard.** Imagine a photo of a conference room whiteboard after a three-hour design session -- boxes connected by arrows, crossed-out alternatives still visible, sticky notes with "RISK!" and "ASK: do we need this?" scrawled on them. The digital version preserves that energy: hand-drawn-style diagram connectors, yellow callout cards for open questions, red warning boxes for risks. It feels collaborative and in-progress, not polished and finished.

- **The Patent Filing.** Formal, numbered sections with cross-references ("see Section 3.2"). Diagrams are labeled "Fig. 1", "Fig. 2" with captions below. The typography is deliberate and institutional -- serif headings, tight line spacing, footnotes for prior art. The trade-off matrix looks like a patent claims comparison. The document communicates: "this has been thought through with legal precision."

- **The Expedition Map.** The proposal as a journey: the problem is the starting terrain ("here be dragons"), the proposed solution is the charted route, alternatives are paths not taken (shown faded), and the implementation plan is a trail map with camps (milestones) along the way. Risks are marked like hazard symbols on a topographic map. The visual metaphor makes the phased rollout feel like a planned expedition rather than a spreadsheet.

---

## CDN Dependencies

- Mermaid (for architecture diagrams, sequence diagrams, flowcharts): `<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js" crossorigin="anonymous" defer></script>`

---

## Anti-Patterns

- Do not jump straight to the solution because readers need to understand and care about the problem first
- Do not present only one option because it looks like alternatives were not considered and undermines credibility
- Do not hand-wave the implementation with phrases like "we will figure it out later" because vagueness kills confidence in the proposal
- Do not hide the risks because reviewers will find them anyway and naming them proactively builds trust
- Do not write prose descriptions of system interactions when a diagram would communicate them more clearly
- Do not make the document longer than 20 distinct sections because overly long proposals should be broken into linked sub-documents
- Do not use abstract descriptions when you can show concrete code snippets, API shapes, or data models instead

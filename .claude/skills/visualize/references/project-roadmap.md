# Project Roadmap

A hybrid timeline and card format for visualizing project progress, milestones, and phases with a prominent "You Are Here" position marker.

---

## When to Use

Detect this archetype when:
- User mentions "roadmap", "project plan", "milestones", "phases", or "timeline"
- User says "visualize project status" or "where are we on X"
- Content describes a multi-phase project with deliverables and deadlines
- User wants to communicate project progress to stakeholders or team
- User shares a GSD project, Google Doc plan, or describes phases in conversation
- Discussion involves tracking progress across multiple workstreams or sprints

---

## Communication Goal

The most important thing a roadmap communicates is current position. In 2 seconds, the reader should know exactly where the project stands. In 60 seconds, they should understand the full journey: what has been completed, what is in progress, what is coming, and what might block forward movement. The format is forward-looking by design, emphasizing what happens next over what already happened.

---

## Layout DNA

The page opens with a header showing project name, status badge (On Track / At Risk / Blocked), date range, and owner/team. Three overview cards follow: Goal (what the project delivers), Current Status (where things stand in plain language), and Next Milestone (the next key date with description).

The signature element is the horizontal timeline strip: a row of colored phase segments where completed phases are green, the current phase pulses with the primary color and a "You Are Here" arrow pointing down at it, upcoming phases are gray, and blocked phases are red. Phase segment widths reflect relative duration. Below the strip, a milestone row shows key dates as diamond markers connected by a horizontal line, each labeled with date, title, and hit/upcoming/missed status.

The lower half contains one card per phase, each with a status badge, date range, and deliverables checklist (checkmarks for done, empty circles for pending). A dependencies grid shows internal and external blockers in a 2-column layout, with blocked dependencies highlighted in red. A risks-and-open-questions section splits into severity-tagged risk cards on the left and checkbox-equipped open question cards on the right. The page closes with a "What's Next" action card divided into three columns: Immediate Actions, Upcoming Decisions, and Blockers to Resolve.

---

## Interaction DNA

The "You Are Here" marker on the timeline strip provides instant orientation. Deliverable checklists within phase cards are interactive: clicking toggles completion state, providing a living document feel. Open question cards have checkboxes that can be marked as resolved.

Phase cards for roadmaps with many phases (5+) can be collapsible, with status and dates always visible in the collapsed state. The timeline strip remains fixed or prominent so the reader always has positional context even while scrolling through phase details.

Risk cards use the same severity-tagged pattern as other archetypes (left-border accent with Warning/Info/Critical badges), maintaining visual consistency across visualization types.

---

## Flavor Seeds

1. **The Subway Map.** Each phase is a station on a transit line. The "You Are Here" marker is the pulsing dot showing your current position. Completed stations are filled, upcoming stations are outlined. Transfer points show where dependencies cross. Clean diagrammatic lines, bold station names, the satisfying clarity of wayfinding in a complex system.

2. **The Mountain Expedition.** The roadmap is an elevation profile of a climb. Base camp (project start) is on the left, the summit (final milestone) is on the right. Each phase is a camp at a different altitude. The "You Are Here" marker shows how far up you have climbed. Risks are weather warnings. The What's Next section is the next day's climbing plan. Contour lines, altitude markers, thin air.

3. **The Film Production Schedule.** Pre-production, production, post-production, release. Each phase has its own visual language. The milestone row is the slate board with scene numbers and dates. Deliverables are shots completed. The "You Are Here" marker is the clapperboard. Dependencies are crew availability and location bookings. Hollywood meets project management.

4. **The Periodic Table.** Each phase is an element in a custom periodic table layout. The element card shows phase number, name, status, and key metric. Colors indicate category (infrastructure, feature, testing, launch). Completed elements have a filled background; upcoming elements are outlined. The arrangement reveals relationships between phases.

5. **The Garden Almanac.** The roadmap is a seasonal planting calendar. Each phase is a growing season. Seeds (planned deliverables) are planted, sprouts (in-progress work) are tended, harvests (completed milestones) are collected. The "You Are Here" marker shows the current season. Risks are frost warnings and pest alerts. Organic, cyclical, patient.

---

## Required Data Elements

Every project roadmap MUST include these elements:

- **Project name** and **owner/team** in the header
- **Overall status badge** (On Track / At Risk / Blocked)
- **Timeline strip** with phase segments showing relative duration
- **"You Are Here" marker** on the current phase — the signature element
- **Phase cards** with: descriptive name, date range, status badge, deliverables checklist
- **Dates** on every phase — phases without dates are a wishlist, not a roadmap
- **Risks and blockers** with severity tags
- **"What's Next" section** — immediate actions, upcoming decisions, blockers to resolve

---

## Anti-Patterns

- Don't show more than 7 phases, because too many phases turns a roadmap into a task board. Group related work into meaningful units.
- Don't skip the "You Are Here" marker, because the timeline strip without a position marker loses its primary value as an orientation device.
- Don't list individual tasks, because roadmaps show deliverables, not tickets. Keep it at the right altitude.
- Don't use vague phase names like "Phase 3," because descriptive names like "GraphQL API Layer" communicate meaning instantly.
- Don't omit dates, because phases without dates are not a roadmap, they are a wishlist.
- Don't skip the "What's Next" section, because it is the most actionable part and answers the question stakeholders always ask first.
- Don't ignore risks and dependencies, because hidden dependencies are the top cause of project delays, and naming risks builds trust.

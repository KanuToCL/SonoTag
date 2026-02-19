# SEV Review

A one-page incident briefing that works during a live SEV and as a post-incident review document, with severity level driving the visual tone.

---

## When to Use

Detect this archetype when:
- User mentions "SEV", "incident", "outage", "postmortem", "S123456", or a SEV number
- User asks to "visualize the SEV" or "summarize the incident"
- Content describes a production incident with timeline, impact, and remediation
- User wants to create a SEV review presentation or share incident learnings
- User references DERP sections (Detection, Escalation, Remediation, Prevention)
- Discussion involves TTD (time to detect), TTM (time to mitigate), or follow-up tasks

---

## Communication Goal

Someone arriving mid-incident or reviewing post-incident should understand the full picture in under 60 seconds: what broke, how bad, when, why, and what is being done. The visualization communicates urgency through severity-driven color theming while maintaining a blameless, systemic perspective that focuses on process improvement over individual fault.

---

## Layout DNA

The page opens with a severity-colored header that immediately communicates gravity: deep red gradients for SEV 0/1, amber for SEV 2, blue for SEV 3. The header contains the SEV number (linked to SEV Manager), title, severity badge, status badge, owner, and date range.

Directly below the header sit three summary cards answering What Broke (red accent), Why It Took So Long (amber accent), and How It Was Fixed (green accent). These form a 5-second executive summary. An impact metrics bar follows with four cards: impact description, time to detect, time to mitigate, and affected users/services.

The visual timeline is the spine of the page: a vertical sequence of color-coded events running from incident start through detection, escalation, mitigation, and resolution, with timestamps and descriptions at each phase. Below it, a root cause card with contributing factors, four DERP section cards (Detection, Escalation, Remediation, Prevention) in a horizontal row, and finally an interactive follow-up task checklist with SLA badges (Critical 30d, Medium 90d) and owner assignments.

---

## Interaction DNA

Follow-up task cards have interactive checkboxes. Clicking marks a task as complete with strikethrough and fade, letting teams track remediation progress directly in the visualization. The SEV number in the header is a direct link to SEV Manager.

The DERP cards are designed for quick scanning. Each features a prominent initial letter (D, E, R, P) with the section content kept to 3-4 concise bullets. The timeline events can optionally expand to show additional detail on click, though the default view shows the essential narrative.

All relevant links (SEV Manager, related diffs, dashboards, Scuba queries, Workplace threads) are embedded throughout the document so readers can drill into any aspect without searching.

---

## Flavor Seeds

1. **The War Room Whiteboard.** Dark background, hand-drawn-feeling timeline, sticky notes for action items, red string connecting root causes to contributing factors. The urgency of a physical incident room captured digitally. Status updates feel like they are being written in real-time marker strokes.

2. **The Autopsy Report.** Clinical precision, white background, systematic examination. Each section is a finding with clear evidence. The root cause card reads like a pathologist's conclusion. Contributing factors are listed with the dispassionate thoroughness of a medical examiner. Professional, definitive, unemotional.

3. **The Black Box Flight Recorder.** The timeline is a flight data strip with precise timestamps on the left margin. Events are logged entries in a monospaced transcript. Impact metrics read like altitude and speed gauges. The overall feel is forensic reconstruction: here is exactly what happened, second by second.

4. **The Weather Radar.** Severity colors are storm intensity. The incident is a weather event moving across a map. The timeline shows the storm's path from formation to dissipation. Impact metrics read like weather statistics (peak wind speed, area affected). DERP sections are the post-storm analysis: how was it tracked, how were warnings issued, how was damage repaired, how will forecasting improve.

5. **The Archaeological Dig Report.** Layers of the incident are excavated from the surface (symptoms) down to the bedrock (root cause). Each layer reveals more about what happened. Contributing factors are artifacts found at different strata. The visual language is cross-sections, depth markers, and carefully labeled finds.

---

## Required Data Elements

Every SEV review visualization MUST include these elements. Missing any of these is a failure:

- **SEV number** (e.g., S496098 or SEV 496098) prominently in the header, linked to SEV Manager (`https://www.internalfb.com/sevmanager/view/496098`)
- **Severity level** badge (SEV 0, SEV 1, SEV 2, SEV 3) driving the color theme
- **TTD** (time to detect) and **TTM** (time to mitigate) as numeric metrics
- **Impact** — affected users/requests count and duration
- **Timeline** with timestamps for each phase (start, detect, escalate, mitigate, resolve)
- **Root cause** — one clear statement, not "various issues"
- **Contributing factors** — systemic issues that enabled the incident
- **DERP sections** — Detection, Escalation, Remediation, Prevention (3-4 bullets each)
- **Follow-up tasks** with priority (P0/P1/P2), SLA (7d/30d/90d), and owner
- **Related links** — Workplace thread, related diffs, dashboards, Scuba queries embedded throughout

---

## Anti-Patterns

- Don't name individuals as the cause, because blameless culture matters. Use "the deploy" or "the config change," not "engineer X."
- Don't skip the timeline, because incidents are temporal stories and the chronological spine is essential for understanding.
- Don't ignore TTD/TTM metrics, because these are the most actionable numbers for improving incident response.
- Don't list tasks without SLA badges, because every follow-up task needs a priority (Critical 30d, Medium 90d) and an assigned owner.
- Don't use the same severity color for all SEVs, because color communicates gravity. A SEV 1 must visually feel different from a SEV 3.
- Don't write paragraphs instead of bullets in DERP sections, because conciseness is critical. Max 3-4 bullets each.
- Don't skip contributing factors, because the root cause alone is insufficient. Contributing factors reveal systemic issues that enable recurrence.

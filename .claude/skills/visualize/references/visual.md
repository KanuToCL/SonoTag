# Visual

A visual-first format for creating embeddable diagrams, infographics, and visual explainers. Think Mermaid or Excalidraw, but richer -- with color-coded boxes, connectors, legends, and styled typography. Designed to be dropped into posts, docs, slides, or shared standalone.

---

## When to Use

Detect this archetype when:
- User mentions "infographic", "diagram", "visual", "chart", "one-pager", "poster", or "architecture diagram"
- User wants something embeddable -- to drop into a Workplace post, Google Doc, slide, or wiki
- Content describes a system, flow, hierarchy, or relationship between components
- Information can be distilled into a visual structure rather than prose
- User wants a "fancy Mermaid chart" or "better than Excalidraw" visualization
- Content is meant for broad audiences and easy sharing

---

## Communication Goal

Visuals communicate through spatial relationships rather than sentences. Nesting shows containment, adjacency shows association, arrows show flow, and color shows taxonomy. A well-built visual lets someone grasp a system's architecture, a process's steps, or a concept's structure in a single glance -- something that might take three paragraphs of prose to explain less effectively. The format is designed for embedding and screenshotting, not for interactive exploration.

---

## Layout DNA

The visual fits within a fixed width (600-800px) and does not scroll. It communicates through nested boxes, connectors, and spatial grouping rather than text. Outer container boxes hold inner element boxes, with floating labels on box edges identifying the type or category. Each category of element gets a distinct color -- border tint and light background fill working together to create visual taxonomy. Connectors (solid lines for containment, dashed for optional relationships) link related elements with small labels explaining the relationship. A legend at the bottom maps each color to its meaning. The visual has clean edges and no floating UI elements, making it suitable for direct screenshot or embedding as an image.

---

## Interaction DNA

Visuals are fundamentally static. There are no tabs, toggles, or interactive elements. The output should work identically as a live HTML page, a screenshot, or a printed image. No JavaScript interactions are needed or desired. The visual may include subtle CSS-only effects like hover highlights on boxes to reveal additional detail text, but these are progressive enhancements -- the visual must be fully comprehensible without any interaction. If the content requires interactivity, it belongs in a different archetype.

---

## Flavor Seeds

- **The Circuit Board.** Imagine a PCB layout viewed from above: components as labeled chips in distinct colors, copper traces as connectors running between them, a silkscreen legend identifying each component type. The background has a faint green-tinted grid. Pin labels show interfaces. The aesthetic says "engineered system" without requiring any engineering knowledge to read.

- **The Botanical Illustration.** A naturalist's field guide aesthetic: delicate line drawings of system components arranged like specimens on a page, thin labeled connectors like annotation lines in a dissection diagram, a cream or parchment background, and a taxonomic legend at the bottom organized like a species classification. Beautiful enough to frame, precise enough to implement from.

- **The Transit Map.** Inspired by the London Underground map: components as stations (colored dots with labels), relationships as colored transit lines connecting them, interchange stations where multiple lines meet showing integration points. The geography is schematic, not literal -- spatial position is optimized for readability, not physical accuracy. A route legend shows what each line color represents.

- **The Stained Glass Window.** Bold geometric shapes in saturated jewel tones, black leading (borders) between sections, each pane containing a concept rendered as an icon or symbol with a short label. The composition is symmetric and ornamental. Light seems to pass through the colored sections. The effect is striking from a distance and detailed up close.

- **The Mission Patch.** NASA mission patch aesthetics: a circular or shield-shaped composition with the system name in an arc across the top, key components arranged as symbols within the badge, and a border containing metadata. Color-coded sections divide the interior into functional zones. The visual is compact, iconic, and designed to be understood at badge-size or poster-size equally.

---

## CDN Dependencies

None required. Visuals are built with pure HTML and CSS. No external libraries needed.

---

## Anti-Patterns

- Do not write paragraphs inside boxes because box text should be limited to one or two lines -- this is a diagram, not a document
- Do not use more than five or six distinct colors because too many categories becomes visual noise rather than useful taxonomy
- Do not allow the visual to scroll because diagrams must fit on one screen and if it does not fit, simplify the content
- Do not add interactive JavaScript elements because the output must work identically as a screenshot or printed image
- Do not use inconsistent styling for boxes of the same type because visual consistency is what makes the taxonomy readable
- Do not omit the legend when using color coding because readers cannot decode your color choices without explicit labels
- Do not use this archetype for data-heavy content with charts and tables because those belong in the experiment report or standard report archetypes

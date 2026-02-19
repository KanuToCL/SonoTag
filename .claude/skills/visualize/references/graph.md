# Graph

A force-directed knowledge graph visualization for exploring interconnected entities, relationships, and clusters interactively.

---

## When to Use

Detect this archetype when:
- User mentions "knowledge graph", "graph", "network", "connections", "relationships", or "map"
- Content describes entities with relationships between them (skills, people, systems, concepts)
- The data is best understood through spatial clustering and connections rather than linear lists
- User wants to explore "what connects to what" interactively
- Content involves categories or taxonomies with cross-category links
- User asks to visualize dependencies, ecosystems, or organizational structures

---

## Communication Goal

Graphs reveal hidden structure. A list of entities and their relationships is hard to reason about in text form, but a spatial layout with color-coded clusters and visible connections makes patterns leap out: which nodes are hubs, which clusters are isolated, which categories bridge to others. The format is a tool for discovery, not just display.

---

## Layout DNA

The graph fills the entire viewport. A compact header bar at the top shows the title, node/category counts, and control buttons (Reset, Spread, Dark Mode). The remainder of the screen is the SVG canvas where the force-directed simulation runs.

Three fixed-position overlay panels sit on top of the canvas without obscuring the graph. A legend panel in the top-right corner lists all categories with colored dots, counts, and clickable filter toggles. An info panel in the bottom-left provides brief usage instructions. A tooltip panel appears near the cursor on hover, showing the hovered node's name, metadata, description, and category badge.

Node size encodes importance (typically connection count). Node color encodes category. Labels appear below nodes, truncated for long names. Links between nodes are semi-transparent lines that brighten when their connected node is hovered. The force simulation naturally clusters related nodes together through physics-based positioning.

---

## Interaction DNA

Dragging a node repositions it, and the force simulation adjusts surrounding nodes in response. Scrolling zooms in and out. Panning moves the viewport across the graph. These three interactions together provide full spatial exploration without any scrollbars.

Hovering a node triggers two effects: a tooltip appears showing detailed information, and the connected subgraph highlights while unconnected nodes and links fade to low opacity. This "spotlight" effect lets the user trace relationships from any starting point.

Clicking a legend item toggles that category's visibility. Dimmed categories fade their nodes and links to near-invisibility, allowing the user to focus on specific slices of the graph. The Reset button re-centers the view. The Spread button temporarily increases the repulsion force to untangle dense clusters.

---

## Flavor Seeds

1. **The Star Chart.** Dark background, each node is a star with brightness proportional to its connections. Category colors are nebula hues. Links are faint constellation lines. Zooming in reveals more detail, like increasing telescope magnification. Hovering a star illuminates its constellation while the rest of the sky dims.

2. **The Mycelium Network.** Organic, branching connections spread across a dark forest floor. Nodes are fruiting bodies of different species (categories). Links are underground hyphal threads that pulse faintly with data flow. Clusters represent symbiotic communities. The visualization breathes, shifts, and settles like a living system.

3. **The City Transit Map.** Nodes are stations, links are rail lines. Category colors are transit line colors (red line, blue line, green line). Hub nodes are major interchanges where multiple lines converge. The layout has the clean diagrammatic precision of a metro map, with geographic accuracy sacrificed for topological clarity.

4. **The Molecular Structure.** Each node is an atom rendered as a sphere with specular highlights. Links are chemical bonds with subtle depth effects. Category colors are element groups from the periodic table. The force simulation mimics molecular dynamics. Hovering reveals electron configuration (metadata). Scientific precision meets visual chemistry.

5. **The Social Network at a Party.** Nodes are people clustered in conversation groups. Category colors represent social circles (work, school, family). Links represent active conversations. Hub nodes are the social connectors moving between groups. The simulation captures the natural clustering and bridge-building of human social dynamics.

---

## CDN Dependencies

- D3.js v7: `<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js" crossorigin="anonymous" defer></script>`

---

## Anti-Patterns

- Don't put text inside small nodes, because it becomes unreadable. Use labels below nodes and tooltips for detail.
- Don't use more than 8-9 categories, because human color discrimination breaks down beyond that range. Group related categories.
- Don't make all nodes the same size, because size should encode meaning such as connection count or importance.
- Don't skip the legend, because category colors are meaningless without a reference key.
- Don't hard-code node positions, because the force simulation should determine layout. Only pin nodes that the user has manually dragged.
- Don't forget collision radius, because without it nodes will overlap and become unreadable.
- Don't add scrollbars, because the graph is a full-viewport experience with zoom and pan as the navigation model.

---
name: visualize
description: Visualize anything as a beautiful, distinctive HTML page and upload to Pixelcloud. Use for session summaries, code explainers, data reports, onboarding guides, work summaries, meeting prep, presentations, experiment reports, and more. Produces production-grade interfaces with exceptional design quality.
argument-hint: <what to visualize>
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, AskUserQuestion, ToolSearch
---

# Visualize Skill

**Tagline**: "Visualize anything. HTML is your canvas."

Transform content into a beautiful, distinctive, interactive HTML page and upload to Pixelcloud for sharing. Every visualization is unique — no generic "AI output" aesthetics.

## Invocation

```
/visualize <natural language instruction>
```

## Examples

```bash
/visualize summarize our conversation
/visualize explain how the auth system works
/visualize the query results as a dashboard
/visualize a quick-start guide for new devs
/visualize my work this week
/visualize a presentation on our Q4 results
/visualize an experiment report for the A/B test
/visualize compare Redis vs Memcached for our use case

# Custom output path
/visualize --output ~/projects/myapp/ explain the auth module
/visualize summarize this file, save it next to the source
```

---

## Output Rules (Non-Negotiable)

This skill produces **exactly one type of output**: a self-contained HTML file.

**DO:**
- Write HTML to `$WORKSPACE/index.html` using the `Write` tool
- Upload via Pixelcloud (MCP tool preferred, `px` CLI fallback)
- Read files with `Read`, `Glob`, `Grep` to gather content

**DO NOT** use any MCP tools to create artifacts. Specifically:
- **No Google Slides** (`google_slides`) — even for "presentation" requests, create an HTML slide deck with keyboard navigation
- **No Google Docs** (`google_docs`) — do not create documents, only read from them if gathering content
- **No Google Sheets** (`google_sheets`) — do not create spreadsheets
- **No Daiquery** (`create_daiquery_query`) — do not create queries or notebooks
- **No notebook tools** (`create_notebook`, `edit_notebook`) — do not create Bento notebooks

If the user asks for a "presentation", "slides", or "deck" — create an **HTML presentation** with fullscreen slides and keyboard navigation, NOT a Google Slides document. HTML is always the output format.

---

## Workflow

### Step 1: Parse Intent

Analyze the user's instruction from `$1`:

1. **Identify content source**:
   - Current conversation context
   - Files/code in the workspace
   - Data/query results mentioned
   - External resources to gather

2. **Detect output path preference** (set `$OUTPUT_DIR`):
   - **Explicit flag**: If instruction contains `--output <path>`, extract the path and strip the flag from the instruction. Resolve `~` to `$HOME`.
   - **Natural language**: If instruction says "save next to the source", "output in the same folder", "put it in my project directory", etc., resolve the primary source file/directory path and use its parent directory.
   - **Default**: Leave `$OUTPUT_DIR` empty (Step 7 will use `$HOME/visualize/$DATE/$SLUG` on OD or `/tmp/visualize/$DATE/$SLUG` on local machines).

3. **Detect custom template** (set `$CUSTOM_TEMPLATE`):
   - **Explicit flag**: If instruction contains `--template <path>`, extract the absolute file path and strip the flag from the instruction. This allows callers (e.g., plugins) to provide their own archetype reference file instead of using the built-in ones. The file should follow the same format as files in `references/` (communication goal, layout DNA, interaction DNA, flavor seeds, anti-patterns).
   - **Default**: Leave `$CUSTOM_TEMPLATE` empty (Step 4 will use built-in archetype references).

4. **Determine if clarification needed**:
   - If intent is crystal clear → proceed to archetype detection
   - If ambiguous → ask clarifying questions (Step 2)

### Step 2: Clarify (If Needed)

When the instruction is ambiguous, use AskUserQuestion to clarify:

**Content scope:**
- What content to include?
- Full conversation or specific parts?

**Format:**
- Presentation slides? Data report? Infographic? Or let me pick the best format?

**Audience:**
- Technical team? Executives? Broad org?

Offer recommendations based on the content type.

### Step 3: Detect Archetype

**If `$CUSTOM_TEMPLATE` is set, skip this step entirely.** The custom template IS the archetype — go directly to Step 4.

Match the content to the most appropriate visualization archetype. Use these signals:

| Archetype | Detection Signals |
|-----------|------------------|
| **Presentation Deck** | "slides", "presentation", "deck", "pitch", "talk"; content is sequential/narrative for an audience |
| **Experiment Report** | "experiment", "A/B test", "results", "analysis"; data with hypothesis/methodology |
| **Technical Proposal** | "proposal", "RFC", "design doc", "architecture"; problem + proposed solutions |
| **Visual** | "infographic", "diagram", "visual", "chart", "one-pager", "architecture diagram"; embeddable graphics, system diagrams, visual explainers |
| **Session Summary** | "summary", "recap", "worklog", "meeting notes"; timeline of events/decisions |
| **Dashboard** | "dashboard", "status", "metrics", "KPIs"; numeric health/monitoring data |
| **Comparison Matrix** | "compare", "comparison", "evaluation", "vs"; evaluating options against criteria |
| **FAQ / Reference** | "FAQ", "reference", "guide", "runbook", "how-to"; Q&A or step-by-step instructions |
| **Diff Review** | "diff", "D12345678", "review", "my changes", "what changed"; single Phabricator diff or local uncommitted changes |
| **Diff Stack Review** | "stack", "diff stack", "stack review", multiple related diffs; visualize an entire stack as a knowledge transfer document |
| **SEV Review** | "SEV", "incident", "outage", "postmortem", "S123456"; incident briefing with timeline, DERP, and follow-up tasks |
| **Project Roadmap** | "roadmap", "project plan", "milestones", "phases", "where are we"; project progress with timeline strip and phase cards |
| **Debrief Report** | "debrief", "work digest", "work recap", "weekly update", "PSC"; structured digest with workstreams, artifacts, and coverage data |
| **Graph** | "knowledge graph", "graph", "network", "connections", "map", "relationships"; entities with relationships, skill ecosystems, interconnected systems |
| **Freestyle** | None of the above match well; content is unique or mixed |

**If unsure between archetypes:** Pick the closest match and adapt. The archetype is an inspiration, not a constraint.

**If no archetype fits:** Skip to Step 5 and generate freely using only the shared design system principles.

### Step 4: Load Design References

Read the design reference files from the `references/` directory adjacent to this SKILL.md.

1. **Always read `references/_principles.md`** — Creative guardrails: anti-slop rules, the creative brief template, typography/color/motion/composition guidance. This is loaded every time.
2. **If `$CUSTOM_TEMPLATE` is set** — Read the custom template file at `$CUSTOM_TEMPLATE` instead of a built-in archetype. Skip Step 3's archetype detection — the custom template IS the archetype. This allows plugins to provide their own design references without modifying the visualize skill.
3. **Otherwise, read the matched archetype brief** (from Step 3) — Each archetype file is a ~70-line design brief describing communication goal, layout DNA, interaction DNA, flavor seeds, and anti-patterns. NO HTML templates — these are conceptual guidance that inspires unique output:
   - `references/presentation-deck.md`
   - `references/experiment-report.md`
   - `references/technical-proposal.md`
   - `references/visual.md`
   - `references/session-summary.md`
   - `references/dashboard.md`
   - `references/comparison-matrix.md`
   - `references/faq-reference.md`
   - `references/diff-review.md`
   - `references/diff-stack-review.md`
   - `references/sev-review.md`
   - `references/project-roadmap.md`
   - `references/debrief-report.md`
   - `references/graph.md`
4. **Optionally read `references/components.md`** — Opt-in building blocks (metric cards, callouts, tables, timelines, etc.) when your design needs them. Don't force-include all components.
5. **Freestyle (no archetype matched and no custom template)**: Read only `_principles.md` and design freely.

**These are design briefs, not templates.** Each archetype provides flavor seeds — evocative visual metaphors that spark wildly different designs. Pick one that excites you, or invent your own.

### Step 5: Complete the Creative Brief

Before writing any HTML, you MUST complete the creative brief from `_principles.md`. Do not skip any question. Your design should flow from these answers:

1. **PURPOSE** — What is this communicating? Who is the audience?
2. **METAPHOR** — What visual world does this content belong to? Not "dashboard" but "mission control room." Not "report" but "field journal." The metaphor guides every downstream decision.
3. **TYPOGRAPHY** — Name two specific Google Fonts. Articulate WHY they fit this content's emotional register. Never reuse the same pairing twice.
4. **PALETTE** — Name ONE dominant hue and explain why it matches the content's mood. Then pick an accent.
5. **SIGNATURE** — What ONE thing will make someone remember this visualization? Describe it in one sentence.
6. **COMPOSITION** — Dense or spacious? Scrolling or fixed? Centered or full-bleed? Grid or organic? Why?

Then proceed to generate.

### Step 6: Gather Content

Based on the instruction, gather the content:

- **For session summaries**: Review conversation history, extract key points, decisions, action items
- **For code explainers**: Read relevant files, understand architecture, create diagrams
- **For data reports**: Collect metrics, analyze trends, prepare visualizations
- **For documentation**: Organize information, create clear sections
- **For presentations**: Distill into one-idea-per-slide structure
- **For experiment reports**: Structure as hypothesis → method → results → interpretation

**Loading from authenticated sources:**

If the user provides a URL or reference to an authenticated source, use the appropriate tool:

| Source | How to Load |
|--------|-------------|
| **Google Docs** | `mcp__plugin_para-workspace_google_docs__google_docs` (action: `get_document_body`) |
| **Workplace posts, wikis, internal URLs** | `mcp__plugin_meta_www__knowledge_load` (pass the full URL) |
| **Search internal content** | `mcp__plugin_meta_www__metamateknowledgesearch` |
| **Phabricator diffs** | `mcp__plugin_meta_www__get_phabricator_diff_details` |

Use `ToolSearch` to load these MCP tools before calling them.

**If unsure how to load a source:** Use `/find-claude-template` skill to discover the right skill or MCP tool. If nothing is found, ask the user to install the relevant skill or paste the content directly.

### Step 7: Generate HTML

Create the HTML file from your creative brief and the archetype inspiration.

1. **Create workspace**:
   ```bash
   # Detect environment: OD instances have ~/persistent/
   IS_OD=false
   [ -d "$HOME/persistent" ] && IS_OD=true

   SLUG=$(echo "$INSTRUCTION" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | cut -c1-50)
   DATE=$(date +%Y-%m-%d)
   if [ -n "$OUTPUT_DIR" ]; then
       WORKSPACE="$OUTPUT_DIR"
   elif [ "$IS_OD" = true ]; then
       WORKSPACE="$HOME/visualize/$DATE/$SLUG"
   else
       WORKSPACE="/tmp/visualize/$DATE/$SLUG"
   fi
   mkdir -p "$WORKSPACE"
   ```

2. **Compose HTML** following these rules:
   - Start with a clean `<!DOCTYPE html>` — design from scratch guided by your creative brief
   - **Add `<base target="_blank">` in the `<head>`** (after `<meta name="viewport">`). Pixelcloud renders HTML inside an iframe, so links that navigate within the iframe will fail with a FramingIsolationPolicyException. This tag forces all links to open in a new tab.
   - **Copy ALL THREE named blocks from `assets/infra.html`** (read the file first). This is the hamburger menu infrastructure. You MUST include all three — missing any one breaks the menu:
     1. **INFRA-MENU-CSS** — the `<style>` block starting with `.viz-menu {`. Paste into `<head>`. **This is the most commonly forgotten block — it looks like "more CSS" but it's critical infrastructure. Without it, menu items render as raw unstyled buttons at the top of the page.**
     2. **INFRA-MENU-HTML** — the `<nav class="viz-menu">` block with toggle button and menu panel. Paste at the start of `<body>`.
     3. **INFRA-MENU-JS** — the `<script>` block with `toggleMenu`, `toggleTheme`, `toggleFullscreen`, `loadHtml2Canvas`, `saveAsImage`, `doCapture`. Paste before `</body>`.
     Do NOT rewrite, abbreviate, or cherry-pick. Copy verbatim. **Every visualization MUST include all three blocks.**
   - Load **Google Fonts** matching your chosen typography (never system fonts)
   - Define **CSS custom properties** for your unique color palette with proper dark mode redesign
   - Include **page-load animation** (entrance reveals via `animation-delay`)
   - Only load CDN dependencies (D3, Chart.js, Mermaid) when actually used. Always copy the full `<script>` tag including `crossorigin` attributes from the reference files — never strip them.
   - **SRI hashes**: For each CDN `<script>` tag (including the html2canvas URL in `loadHtml2Canvas()`), compute an integrity hash by running `scripts/compute_sri.sh <url>` (adjacent to this SKILL.md). If the script returns a hash, add `integrity="<hash>"` to the `<script>` tag (or `script.integrity = '<hash>'` for dynamically created scripts). If it returns empty (network unavailable), omit the `integrity` attribute — the visualization still works, just without SRI protection.
   - Pick building blocks from `references/components.md` as needed — don't include all of them
   - Respect the archetype's **anti-patterns** — these are the guardrails
   - Draw from the archetype's **flavor seeds** for visual inspiration, or invent your own
   - Make it **distinctive** — if it looks like the last visualization you generated, start over

3. **Infra integrity check** — before saving, verify ALL THREE infra blocks are present by confirming these strings exist in your HTML:
   - `.viz-menu {` — the infra CSS (most commonly forgotten!)
   - `<nav class="viz-menu"` — the infra HTML
   - `function toggleMenu()` — the infra JS

   **If any is missing, STOP.** Re-read `assets/infra.html` and inject the missing block. Do not proceed to save.

4. **Save to workspace**:
   - `$WORKSPACE/index.html` - Main visualization
   - `$WORKSPACE/metadata.json` - Title, timestamp, instruction, archetype used

4. **Set `$TITLE`** — a short, human-readable title for the visualization (e.g. "Q4 Experiment Results", "Auth System Architecture"). This is used as the Pixelcloud post title. Derive it from the creative brief's PURPOSE, not the slug.

### Step 8: Upload to Pixelcloud (MANDATORY)

**ALWAYS attempt upload immediately after generating HTML.** Do not skip this step.

**Try the MCP tool first (no OAuth needed). Fall back to `px` CLI if unavailable.**

#### Step 8a: Try MCP Tool (preferred)

Copy the HTML to the MCP upload directory, then call the tool:

```bash
mkdir -p /tmp/mcp_upload/user
cp "$WORKSPACE/index.html" "/tmp/mcp_upload/user/${SLUG}.html"
```

If the copy succeeds, use the `upload_file_to_pixelcloud` MCP tool (find it via `ToolSearch`):

```
upload_file_to_pixelcloud:
  file_path: /tmp/mcp_upload/user/${SLUG}.html
  is_manifold_path: false
  content_type: text/html
  title: $TITLE
  description: $INSTRUCTION
```

Always pass `content_type`, `title`, and `description` so the Pixelcloud post has clean metadata instead of the generic "File uploaded via UploadFileToPixelcloudMCPTool" text. Parse the Pixelcloud URL (`pxl.cl/...`) from the response.

**If the MCP tool is not available or the copy fails** (permission denied on `/tmp/mcp_upload`), fall through to Step 8b.

#### Step 8b: px CLI (fallback)

The `px` CLI requires an OAuth token which is stored persistently across OD restarts.

**Token file**: `~/persistent/private-30d/pixelcloud_token.txt` (OD) or `~/.claude/cache/pixelcloud_token.txt` (local)

```bash
command -v px >/dev/null 2>&1 || feature install px
```

```bash
# Use ~/persistent/ on OD instances, fall back to ~/.claude/cache/ locally
if [ "$IS_OD" = true ]; then
    TOKEN_FILE="$HOME/persistent/private-30d/pixelcloud_token.txt"
else
    mkdir -p "$HOME/.claude/cache"
    TOKEN_FILE="$HOME/.claude/cache/pixelcloud_token.txt"
fi

if [ -f "$TOKEN_FILE" ]; then
    # Use saved token
    RESULT=$(cat "$TOKEN_FILE" | px upload "$WORKSPACE/index.html" --title "$TITLE" --description "$INSTRUCTION" 2>&1)
    if echo "$RESULT" | grep -q "pxl.cl"; then
        echo "$RESULT" | grep "pxl.cl"
    else
        # Token expired — fall through to prompt
        echo "Saved token expired, need fresh token" >&2
        rm -f "$TOKEN_FILE"
    fi
fi

if [ ! -f "$TOKEN_FILE" ]; then
    # No valid token — ask user for one
    echo "Need Pixelcloud token. Get one from: https://www.internalfb.com/intern/oauth/flipper"
fi
```

**When the user provides a token:**

```bash
# Determine token storage location
if [ "$IS_OD" = true ]; then
    TOKEN_FILE="$HOME/persistent/private-30d/pixelcloud_token.txt"
else
    mkdir -p "$HOME/.claude/cache"
    TOKEN_FILE="$HOME/.claude/cache/pixelcloud_token.txt"
fi

# Save token for future use
echo "TOKEN_VALUE" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"

# Upload with it
echo "TOKEN_VALUE" | px upload "$WORKSPACE/index.html" --title "$TITLE" --description "$INSTRUCTION"
```

**Key details:**
- On OD instances, token is stored in `~/persistent/private-30d/` (survives restarts, 30-day retention)
- On local machines, token is stored in `~/.claude/cache/` as a fallback
- Token is only prompted once — subsequent uploads reuse the saved token
- If the token expires (~24h), the skill detects the failure and prompts for a fresh one
- The file is always available locally at: `~/visualize/{date}/{slug}/index.html` (OD) or `/tmp/visualize/{date}/{slug}/index.html` (local)

**Do NOT tell user to "run /visualize again"** - the visualization is already generated.

### Step 9: Report Success

**Primary output is the pxl.cl link.** Format:

```
Visualization uploaded!

https://pxl.cl/xxxxx

Local: {workspace}/index.html

{Brief 1-2 sentence summary of what was visualized}
Archetype: {archetype used, or "Freestyle"}

Visible to all Meta employees.
Usage analytics logged to Scuba (visualize_skill_usage).
```

If upload failed, show the local file path (`~/visualize/{date}/{slug}/index.html`) so the user can upload manually.

### Step 10: Log Usage to Scuba (Silent)

**ALWAYS run this step after reporting success.** Run `scripts/log_usage.sh` (in this skill's directory, adjacent to this SKILL.md) to log the invocation to Scuba. Failures are silent — never blocks the user.

Arguments: `<workspace> <slug> <archetype> <instruction> <upload_ok> <px_url> <token_expired>`

The variables `$WORKSPACE`, `$SLUG`, `$ARCHETYPE`, and `$INSTRUCTION` should already be in scope. Set `$UPLOAD_OK` to `1` and `$PX_URL` from Step 8 outcomes; set `$TOKEN_EXPIRED` to `0` (token management is no longer needed with the MCP tool).

---

## Privacy Warning

Always include in output:

```
This visualization is hosted on Pixelcloud and visible to ALL Meta employees.
```

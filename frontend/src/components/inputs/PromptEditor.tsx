import type { InputMode } from "../../types/app";
import {
  DEFAULT_PROMPTS,
  MUSIC_DECOMPOSITION_PROMPTS,
} from "../../constants/prompts";
import { CollapsibleHeader } from "../CollapsibleHeader";

export interface PromptEditorProps {
  inputMode: InputMode;
  prompts: string[];
  promptInput: string;
  onSetPrompts: (prompts: string[]) => void;
  onSetPromptInput: (input: string) => void;
  musicDecomposition: boolean;
  onSetMusicDecomposition: (enabled: boolean) => void;
  classificationScores: Record<string, number>;
  onSetClassificationScores: (scores: Record<string, number>) => void;
  normalizeScores: boolean;
  onSetNormalizeScores: (normalize: boolean) => void;
  sortByScore: boolean;
  onSetSortByScore: (sort: boolean) => void;
  scoresExpanded: boolean;
  onSetScoresExpanded: (expanded: boolean) => void;
  classifyError: string;
  collapsedSections: Record<string, boolean>;
  onSetCollapsedSections: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

export function PromptEditor({
  prompts,
  promptInput,
  onSetPrompts,
  onSetPromptInput,
  musicDecomposition,
  onSetMusicDecomposition,
  classificationScores,
  onSetClassificationScores,
  normalizeScores,
  onSetNormalizeScores,
  sortByScore,
  onSetSortByScore,
  scoresExpanded,
  onSetScoresExpanded,
  classifyError,
  collapsedSections,
  onSetCollapsedSections,
}: PromptEditorProps) {
  return (
    <section className="block">
      <CollapsibleHeader
        title="Sound Categories"
        isCollapsed={collapsedSections.soundCategories}
        onToggle={() => onSetCollapsedSections(prev => ({ ...prev, soundCategories: !prev.soundCategories }))}
      />
      {!collapsedSections.soundCategories && (
        <div className="stack" style={{ marginTop: "14px" }}>
          <label className="label" htmlFor="prompt-input">
            Sound categories to detect (semicolon-separated)
          </label>
          <textarea
            id="prompt-input"
            value={promptInput}
            onChange={(e) => onSetPromptInput(e.target.value)}
            rows={4}
            placeholder="speech; music; child singing; male speech, man speaking; ..."
            style={{
              resize: "vertical",
              fontFamily: "inherit",
              fontSize: "0.875rem",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #444",
              background: "#1a1a1a",
              color: "#eee"
            }}
          />
          <button
            type="button"
            onClick={() => {
              const parsed = promptInput
                .split(";")
                .map((p) => p.trim())
                .filter((p) => p.length > 0);

              const seen = new Set<string>();
              const uniquePrompts: string[] = [];
              for (const prompt of parsed) {
                const lowerPrompt = prompt.toLowerCase();
                if (!seen.has(lowerPrompt)) {
                  seen.add(lowerPrompt);
                  uniquePrompts.push(prompt);
                }
              }

              if (uniquePrompts.length > 0) {
                onSetPrompts(uniquePrompts);
                onSetPromptInput(uniquePrompts.join("; "));
                onSetClassificationScores({});
                onSetMusicDecomposition(
                  uniquePrompts.length === MUSIC_DECOMPOSITION_PROMPTS.length &&
                  uniquePrompts.every((p, i) => p.toLowerCase() === MUSIC_DECOMPOSITION_PROMPTS[i].toLowerCase())
                );
              }
            }}
          >
            Update prompts
          </button>
          <p className="muted">
            {prompts.length} active prompts. Use semicolons to separate; commas are allowed within prompts.
          </p>

          {/* Music Decomposition Toggle */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "0.25rem"
          }}>
            <input
              type="checkbox"
              id="music-decomposition-toggle"
              checked={musicDecomposition}
              onChange={(e) => {
                const enabled = e.target.checked;
                onSetMusicDecomposition(enabled);
                if (enabled) {
                  onSetPrompts(MUSIC_DECOMPOSITION_PROMPTS);
                  onSetPromptInput(MUSIC_DECOMPOSITION_PROMPTS.join("; "));
                  onSetClassificationScores({});
                  onSetScoresExpanded(false);
                } else {
                  onSetPrompts(DEFAULT_PROMPTS);
                  onSetPromptInput(DEFAULT_PROMPTS.join("; "));
                  onSetClassificationScores({});
                }
              }}
            />
            <label htmlFor="music-decomposition-toggle" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              Music decomposition mode
            </label>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input
              type="checkbox"
              id="normalize-toggle"
              checked={normalizeScores}
              onChange={(e) => onSetNormalizeScores(e.target.checked)}
            />
            <label htmlFor="normalize-toggle" style={{ fontSize: "0.85rem" }}>
              Relative mode (min-max normalization)
            </label>
          </div>
          <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
            {normalizeScores
              ? "Showing relative differences (best=1, worst=0)"
              : "Clamped mode: negative→0, positive→value (matches paper)"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input
              type="checkbox"
              id="sort-toggle"
              checked={sortByScore}
              onChange={(e) => onSetSortByScore(e.target.checked)}
            />
            <label htmlFor="sort-toggle" style={{ fontSize: "0.85rem" }}>
              Sort by score (highest first)
            </label>
          </div>
          {classifyError && <p className="error">{classifyError}</p>}
        </div>
      )}
    </section>
  );
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (start: number, end: number, amount: number): number =>
  start + (end - start) * amount;

export const normalizeScoresMinMax = (
  scores: Record<string, number>
): Record<string, number> => {
  const values = Object.values(scores);
  if (values.length === 0) return {};

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) {
    const normalized: Record<string, number> = {};
    for (const key of Object.keys(scores)) {
      normalized[key] = 0.5;
    }
    return normalized;
  }

  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(scores)) {
    normalized[key] = (value - min) / range;
  }
  return normalized;
};

export const clampScoresToPositive = (
  scores: Record<string, number>
): Record<string, number> => {
  const clamped: Record<string, number> = {};
  for (const [key, value] of Object.entries(scores)) {
    clamped[key] = Math.max(0, Math.min(1, value));
  }
  return clamped;
};

export const fallbackRecommendation = (cores: number, memoryGb: number): number => {
  if (cores <= 4 || memoryGb <= 4) {
    return 10;
  }
  if (cores <= 8 || memoryGb <= 8) {
    return 5;
  }
  return 2;
};

import type { HeatColorStop } from "../types";
import type { ThemeColors } from "../types/themes";
import { HEAT_COLORS } from "../types/themes";
import { lerp } from "./math";

export const getColorFromStops = (value: number, stops: HeatColorStop[]): string => {
  const clamped = Math.min(1, Math.max(0, value));
  let start = stops[0];
  let end = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i += 1) {
    const current = stops[i];
    const next = stops[i + 1];
    if (clamped >= current.stop && clamped <= next.stop) {
      start = current;
      end = next;
      break;
    }
  }

  const range = end.stop - start.stop || 1;
  const t = (clamped - start.stop) / range;
  const r = Math.round(lerp(start.color[0], end.color[0], t));
  const g = Math.round(lerp(start.color[1], end.color[1], t));
  const b = Math.round(lerp(start.color[2], end.color[2], t));

  return `rgb(${r}, ${g}, ${b})`;
};

export const heatColor = (value: number): string => {
  return getColorFromStops(value, HEAT_COLORS);
};

export const getDynamicLabelStyle = (score: number, theme: ThemeColors): React.CSSProperties => {
  const normalizedScore = Math.max(0, Math.min(1, score));
  const [r, g, b] = theme.labelAccent;
  return {
    opacity: 0.3 + (normalizedScore * 0.7),
    fontWeight: 400 + Math.round(normalizedScore * 300),
    color: `rgba(${r}, ${g}, ${b}, ${0.6 + normalizedScore * 0.4})`,
    transition: 'all 0.3s ease',
  };
};

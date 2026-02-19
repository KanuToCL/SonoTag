import type { HeatColorStop } from "./api";

export type ColorTheme = "inferno" | "matrix" | "bone" | "plasma" | "ocean";

export interface ThemeColors {
  name: string;
  stops: HeatColorStop[];
  labelAccent: [number, number, number];
  canvasBg: string;
}

export const COLOR_THEMES: Record<ColorTheme, ThemeColors> = {
  inferno: {
    name: "Inferno",
    stops: [
      { stop: 0, color: [0, 0, 4] },
      { stop: 0.13, color: [40, 11, 84] },
      { stop: 0.25, color: [101, 21, 110] },
      { stop: 0.38, color: [159, 42, 99] },
      { stop: 0.5, color: [212, 72, 66] },
      { stop: 0.63, color: [245, 125, 21] },
      { stop: 0.75, color: [250, 175, 41] },
      { stop: 0.88, color: [252, 225, 119] },
      { stop: 1, color: [252, 255, 164] },
    ],
    labelAccent: [255, 180, 100],
    canvasBg: "#000004",
  },
  matrix: {
    name: "Matrix",
    stops: [
      { stop: 0, color: [0, 8, 16] },
      { stop: 0.15, color: [0, 24, 42] },
      { stop: 0.3, color: [0, 52, 68] },
      { stop: 0.45, color: [8, 88, 92] },
      { stop: 0.6, color: [32, 132, 108] },
      { stop: 0.75, color: [80, 190, 120] },
      { stop: 0.88, color: [140, 230, 140] },
      { stop: 1, color: [200, 255, 200] },
    ],
    labelAccent: [100, 255, 150],
    canvasBg: "#000810",
  },
  bone: {
    name: "Bone",
    stops: [
      { stop: 0, color: [0, 0, 0] },
      { stop: 0.15, color: [35, 39, 45] },
      { stop: 0.3, color: [70, 78, 90] },
      { stop: 0.45, color: [105, 117, 135] },
      { stop: 0.6, color: [145, 158, 175] },
      { stop: 0.75, color: [185, 195, 205] },
      { stop: 0.88, color: [215, 220, 225] },
      { stop: 1, color: [245, 248, 250] },
    ],
    labelAccent: [200, 210, 225],
    canvasBg: "#000000",
  },
  plasma: {
    name: "Plasma",
    stops: [
      { stop: 0, color: [13, 8, 135] },
      { stop: 0.13, color: [75, 3, 161] },
      { stop: 0.25, color: [125, 3, 168] },
      { stop: 0.38, color: [168, 34, 150] },
      { stop: 0.5, color: [203, 70, 121] },
      { stop: 0.63, color: [229, 107, 93] },
      { stop: 0.75, color: [248, 148, 65] },
      { stop: 0.88, color: [253, 195, 40] },
      { stop: 1, color: [240, 249, 33] },
    ],
    labelAccent: [240, 180, 100],
    canvasBg: "#0d0887",
  },
  ocean: {
    name: "Ocean",
    stops: [
      { stop: 0, color: [8, 12, 24] },
      { stop: 0.15, color: [16, 32, 64] },
      { stop: 0.3, color: [24, 56, 104] },
      { stop: 0.45, color: [32, 88, 144] },
      { stop: 0.6, color: [48, 128, 176] },
      { stop: 0.75, color: [80, 176, 200] },
      { stop: 0.88, color: [144, 216, 224] },
      { stop: 1, color: [208, 244, 248] },
    ],
    labelAccent: [100, 200, 240],
    canvasBg: "#080c18",
  },
};

export const HEAT_COLORS: HeatColorStop[] = [
  { stop: 0, color: [26, 20, 16] },
  { stop: 0.3, color: [88, 52, 29] },
  { stop: 0.55, color: [156, 88, 45] },
  { stop: 0.78, color: [214, 142, 72] },
  { stop: 1, color: [244, 219, 173] },
];

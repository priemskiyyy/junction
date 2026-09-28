import type { Tone } from "example-shared/types/Tone";

/** The lab's neutral palette and its accent: Tailwind's zinc and violet, as the web lab uses them. */
export const COLORS = {
  background: "#f4f4f5",
  surface: "#ffffff",
  sunken: "#f4f4f5",
  border: "#e4e4e7",
  text: "#18181b",
  muted: "#52525b",
  subtle: "#71717a",
  faint: "#a1a1aa",
  accent: "#7c3aed",
  accentPressed: "#6d28d9",
  accentSoft: "#ede9fe",
  accentInk: "#5b21b6",
  onAccent: "#ffffff",
};

/** Each tone as a dot or a bar, a soft background, and the ink that reads on it. */
export const TONE_COLORS = {
  neutral: { strong: "#71717a", soft: "#f4f4f5", ink: "#3f3f46" },
  positive: { strong: "#16a34a", soft: "#dcfce7", ink: "#166534" },
  warning: { strong: "#d97706", soft: "#fef3c7", ink: "#92400e" },
  danger: { strong: "#e11d48", soft: "#ffe4e6", ink: "#9f1239" },
  accent: { strong: "#7c3aed", soft: "#ede9fe", ink: "#5b21b6" },
  info: { strong: "#0284c7", soft: "#e0f2fe", ink: "#075985" },
} satisfies Record<Tone, { strong: string; soft: string; ink: string }>;

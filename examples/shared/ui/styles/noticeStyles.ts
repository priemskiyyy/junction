import { cva } from "class-variance-authority";

import type { Tone } from "example-shared/types/Tone";

/** A notice beside the control it is about. */
export const noticeStyles = cva(
  "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
  {
    variants: {
      tone: {
        neutral:
          "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900",
        positive:
          "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
        warning:
          "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
        danger:
          "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40",
        accent:
          "border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40",
        info: "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40",
      } satisfies Record<Tone, string>,
    },
    defaultVariants: { tone: "neutral" },
  },
);

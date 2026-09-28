import { cva } from "class-variance-authority";

/** The track of an on and off switch. */
export const switchTrackStyles = cva(
  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
  {
    variants: {
      on: {
        true: "bg-violet-600 dark:bg-violet-400",
        false: "bg-zinc-300 dark:bg-zinc-700",
      },
    },
    defaultVariants: { on: false },
  },
);

/** The thumb that slides along a switch's track. */
export const switchThumbStyles = cva(
  "inline-block size-4 rounded-full bg-white shadow transition-transform",
  {
    variants: {
      on: { true: "translate-x-4.5", false: "translate-x-0.5" },
    },
    defaultVariants: { on: false },
  },
);

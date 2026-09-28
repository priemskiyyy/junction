import { cva } from "class-variance-authority";

/** One segment of a segmented control, such as Folio's workspace tabs. */
export const segmentStyles = cva(
  "inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-violet-500",
  {
    variants: {
      selected: {
        true: "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50",
        false:
          "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
      },
    },
    defaultVariants: { selected: false },
  },
);

import { cva } from "class-variance-authority";

/** A small monospace tag: a route id, a source, a launch read, a deferral claim. */
export const tagStyles = cva(
  "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[0.6875rem] whitespace-nowrap",
  {
    variants: {
      emphasis: {
        plain: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
        strong:
          "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200",
      },
    },
    defaultVariants: { emphasis: "plain" },
  },
);

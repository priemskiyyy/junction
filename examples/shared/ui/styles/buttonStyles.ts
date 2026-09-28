import { cva } from "class-variance-authority";

export const buttonStyles = cva(
  "inline-flex items-center gap-1.5 rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-violet-600 text-white shadow-sm hover:bg-violet-500 dark:bg-violet-400 dark:text-zinc-950 dark:hover:bg-violet-300",
        secondary:
          "border border-zinc-300 bg-white shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
        ghost:
          "text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
      },
      pressed: {
        true: "border-violet-500 text-violet-800 ring-2 ring-violet-500/50 dark:border-violet-400 dark:text-violet-200",
        false: "",
      },
      size: {
        regular: "h-10 justify-center px-4 text-sm whitespace-nowrap",
        small: "h-8 justify-center px-2.5 text-sm whitespace-nowrap",
        tiny: "h-7 justify-center px-2 text-xs whitespace-nowrap",
        block: "min-h-10 w-full justify-start px-3 py-2 text-left text-sm",
      },
    },
    defaultVariants: { variant: "secondary", pressed: false, size: "regular" },
  },
);

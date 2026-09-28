import type React from "react";

type PayloadBlockProps = { label: string; value: unknown };

export const PayloadBlock: React.FunctionComponent<PayloadBlockProps> = ({
  label,
  value,
}) => (
  <figure className="flex flex-col gap-1">
    <figcaption className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
      {label}
    </figcaption>
    <pre className="overflow-x-auto rounded-lg bg-zinc-900 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-100 dark:bg-black">
      {JSON.stringify(value, null, 2)}
    </pre>
  </figure>
);

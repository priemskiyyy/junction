import type React from "react";

type ExperimentStatProps = { label: string; value: number };

export const ExperimentStat: React.FunctionComponent<ExperimentStatProps> = ({
  label,
  value,
}) => (
  <div className="flex flex-col items-center gap-0.5 rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800/70">
    <span className="font-mono text-2xl font-semibold tabular-nums">
      {value}
    </span>
    <span className="text-xs text-zinc-500">{label}</span>
  </div>
);

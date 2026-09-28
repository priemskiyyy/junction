import clsx from "clsx";
import type React from "react";

import { formatClockTime } from "example-shared/formatting/formatClockTime";
import type { TimelineEntry } from "example-shared/lab/types/TimelineEntry";
import { dotStyles } from "example-shared/ui/styles/dotStyles";
import { Tag } from "src/components/Common/Tag";

type TimelineRowProps = { entry: TimelineEntry; label: string | null };

export const TimelineRow: React.FunctionComponent<TimelineRowProps> = ({
  entry,
  label,
}) => (
  <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-0.5 py-2 text-sm motion-safe:animate-flash">
    <span
      aria-hidden="true"
      className={clsx("mt-1.5", dotStyles({ tone: entry.tone }))}
    />
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {label === null ? null : <Tag strong>{label}</Tag>}
      <span>{entry.line}</span>
    </span>
    <span className="col-start-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
      {entry.type ?? "lab"} · launch {entry.launch.number} ·{" "}
      {formatClockTime(entry.timestamp)}
    </span>
  </li>
);

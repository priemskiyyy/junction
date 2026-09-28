import type React from "react";

import type { SdkCall } from "example-shared/device/types/SdkCall";
import { formatClockTime } from "example-shared/formatting/formatClockTime";
import { CALLERS } from "example-shared/ui/constants/callers";
import { Badge } from "src/components/Common/Badge";

type SdkCallListProps = { calls: SdkCall[] };

export const SdkCallList: React.FunctionComponent<SdkCallListProps> = ({
  calls,
}) => (
  <ol
    aria-label="SDK calls"
    className="flex max-h-[32rem] flex-col divide-y divide-zinc-200/70 overflow-y-auto dark:divide-zinc-800"
  >
    {calls.map(({ id, sdk, call, answer, caller, timestamp }) => (
      <li
        key={id}
        className="flex flex-col gap-1 py-2 text-sm motion-safe:animate-flash"
      >
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone={CALLERS[caller].tone}>{CALLERS[caller].label}</Badge>
          <span className="font-mono text-xs break-all">
            {sdk} · {call}
          </span>
        </span>
        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {answer === null ? "" : `→ ${answer} · `}
          {formatClockTime(timestamp)}
        </span>
      </li>
    ))}
  </ol>
);

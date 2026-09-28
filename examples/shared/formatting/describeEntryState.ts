import { match } from "ts-pattern";

import { formatCountdown } from "example-shared/formatting/formatCountdown";
import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";

/** An inbox entry's state as the badge on its card says it. */
export const describeEntryState = (entry: FolioInboxEntry, now: number) =>
  match(entry)
    .with({ state: "pending" }, () => "Waiting")
    .with(
      { state: "leased" },
      ({ attempt }) => `Running, attempt ${attempt.number}`,
    )
    .with(
      { state: "retry-scheduled" },
      ({ retry }) => `Retry in ${formatCountdown(retry.at, now)}`,
    )
    .with({ state: "failed" }, () => "Failed")
    .with({ state: "interrupted" }, () => "Interrupted")
    .exhaustive();

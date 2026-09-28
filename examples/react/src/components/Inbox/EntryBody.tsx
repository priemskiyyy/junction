import type React from "react";
import { match } from "ts-pattern";

import { ERROR_WORDS } from "example-shared/formatting/constants/errorWords";
import { describeBinding } from "example-shared/formatting/describeBinding";
import { describeWaiting } from "example-shared/formatting/describeWaiting";
import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";

type EntryBodyProps = { entry: FolioInboxEntry };

export const EntryBody: React.FunctionComponent<EntryBodyProps> = ({
  entry,
}) => (
  <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
    {match(entry)
      .with({ state: "pending" }, (pending) => describeWaiting(pending))
      .with(
        { state: "leased" },
        ({ attempt, binding }) =>
          `Attempt ${attempt.number} runs for ${describeBinding(binding)}, and holds the one execution slot.`,
      )
      .with(
        { state: "retry-scheduled" },
        ({ attempts }) =>
          `Its handler asked to try again. It has used ${attempts} of its attempts.`,
      )
      .with(
        { state: "failed", error: { code: "ATTEMPTS_EXHAUSTED" } },
        () =>
          "It failed, since every attempt was used. Cancel it, and open it again once the cause is fixed.",
      )
      .with(
        { state: "failed" },
        ({ error }) =>
          `It failed, since ${ERROR_WORDS[error.code]}. Retry it once the cause is fixed, or cancel it.`,
      )
      .with(
        { state: "interrupted" },
        ({ error }) =>
          `It was interrupted, since ${ERROR_WORDS[error.code]}. Its effect may have happened, so retrying is Folio's call.`,
      )
      .exhaustive()}
  </p>
);

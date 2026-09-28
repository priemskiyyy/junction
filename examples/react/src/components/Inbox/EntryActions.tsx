import type { RecoveryResult } from "@priemskiyyy/junction";
import { useJunction } from "@priemskiyyy/junction-react";
import { ArrowClockwise, X } from "@phosphor-icons/react";
import type React from "react";
import { useState } from "react";

import { RECOVERY_WORDS } from "example-shared/formatting/constants/recoveryWords";
import { isRetryable } from "example-shared/junction/isRetryable";
import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";

type EntryActionsProps = { entry: FolioInboxEntry; label: string };

export const EntryActions: React.FunctionComponent<EntryActionsProps> = ({
  entry,
  label,
}) => {
  const junction = useJunction();
  const [answer, setAnswer] = useState<RecoveryResult | null>(null);

  const handleRetryPress = async () => {
    setAnswer(await junction.retry(entry.id, { after: 0 }));
  };

  const handleCancelPress = async () => {
    setAnswer(await junction.cancel(entry.id));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isRetryable(entry) ? (
        <button
          type="button"
          aria-label={`Retry ${label}`}
          onClick={handleRetryPress}
          className={buttonStyles({ variant: "primary", size: "tiny" })}
        >
          <ArrowClockwise aria-hidden="true" size={12} weight="bold" />
          Retry
        </button>
      ) : null}
      <button
        type="button"
        aria-label={`Cancel ${label}`}
        onClick={handleCancelPress}
        className={buttonStyles({ variant: "ghost", size: "tiny" })}
      >
        <X aria-hidden="true" size={12} weight="bold" />
        Cancel
      </button>
      {answer?.status === "refused" ? (
        <span
          role="status"
          className="text-xs text-rose-700 dark:text-rose-300"
        >
          Junction refused: {RECOVERY_WORDS[answer.reason]}.
        </span>
      ) : null}
    </div>
  );
};

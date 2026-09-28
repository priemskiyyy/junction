import { useJunction } from "@priemskiyyy/junction-react";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  HardDrives,
} from "@phosphor-icons/react";
import type React from "react";

import { describeSavedInbox } from "example-shared/formatting/describeSavedInbox";
import { describeStorageStatus } from "example-shared/formatting/describeStorageStatus";
import { formatClockTime } from "example-shared/formatting/formatClockTime";
import { formatCount } from "example-shared/formatting/formatCount";
import { getStorageTone, WRITE_TONES } from "example-shared/ui/constants/tones";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { Badge } from "src/components/Common/Badge";
import { PanelHeading } from "src/components/Common/PanelHeading";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const StorageCard: React.FunctionComponent = () => {
  const lab = useLab();
  const junction = useJunction();
  const status = useObservable(junction.storage.status);
  const stored = useObservable(lab.storage.state);

  const unconfirmed =
    status.state === "ready" && status.durability === "unconfirmed";

  return (
    <section
      aria-labelledby="storage-title"
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
    >
      <PanelHeading
        id="storage-title"
        icon={HardDrives}
        title="Device storage"
        shows="junction.storage: whether the last write committed. flush() writes again, and reset() recovers a blocked store."
      />
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={getStorageTone(status)} dot>
          {describeStorageStatus(status)}
        </Badge>
        <span className="text-zinc-600 dark:text-zinc-400">
          {describeSavedInbox(stored)}
        </span>
      </p>
      {stored.writes.length === 0 ? null : (
        <ol aria-label="Recent writes" className="flex flex-col gap-1">
          {stored.writes.map((write) => (
            <li
              key={write.id}
              className="flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-600 dark:text-zinc-400"
            >
              <Badge tone={WRITE_TONES[write.status]}>{write.status}</Badge>
              revision {write.revision} · {formatCount(write.intents, "intent")}{" "}
              · {formatClockTime(write.timestamp)}
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!unconfirmed}
          onClick={() => junction.storage.flush()}
          className={buttonStyles({ size: "small" })}
        >
          <ArrowClockwise aria-hidden="true" size={14} weight="bold" />
          Write again
        </button>
        <button
          type="button"
          disabled={status.state !== "blocked"}
          onClick={() => junction.storage.reset()}
          className={buttonStyles({ size: "small" })}
        >
          <ArrowCounterClockwise aria-hidden="true" size={14} weight="bold" />
          Reset storage
        </button>
      </div>
    </section>
  );
};

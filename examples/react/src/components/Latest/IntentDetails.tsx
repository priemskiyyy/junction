import type React from "react";

import { describeBinding } from "example-shared/formatting/describeBinding";
import { describeWaiting } from "example-shared/formatting/describeWaiting";
import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";
import { getOutcome } from "example-shared/lab/getOutcome";
import type { KnownIntent } from "example-shared/lab/types/KnownIntent";
import type { TimelineEntry } from "example-shared/lab/types/TimelineEntry";
import { noticeStyles } from "example-shared/ui/styles/noticeStyles";
import { PayloadBlock } from "src/components/Common/PayloadBlock";
import { ProvenanceTags } from "src/components/Common/ProvenanceTags";
import { Tag } from "src/components/Common/Tag";
import { TimelineRow } from "src/components/Common/TimelineRow";
import { IntentStatus } from "src/components/Latest/IntentStatus";

type IntentDetailsProps = {
  intent: KnownIntent;
  entry: FolioInboxEntry | undefined;
  journey: TimelineEntry[];
  now: number;
};

export const IntentDetails: React.FunctionComponent<IntentDetailsProps> = ({
  intent,
  entry,
  journey,
  now,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2">
      <p className="mr-auto text-base font-semibold">{intent.label}</p>
      <IntentStatus entry={entry} outcome={getOutcome(journey)} now={now} />
    </div>
    <div className="flex flex-wrap items-center gap-1.5">
      <Tag>{intent.entry.name}</Tag>
      <ProvenanceTags provenance={intent.entry.provenance} />
      <Tag>for {describeBinding(intent.entry.binding)}</Tag>
    </div>
    {entry?.state === "pending" ? (
      <p className={noticeStyles({ tone: "warning" })}>
        <span>
          <span className="font-semibold">Why it waits: </span>
          {describeWaiting(entry)}
        </span>
      </p>
    ) : null}
    <PayloadBlock label="Validated payload" value={intent.entry.payload} />
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        Its journey
      </p>
      <ol
        aria-label="Its journey"
        className="flex flex-col divide-y divide-zinc-200/70 dark:divide-zinc-800"
      >
        {journey.map((line) => (
          <TimelineRow key={line.id} entry={line} label={null} />
        ))}
      </ol>
    </div>
  </div>
);

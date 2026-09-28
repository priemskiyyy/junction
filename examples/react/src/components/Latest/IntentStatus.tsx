import type React from "react";

import { describeEntryState } from "example-shared/formatting/describeEntryState";
import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";
import type { TimelineEntry } from "example-shared/lab/types/TimelineEntry";
import { ENTRY_TONES, EVENT_TONES } from "example-shared/ui/constants/tones";
import { EVENT_LABELS } from "example-shared/ui/constants/eventLabels";
import { Badge } from "src/components/Common/Badge";

type IntentStatusProps = {
  entry: FolioInboxEntry | undefined;
  outcome: TimelineEntry | null;
  now: number;
};

// While the intent is in the inbox its state says where it is; once it left, the line that ended it does.
export const IntentStatus: React.FunctionComponent<IntentStatusProps> = ({
  entry,
  outcome,
  now,
}) => {
  if (entry !== undefined) {
    return (
      <span role="status" aria-label="Its state">
        <Badge tone={ENTRY_TONES[entry.state]} dot>
          {describeEntryState(entry, now)}
        </Badge>
      </span>
    );
  }

  if (outcome === null || outcome.type === null) {
    return (
      <span role="status" aria-label="Its state">
        <Badge tone="neutral">Left the inbox</Badge>
      </span>
    );
  }

  return (
    <span role="status" aria-label="Its state">
      <Badge tone={EVENT_TONES[outcome.type]} dot>
        {EVENT_LABELS[outcome.type]}
      </Badge>
    </span>
  );
};

import type React from "react";

import { describeEntryState } from "example-shared/formatting/describeEntryState";
import { describeIntent } from "example-shared/formatting/describeIntent";
import { formatCountdown } from "example-shared/formatting/formatCountdown";
import { formatShortId } from "example-shared/formatting/formatShortId";
import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";
import { ENTRY_TONES } from "example-shared/ui/constants/tones";
import { Badge } from "src/components/Common/Badge";
import { ProvenanceTags } from "src/components/Common/ProvenanceTags";
import { Tag } from "src/components/Common/Tag";
import { EntryActions } from "src/components/Inbox/EntryActions";
import { EntryBody } from "src/components/Inbox/EntryBody";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

type InboxEntryCardProps = { entry: FolioInboxEntry };

export const InboxEntryCard: React.FunctionComponent<InboxEntryCardProps> = ({
  entry,
}) => {
  const lab = useLab();
  const now = useObservable(lab.ticker);
  const label = describeIntent(entry, lab.getTitle);

  return (
    <li
      aria-label={label}
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 motion-safe:animate-land dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto font-medium">{label}</span>
        <Badge tone={ENTRY_TONES[entry.state]} dot>
          {describeEntryState(entry, now)}
        </Badge>
      </div>
      <EntryBody entry={entry} />
      <div className="flex flex-wrap items-center gap-1.5">
        <ProvenanceTags provenance={entry.provenance} />
        <Tag>expires in {formatCountdown(entry.expires.at, now)}</Tag>
        <Tag>{formatShortId(entry.id)}</Tag>
      </div>
      <EntryActions entry={entry} label={label} />
    </li>
  );
};

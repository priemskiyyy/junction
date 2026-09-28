import { useInbox } from "@priemskiyyy/junction-react";
import { Tray } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { EmptyState } from "src/components/Common/EmptyState";
import { PanelHeading } from "src/components/Common/PanelHeading";
import { InboxEntryCard } from "src/components/Inbox/InboxEntryCard";
import { useRuntime } from "src/hooks/useRuntime";

export const InboxPanel: React.FunctionComponent = () => {
  const inbox = useInbox();
  const { state } = useRuntime();

  return (
    <section
      aria-labelledby="inbox-panel-title"
      className={clsx("flex min-w-0 flex-col gap-3 p-4", CARD_CLASS_NAME)}
    >
      <PanelHeading
        id="inbox-panel-title"
        icon={Tray}
        title="Junction's inbox"
        shows="useInbox(): every intent that has not ended, and why it waits."
      />
      {state === "quit" ? (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
          Folio quit, so this is its inbox as it stopped. The persistent intents
          are in storage for the next launch.
        </p>
      ) : null}
      {inbox.length === 0 ? (
        <EmptyState
          icon={Tray}
          title="The inbox is empty"
          description="Everything that arrived has run or ended. Open something from outside to fill it."
        />
      ) : (
        <ul aria-label="Inbox entries" className="flex flex-col gap-2.5">
          {inbox.map((entry) => (
            <InboxEntryCard key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  );
};

import { Info } from "@phosphor-icons/react";
import type React from "react";

import { InviteCard } from "src/components/Outside/InviteCard";
import { MessagesCard } from "src/components/Outside/MessagesCard";
import { NotificationsCard } from "src/components/Outside/NotificationsCard";
import { ShortcutsCard } from "src/components/Outside/ShortcutsCard";
import { useRuntime } from "src/hooks/useRuntime";

export const OutsidePanel: React.FunctionComponent = () => {
  const { state } = useRuntime();

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-lg font-semibold tracking-tight">Outside Folio</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Each card is an SDK on the phone, and a real Junction adapter listens
          to it.
        </p>
      </div>
      {state === "quit" ? (
        <p className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
          <Info
            aria-hidden="true"
            size={16}
            weight="fill"
            className="mt-0.5 shrink-0"
          />
          Folio is quit, so tapping any of these launches it cold, and the
          source reads what it launched from.
        </p>
      ) : null}
      <MessagesCard />
      <NotificationsCard />
      <ShortcutsCard />
      <InviteCard />
    </div>
  );
};

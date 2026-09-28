import { DownloadSimple, Gift } from "@phosphor-icons/react";
import type React from "react";

import { INVITE_LINK } from "example-shared/device/constants/invites";
import { PEOPLE } from "example-shared/folio/constants/people";
import { WORKSPACES } from "example-shared/folio/constants/workspaces";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { OutsideCard } from "src/components/Outside/OutsideCard";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const InviteCard: React.FunctionComponent = () => {
  const lab = useLab();
  const busy = useObservable(lab.busy);
  const from = PEOPLE[INVITE_LINK.from.id];
  const workspace = WORKSPACES[INVITE_LINK.workspace.id];

  return (
    <OutsideCard
      icon={Gift}
      title="An invite install"
      source="installs"
      factory="adjust()"
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {from.firstName} invited you to {workspace.name} with an Adjust link.
        Opening it deletes Folio and installs it again; on its first launch,
        Adjust hands over the deferred link.
      </p>
      <p className="font-mono text-xs break-all text-zinc-500">
        {INVITE_LINK.deeplink}
      </p>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => lab.installFromInvite()}
        className={buttonStyles({ variant: "primary", size: "small" })}
      >
        <DownloadSimple aria-hidden="true" size={14} weight="bold" />
        Install Folio from the invite
      </button>
    </OutsideCard>
  );
};

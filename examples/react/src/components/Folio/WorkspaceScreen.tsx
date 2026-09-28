import { Rows } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { AccountMenu } from "src/components/Folio/AccountMenu";
import { FolioBanner } from "src/components/Folio/FolioBanner";
import { FolioMark } from "src/components/Folio/FolioMark";
import { WorkspacePane } from "src/components/Folio/WorkspacePane";
import { useObservable } from "src/hooks/useObservable";
import { useRuntime } from "src/hooks/useRuntime";

type WorkspaceScreenProps = { account: { id: string } };

export const WorkspaceScreen: React.FunctionComponent<WorkspaceScreenProps> = ({
  account,
}) => {
  const { app } = useRuntime();
  const { panes, banner } = useObservable(app.navigation);
  const split = panes.length > 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <span className="mr-auto">
          <FolioMark />
        </span>
        <button
          type="button"
          aria-pressed={split}
          onClick={() => app.setSplit(!split)}
          className={clsx(
            buttonStyles({ pressed: split, size: "tiny" }),
            "rounded-full",
          )}
        >
          <Rows aria-hidden="true" size={12} weight="bold" />
          Split view
        </button>
        <AccountMenu account={account} />
      </div>
      {banner === null ? null : (
        <FolioBanner banner={banner} onDismiss={app.dismissBanner} />
      )}
      <div className="flex min-h-0 flex-1 flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {panes.map((pane, index) => (
          <WorkspacePane
            key={index}
            pane={pane}
            index={index}
            total={panes.length}
            account={account}
          />
        ))}
      </div>
    </div>
  );
};

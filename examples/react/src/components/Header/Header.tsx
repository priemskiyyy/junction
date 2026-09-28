import { ArrowCounterClockwise, Signpost } from "@phosphor-icons/react";
import type React from "react";

import { describeStorageStatus } from "example-shared/formatting/describeStorageStatus";
import { APP_STATES } from "example-shared/ui/constants/appStates";
import { getStorageTone } from "example-shared/ui/constants/tones";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { Badge } from "src/components/Common/Badge";
import { SectionNav } from "src/components/Section/SectionNav";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { useRuntime } from "src/hooks/useRuntime";

export const Header: React.FunctionComponent = () => {
  const lab = useLab();
  const runtime = useRuntime();
  const storage = useObservable(runtime.junction.storage.status);
  const app = APP_STATES[runtime.state];

  const handleResetPress = () => {
    lab.reset();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <div className="mr-auto flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
          <span
            aria-hidden="true"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white dark:bg-violet-400 dark:text-zinc-950"
          >
            <Signpost size={20} weight="bold" />
          </span>
          <h1 className="text-lg font-semibold">Intent Lab</h1>
          <Badge tone={app.tone} dot>
            {app.label}
          </Badge>
          <span className="hidden sm:inline-flex">
            <Badge tone={getStorageTone(storage)}>
              Storage: {describeStorageStatus(storage)}
            </Badge>
          </span>
        </div>
        <div className="order-last w-full min-w-0 lg:order-none lg:w-auto">
          <SectionNav />
        </div>
        <button
          type="button"
          aria-label="Reset lab"
          onClick={handleResetPress}
          className={buttonStyles({ variant: "ghost", size: "small" })}
        >
          <ArrowCounterClockwise aria-hidden="true" size={14} weight="bold" />
          <span className="hidden sm:inline">Reset lab</span>
        </button>
      </div>
    </header>
  );
};

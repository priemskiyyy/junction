import type React from "react";
import { match } from "ts-pattern";

import { HomeScreen } from "src/components/Device/HomeScreen";
import { StatusBar } from "src/components/Device/StatusBar";
import { FolioApp } from "src/components/Folio/FolioApp";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { useRuntime } from "src/hooks/useRuntime";

export const DevicePhone: React.FunctionComponent = () => {
  const lab = useLab();
  const runtime = useRuntime();
  const now = useObservable(lab.ticker);

  const handleQuitPress = () => {
    lab.quit();
  };

  return (
    <div className="order-first mx-auto flex w-full max-w-[22rem] flex-col gap-2 lg:order-none">
      <div className="rounded-[2.75rem] bg-zinc-900 p-2.5 shadow-2xl ring-1 ring-zinc-800 dark:bg-black">
        <div
          role="region"
          aria-label="The phone"
          className="flex h-[40rem] flex-col overflow-hidden rounded-[2.2rem] bg-white dark:bg-zinc-950"
        >
          <StatusBar now={now} />
          <div className="flex min-h-0 flex-1 flex-col">
            {match(runtime.state)
              .with("quit", () => <HomeScreen />)
              .with("running", () => <FolioApp />)
              .exhaustive()}
          </div>
          <div className="flex h-6 shrink-0 items-center justify-center">
            <span
              aria-hidden="true"
              className="h-1 w-28 rounded-full bg-zinc-900/80 dark:bg-zinc-200/80"
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        disabled={runtime.state === "quit"}
        onClick={handleQuitPress}
        className="self-center rounded-full px-3 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-violet-500 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Swipe Folio away to quit it
      </button>
    </div>
  );
};

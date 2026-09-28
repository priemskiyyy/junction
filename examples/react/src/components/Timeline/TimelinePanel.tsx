import { ClockCounterClockwise, Eraser } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";
import { useState } from "react";
import { match } from "ts-pattern";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { segmentStyles } from "example-shared/ui/styles/segmentStyles";
import { EmptyState } from "src/components/Common/EmptyState";
import { PanelHeading } from "src/components/Common/PanelHeading";
import { TimelineRow } from "src/components/Common/TimelineRow";
import { SdkCallList } from "src/components/Timeline/SdkCallList";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

type TimelineTab = "timeline" | "calls";

const TABS: { id: TimelineTab; label: string }[] = [
  { id: "timeline", label: "Junction's events" },
  { id: "calls", label: "SDK calls" },
];

export const TimelinePanel: React.FunctionComponent = () => {
  const lab = useLab();
  const timeline = useObservable(lab.timeline);
  const calls = useObservable(lab.device.calls);
  const intents = useObservable(lab.intents);
  const [tab, setTab] = useState<TimelineTab>("timeline");

  return (
    <section
      aria-labelledby="timeline-title"
      className={clsx("flex min-w-0 flex-col gap-3 p-4", CARD_CLASS_NAME)}
    >
      <PanelHeading
        id="timeline-title"
        icon={ClockCounterClockwise}
        title="Watch it happen"
        shows="junction.diagnostics.events across every launch, and every call into an SDK: the adapters only listen."
      >
        <button
          type="button"
          disabled={timeline.length === 0}
          onClick={lab.timeline.clear}
          className={buttonStyles({ variant: "ghost", size: "small" })}
        >
          <Eraser aria-hidden="true" size={14} weight="bold" />
          Clear
        </button>
      </PanelHeading>
      <div
        role="tablist"
        aria-label="Log"
        className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={segmentStyles({ selected: tab === id })}
          >
            {label}
          </button>
        ))}
      </div>
      {match(tab)
        .with("calls", () => <SdkCallList calls={calls} />)
        .with("timeline", () => {
          if (timeline.length === 0) {
            return (
              <EmptyState
                icon={ClockCounterClockwise}
                title="Nothing yet"
                description="Open something from outside, and every event Junction records lands here."
              />
            );
          }

          return (
            <ol
              aria-label="Timeline events"
              className="flex max-h-[32rem] flex-col divide-y divide-zinc-200/70 overflow-y-auto dark:divide-zinc-800"
            >
              {timeline.map((entry) => (
                <TimelineRow
                  key={entry.id}
                  entry={entry}
                  label={
                    entry.intent === null
                      ? null
                      : (intents[entry.intent.id]?.label ?? null)
                  }
                />
              ))}
            </ol>
          );
        })
        .exhaustive()}
    </section>
  );
};

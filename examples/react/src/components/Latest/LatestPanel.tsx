import { useInbox } from "@priemskiyyy/junction-react";
import { Tray } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { formatClockTime } from "example-shared/formatting/formatClockTime";
import { getJourney } from "example-shared/lab/getJourney";
import { getLatestAnswer } from "example-shared/lab/getLatestAnswer";
import { EVENT_LABELS } from "example-shared/ui/constants/eventLabels";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { dotStyles } from "example-shared/ui/styles/dotStyles";
import { EmptyState } from "src/components/Common/EmptyState";
import { PanelHeading } from "src/components/Common/PanelHeading";
import { IntentDetails } from "src/components/Latest/IntentDetails";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const LatestPanel: React.FunctionComponent = () => {
  const lab = useLab();
  const timeline = useObservable(lab.timeline);
  const intents = useObservable(lab.intents);
  const now = useObservable(lab.ticker);
  const inbox = useInbox();

  const answer = getLatestAnswer(timeline);
  const intentId = answer?.intent?.id;
  const intent = intentId === undefined ? undefined : intents[intentId];

  return (
    <section
      aria-labelledby="latest-title"
      className={clsx("flex min-w-0 flex-col gap-3 p-4", CARD_CLASS_NAME)}
    >
      <PanelHeading
        id="latest-title"
        icon={Tray}
        title="Latest intent"
        shows="What Junction answered, and where the intent is now."
      />
      {answer === null || answer.type === null ? (
        <EmptyState
          icon={Tray}
          title="Nothing has arrived yet"
          description="Tap a link, press a notification or pick a shortcut, and Junction's answer lands here."
        />
      ) : (
        <div
          key={answer.id}
          className="flex flex-col gap-3 motion-safe:animate-land"
        >
          <p
            role="status"
            aria-label="Latest answer"
            className="flex items-start gap-2.5 text-sm"
          >
            <span
              aria-hidden="true"
              className={clsx("mt-1.5", dotStyles({ tone: answer.tone }))}
            />
            <span className="flex flex-col">
              <span className="font-medium">{answer.line}</span>
              <span className="font-mono text-xs text-zinc-500">
                {EVENT_LABELS[answer.type]} · launch {answer.launch.number} ·{" "}
                {formatClockTime(answer.timestamp)}
              </span>
            </span>
          </p>
          {intent === undefined ? null : (
            <IntentDetails
              intent={intent}
              entry={inbox.find(({ id }) => id === intent.id)}
              journey={getJourney(timeline, intent.id)}
              now={now}
            />
          )}
        </div>
      )}
    </section>
  );
};

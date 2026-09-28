import { useJunction } from "@priemskiyyy/junction-react";
import { Eye } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { describeIdentity } from "example-shared/formatting/describeIdentity";
import { describeRunning } from "example-shared/formatting/describeRunning";
import { describeSourceStatus } from "example-shared/formatting/describeSourceStatus";
import { getSourceLabel } from "example-shared/formatting/getSourceLabel";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { FIELD_LABEL_CLASS_NAME } from "example-shared/ui/styles/fieldStyles";
import { PanelHeading } from "src/components/Common/PanelHeading";
import { Tag } from "src/components/Common/Tag";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { useRuntime } from "src/hooks/useRuntime";

export const JunctionViewPanel: React.FunctionComponent = () => {
  const lab = useLab();
  const junction = useJunction();
  const { app } = useRuntime();
  const snapshot = useObservable(junction.diagnostics);
  const identity = useObservable(app.identity);
  const intents = useObservable(lab.intents);

  return (
    <section
      aria-labelledby="junction-view-title"
      className={clsx("flex min-w-0 flex-col gap-4 p-4", CARD_CLASS_NAME)}
    >
      <PanelHeading
        id="junction-view-title"
        icon={Eye}
        title="What Junction sees"
        shows="junction.diagnostics: the screens that take intents, the sources, and the one running attempt."
      />
      <div className="flex flex-col gap-1.5">
        <p className={FIELD_LABEL_CLASS_NAME}>Identity</p>
        <p className="text-sm">{describeIdentity(identity)}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={FIELD_LABEL_CLASS_NAME}>Screens that take intents</p>
        {snapshot.consumers.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No screen is mounted, so every intent waits.
          </p>
        ) : (
          <ul aria-label="Consumers" className="flex flex-col gap-1.5">
            {snapshot.consumers.map((consumer) => (
              <li
                key={consumer.id}
                className="flex flex-wrap items-center gap-1.5 text-sm"
              >
                <span className="mr-auto">{consumer.name ?? "Unnamed"}</span>
                <Tag>{consumer.intent.name}</Tag>
                {consumer.fallback ? <Tag strong>fallback</Tag> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={FIELD_LABEL_CLASS_NAME}>Running now</p>
        <p className="text-sm">
          {describeRunning(
            snapshot.running,
            (id) => intents[id]?.label ?? "An intent",
          )}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={FIELD_LABEL_CLASS_NAME}>Sources</p>
        <ul aria-label="Sources" className="flex flex-col gap-1.5">
          {snapshot.sources.map(({ name, adapter, status }) => (
            <li key={name} className="flex flex-col text-sm">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{getSourceLabel(name)}</span>
                <Tag>{adapter.name}</Tag>
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                {describeSourceStatus(status)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

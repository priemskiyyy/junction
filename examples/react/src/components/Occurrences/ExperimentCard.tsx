import { CircleNotch, Play } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { EXPERIMENTS } from "example-shared/lab/constants/experiments";
import { getExperimentResult } from "example-shared/lab/getExperimentResult";
import type { ExperimentId } from "example-shared/lab/types/ExperimentId";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { ExperimentStat } from "src/components/Occurrences/ExperimentStat";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

type ExperimentCardProps = { id: ExperimentId };

export const ExperimentCard: React.FunctionComponent<ExperimentCardProps> = ({
  id,
}) => {
  const lab = useLab();
  const experiments = useObservable(lab.experiments);
  const busy = useObservable(lab.busy);
  const handOffs = useObservable(lab.device.handOffs);
  const timeline = useObservable(lab.timeline);
  const { title, action, description } = EXPERIMENTS[id];
  const ran = experiments[id];
  const running = busy === id;

  return (
    <section
      aria-label={title}
      className={clsx("flex flex-col gap-3 p-4", CARD_CLASS_NAME)}
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => lab.runExperiment(id)}
        className={clsx(
          buttonStyles({ variant: "primary", size: "small" }),
          "self-start",
        )}
      >
        {running ? (
          <CircleNotch
            aria-hidden="true"
            size={14}
            weight="bold"
            className="motion-safe:animate-spin"
          />
        ) : (
          <Play aria-hidden="true" size={14} weight="fill" />
        )}
        {action}
      </button>
      {ran === undefined ? null : (
        <ResultStats result={getExperimentResult(ran, handOffs, timeline)} />
      )}
    </section>
  );
};

type ResultStatsProps = {
  result: ReturnType<typeof getExperimentResult>;
};

const ResultStats: React.FunctionComponent<ResultStatsProps> = ({ result }) => (
  <div
    role="status"
    aria-label="Result"
    className="grid grid-cols-3 gap-2 motion-safe:animate-land"
  >
    <ExperimentStat label="handed over" value={result.deliveries} />
    <ExperimentStat label="intents" value={result.accepted} />
    <ExperimentStat label="duplicates" value={result.duplicates} />
  </div>
);

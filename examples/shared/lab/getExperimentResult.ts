import type { HandOff } from "example-shared/device/types/HandOff";
import { EXPERIMENTS } from "example-shared/lab/constants/experiments";
import type { Experiment } from "example-shared/lab/types/Experiment";
import type { TimelineEntry } from "example-shared/lab/types/TimelineEntry";

/** What an experiment counted: the entry points its SDK handed over, and the intents and duplicates Junction made of them. */
export const getExperimentResult = (
  experiment: Experiment,
  handOffs: HandOff[],
  timeline: TimelineEntry[],
) => {
  const { source } = EXPERIMENTS[experiment.id];

  const events = timeline.filter(
    (entry) =>
      entry.id > experiment.since && entry.source?.name === source.name,
  );

  return {
    deliveries: handOffs.filter(
      (handOff) =>
        handOff.id > experiment.since && handOff.source.name === source.name,
    ).length,
    accepted: events.filter(({ type }) => type === "intent accepted").length,
    duplicates: events.filter(({ type }) => type === "intent duplicate").length,
  };
};

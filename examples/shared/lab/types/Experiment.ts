import type { ExperimentId } from "example-shared/lab/types/ExperimentId";

/** An experiment the lab ran, counted from the timeline and the device log since it began. */
export type Experiment = {
  id: ExperimentId;
  since: number;
  state: "running" | "done";
};

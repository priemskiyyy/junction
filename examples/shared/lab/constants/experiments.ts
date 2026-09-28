import type { ExperimentId } from "example-shared/lab/types/ExperimentId";

/** Each occurrence experiment: what it does, and the property it shows. */
export const EXPERIMENTS: Record<
  ExperimentId,
  {
    title: string;
    action: string;
    description: string;
    source: { name: string };
  }
> = {
  "tap-twice": {
    title: "One link, tapped twice",
    action: "Tap Brand brief twice",
    description:
      "Two taps on the same link are two occurrences. Equal URLs are not the same interaction, so Junction admits two intents.",
    source: { name: "links" },
  },
  "delivered-twice": {
    title: "One press, delivered twice",
    action: "Launch from a press delivered twice",
    description:
      "The platform hands one notification press to both the launch read and the listener. Its notification and action ids are one occurrence, so the second is a duplicate.",
    source: { name: "notifications" },
  },
};

import type { Knob } from "example-shared/lab/types/Knob";
import type {
  ActionKnobId,
  SwitchKnobId,
} from "example-shared/lab/types/KnobId";

/** The lab's switches, in the order the panel lists them. */
export const SWITCH_KNOBS: Knob<SwitchKnobId>[] = [
  {
    id: "slow",
    label: "Slow documents",
    description:
      "Folio's document service takes 3.5 seconds, so a handler holds the one execution slot long enough to switch accounts under it.",
  },
  {
    id: "offline",
    label: "Documents offline",
    description:
      "The document service fails. Handlers answer retry, so an intent runs again two seconds later, until it succeeds or uses its three attempts and fails.",
  },
  {
    id: "failing-writes",
    label: "Storage writes fail",
    description:
      "The device's storage rejects every write. A persistent intent never runs on a lease storage did not confirm.",
  },
  {
    id: "race",
    label: "Deliver a launch press twice",
    description:
      "The platform hands the press that launched Folio to its listener as well as its launch read, as expo-notifications can.",
  },
];

/** The lab's actions, in the order the panel lists them. */
export const ACTION_KNOBS: Knob<ActionKnobId>[] = [
  {
    id: "restart",
    label: "Restart Folio",
    description:
      "Quit and launch again. Persistent intents come back from storage; one that was running comes back interrupted.",
  },
  {
    id: "corrupt",
    label: "Corrupt the saved inbox",
    description:
      "Scramble the saved inbox and restart. Junction blocks storage rather than call it empty.",
  },
  {
    id: "skip-ahead",
    label: "Skip ahead 11 minutes",
    description:
      "Move Junction's clock past every waiting intent's ten-minute deadline.",
  },
];

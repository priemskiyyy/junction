import { ArrowsClockwise, FastForward, Skull } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import type { ActionKnobId } from "example-shared/lab/types/KnobId";

/** Each lab action's icon in the panel. */
export const ACTION_ICONS: Record<ActionKnobId, Icon> = {
  restart: ArrowsClockwise,
  corrupt: Skull,
  "skip-ahead": FastForward,
};

import clsx from "clsx";
import type React from "react";
import { useId } from "react";

import type { Knob } from "example-shared/lab/types/Knob";
import type { SwitchKnobId } from "example-shared/lab/types/KnobId";
import {
  switchThumbStyles,
  switchTrackStyles,
} from "example-shared/ui/styles/switchStyles";

type KnobSwitchProps = {
  knob: Knob<SwitchKnobId>;
  on: boolean;
  onChange: (on: boolean) => void;
};

export const KnobSwitch: React.FunctionComponent<KnobSwitchProps> = ({
  knob,
  on,
  onChange,
}) => {
  const descriptionId = useId();

  return (
    <li
      className={clsx(
        "flex flex-col gap-2 rounded-xl border p-3 transition-colors",
        on
          ? "border-violet-300 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-950/30"
          : "border-zinc-200 dark:border-zinc-800",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-describedby={descriptionId}
        onClick={() => onChange(!on)}
        className="flex items-center gap-3 rounded-lg text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      >
        <span aria-hidden="true" className={switchTrackStyles({ on })}>
          <span className={switchThumbStyles({ on })} />
        </span>
        {knob.label}
      </button>
      <p
        id={descriptionId}
        className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
      >
        {knob.description}
      </p>
    </li>
  );
};

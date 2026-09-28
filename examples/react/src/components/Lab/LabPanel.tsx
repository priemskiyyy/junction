import { Flask } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { ACTION_KNOBS, SWITCH_KNOBS } from "example-shared/lab/constants/knobs";
import type {
  ActionKnobId,
  SwitchKnobId,
} from "example-shared/lab/types/KnobId";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { PanelHeading } from "src/components/Common/PanelHeading";
import { KnobAction } from "src/components/Lab/KnobAction";
import { KnobSwitch } from "src/components/Lab/KnobSwitch";
import { StorageCard } from "src/components/Lab/StorageCard";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { ACTION_ICONS } from "src/utils/constants/icons";

export const LabPanel: React.FunctionComponent = () => {
  const lab = useLab();
  const world = useObservable(lab.world.state);
  const device = useObservable(lab.device.state);
  const storage = useObservable(lab.storage.state);
  const busy = useObservable(lab.busy);
  const notices = useObservable(lab.notices);

  const switches = {
    slow: { on: world.slow, set: lab.setSlow },
    offline: { on: world.offline, set: lab.setOffline },
    "failing-writes": { on: storage.failing, set: lab.setFailingWrites },
    race: { on: device.race, set: lab.setRace },
  } satisfies Record<SwitchKnobId, { on: boolean; set: (on: boolean) => void }>;

  const actions = {
    restart: lab.restart,
    corrupt: lab.corruptStorage,
    "skip-ahead": lab.skipAhead,
  } satisfies Record<ActionKnobId, () => Promise<void>>;

  return (
    <section
      aria-labelledby="lab-panel-title"
      className={clsx("flex min-w-0 flex-col gap-4 p-4", CARD_CLASS_NAME)}
    >
      <PanelHeading
        id="lab-panel-title"
        icon={Flask}
        title="Break Folio's world"
        shows="Each switch is something a real service, device or SDK does. What Junction does about it lands in the timeline."
      />
      <ul aria-label="Switches" className="grid gap-3 sm:grid-cols-2">
        {SWITCH_KNOBS.map((knob) => (
          <KnobSwitch
            key={knob.id}
            knob={knob}
            on={switches[knob.id].on}
            onChange={switches[knob.id].set}
          />
        ))}
      </ul>
      <ul aria-label="Actions" className="flex flex-col gap-3">
        {ACTION_KNOBS.map((knob) => (
          <KnobAction
            key={knob.id}
            knob={knob}
            icon={ACTION_ICONS[knob.id]}
            running={busy === knob.id}
            blocked={busy !== null}
            notice={notices.find((notice) => notice.knob === knob.id)}
            onPress={() => actions[knob.id]()}
            onDismissNotice={lab.dismissNotice}
          />
        ))}
      </ul>
      <StorageCard />
    </section>
  );
};

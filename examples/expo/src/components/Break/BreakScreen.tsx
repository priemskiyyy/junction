import type { Icon } from "phosphor-react-native";
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  Eraser,
  FastForward,
} from "phosphor-react-native";
import type React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ACTION_KNOBS, SWITCH_KNOBS } from "example-shared/lab/constants/knobs";
import type {
  ActionKnobId,
  SwitchKnobId,
} from "example-shared/lab/types/KnobId";
import { Button } from "src/components/Common/Button";
import { SectionTitle } from "src/components/Common/SectionTitle";
import { ActionRow } from "src/components/Break/ActionRow";
import { SwitchRow } from "src/components/Break/SwitchRow";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { COLORS } from "src/utils/constants/colors";
import { TOAST_SPACE } from "src/utils/constants/layout";

const ACTION_ICONS = {
  restart: ArrowsClockwise,
  corrupt: Eraser,
  "skip-ahead": FastForward,
} satisfies Record<ActionKnobId, Icon>;

export const BreakScreen: React.FunctionComponent = () => {
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
    <ScrollView contentContainerStyle={styles.list}>
      <SectionTitle
        title="Break Folio's world"
        hint="Each switch is something a real service, device or SDK does. Flip one, then send Folio something."
      />
      <View style={styles.group}>
        {SWITCH_KNOBS.map((knob, index) => (
          <View key={knob.id} style={index > 0 ? styles.separated : null}>
            <SwitchRow
              knob={knob}
              on={switches[knob.id].on}
              onChange={switches[knob.id].set}
            />
          </View>
        ))}
      </View>
      <SectionTitle
        title="Do something drastic"
        hint="Each one shows the guarantee Junction keeps when it happens."
      />
      <View style={styles.group}>
        {ACTION_KNOBS.map((knob, index) => (
          <View key={knob.id} style={index > 0 ? styles.separated : null}>
            <ActionRow
              knob={knob}
              icon={ACTION_ICONS[knob.id]}
              notice={notices.find(({ knob: id }) => id === knob.id) ?? null}
              disabled={busy !== null}
              onPress={() => actions[knob.id]()}
              onDismiss={(notice) => lab.dismissNotice(notice.id)}
            />
          </View>
        ))}
      </View>
      <Button
        label="Reset the lab"
        variant="danger"
        icon={ArrowCounterClockwise}
        disabled={busy !== null}
        onPress={() => lab.reset()}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: TOAST_SPACE,
  },
  group: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    boxShadow:
      "0 1px 2px rgba(24, 24, 27, 0.06), 0 6px 20px rgba(24, 24, 27, 0.05)",
  },
  separated: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
});

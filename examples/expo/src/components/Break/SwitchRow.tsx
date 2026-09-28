import type React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import type { Knob } from "example-shared/lab/types/Knob";
import type { SwitchKnobId } from "example-shared/lab/types/KnobId";
import { COLORS } from "src/utils/constants/colors";

type SwitchRowProps = {
  knob: Knob<SwitchKnobId>;
  on: boolean;
  onChange: (on: boolean) => void;
};

export const SwitchRow: React.FunctionComponent<SwitchRowProps> = ({
  knob,
  on,
  onChange,
}) => (
  <View style={styles.row}>
    <View style={styles.texts}>
      <Text style={styles.label}>{knob.label}</Text>
      <Text style={styles.description}>{knob.description}</Text>
    </View>
    <Switch
      aria-label={knob.label}
      value={on}
      onValueChange={onChange}
      trackColor={{ true: COLORS.accent, false: COLORS.border }}
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  texts: { flex: 1, gap: 3 },
  label: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  description: { fontSize: 13, lineHeight: 18, color: COLORS.subtle },
});

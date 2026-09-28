import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Tone } from "example-shared/types/Tone";
import { TONE_COLORS } from "src/utils/constants/colors";

type PillProps = { label: string; tone: Tone };

export const Pill: React.FunctionComponent<PillProps> = ({ label, tone }) => (
  <View style={[styles.pill, { backgroundColor: TONE_COLORS[tone].soft }]}>
    <View style={[styles.dot, { backgroundColor: TONE_COLORS[tone].strong }]} />
    <Text style={[styles.label, { color: TONE_COLORS[tone].ink }]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: "600" },
});

import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Tone } from "example-shared/types/Tone";
import { TONE_COLORS } from "src/utils/constants/colors";

type MonogramProps = { text: string; tone: Tone };

export const Monogram: React.FunctionComponent<MonogramProps> = ({
  text,
  tone,
}) => (
  <View
    aria-hidden
    style={[styles.monogram, { backgroundColor: TONE_COLORS[tone].soft }]}
  >
    <Text style={[styles.text, { color: TONE_COLORS[tone].ink }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  monogram: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
});

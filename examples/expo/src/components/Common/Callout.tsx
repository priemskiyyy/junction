import { X } from "phosphor-react-native";
import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Tone } from "example-shared/types/Tone";
import { TONE_COLORS } from "src/utils/constants/colors";

type CalloutProps = { tone: Tone; text: string; onDismiss?: () => void };

export const Callout: React.FunctionComponent<CalloutProps> = ({
  tone,
  text,
  onDismiss,
}) => (
  <View
    accessibilityRole="alert"
    style={[styles.callout, { backgroundColor: TONE_COLORS[tone].soft }]}
  >
    <View style={[styles.bar, { backgroundColor: TONE_COLORS[tone].strong }]} />
    <Text style={[styles.text, { color: TONE_COLORS[tone].ink }]}>{text}</Text>
    {onDismiss === undefined ? null : (
      <Pressable
        accessibilityRole="button"
        aria-label="Dismiss"
        hitSlop={10}
        onPress={onDismiss}
      >
        <X size={14} color={TONE_COLORS[tone].ink} weight="bold" />
      </Pressable>
    )}
  </View>
);

const styles = StyleSheet.create({
  callout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  bar: { width: 3, alignSelf: "stretch", borderRadius: 2 },
  text: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "500" },
});

import type React from "react";
import { useEffect, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";

import { describeLabeledLine } from "example-shared/formatting/describeLabeledLine";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { COLORS, TONE_COLORS } from "src/utils/constants/colors";
import { TOAST_TYPES } from "src/utils/constants/toast";

type AnswerToastProps = { bottom: number };

const NATIVE_DRIVER = Platform.OS !== "web";

export const AnswerToast: React.FunctionComponent<AnswerToastProps> = ({
  bottom,
}) => {
  const lab = useLab();
  const timeline = useObservable(lab.timeline);
  const intents = useObservable(lab.intents);
  const [shown] = useState(() => new Animated.Value(0));

  const answer =
    timeline.find(({ type }) => type !== null && TOAST_TYPES.includes(type)) ??
    null;

  const id = answer?.id ?? null;

  useEffect(() => {
    if (id === null) {
      return;
    }

    const animation = Animated.sequence([
      Animated.timing(shown, {
        toValue: 1,
        duration: 160,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.delay(3_600),
      Animated.timing(shown, {
        toValue: 0,
        duration: 260,
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]);

    animation.start();

    return () => animation.stop();
  }, [id, shown]);

  if (answer === null) {
    return null;
  }

  const label =
    answer.intent === null ? null : (intents[answer.intent.id]?.label ?? null);

  return (
    <Animated.View
      aria-live="polite"
      style={[
        styles.toast,
        {
          bottom,
          opacity: shown,
          transform: [
            {
              translateY: shown.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          { backgroundColor: TONE_COLORS[answer.tone].strong },
        ]}
      />
      <View style={styles.texts}>
        <Text style={styles.heading}>Junction&apos;s answer</Text>
        <Text style={styles.text}>
          {describeLabeledLine(answer.line, label)}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: COLORS.text,
    pointerEvents: "none",
    boxShadow: "0 10px 30px rgba(24, 24, 27, 0.25)",
  },
  bar: { width: 4, borderRadius: 2 },
  texts: { flex: 1, gap: 2 },
  heading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: COLORS.faint,
  },
  text: { fontSize: 14, lineHeight: 19, fontWeight: "500", color: "#fafafa" },
});

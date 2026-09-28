import type React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Pill } from "src/components/Common/Pill";
import { useRuntime } from "src/hooks/useRuntime";
import { COLORS } from "src/utils/constants/colors";

export const AppHeader: React.FunctionComponent = () => {
  const insets = useSafeAreaInsets();
  const runtime = useRuntime();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.texts}>
        <Text accessibilityRole="header" style={styles.title}>
          Intent Lab
        </Text>
        <Text style={styles.subtitle}>Folio, over real Junction adapters</Text>
      </View>
      <Pill label={`Launch ${runtime.number}`} tone="accent" />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  texts: { flex: 1, gap: 1 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: COLORS.text,
  },
  subtitle: { fontSize: 14, color: COLORS.subtle },
});

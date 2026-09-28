import type React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { COLORS } from "src/utils/constants/colors";

export const RestoringScreen: React.FunctionComponent = () => (
  <View accessibilityRole="progressbar" style={styles.screen}>
    <ActivityIndicator color={COLORS.accent} />
    <Text style={styles.text}>Restoring who is signed in</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  text: { fontSize: 14, fontWeight: "500", color: COLORS.accent },
});

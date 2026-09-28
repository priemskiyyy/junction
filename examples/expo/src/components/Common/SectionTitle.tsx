import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "src/utils/constants/colors";

type SectionTitleProps = { title: string; hint: string };

export const SectionTitle: React.FunctionComponent<SectionTitleProps> = ({
  title,
  hint,
}) => (
  <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.title}>
      {title}
    </Text>
    <Text style={styles.hint}>{hint}</Text>
  </View>
);

const styles = StyleSheet.create({
  section: { flexDirection: "column", gap: 3, paddingHorizontal: 4 },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  hint: { fontSize: 14, lineHeight: 19, color: COLORS.subtle },
});

import type { Icon } from "phosphor-react-native";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "src/utils/constants/colors";

type EmptyStateProps = { icon: Icon; title: string; body: string };

export const EmptyState: React.FunctionComponent<EmptyStateProps> = ({
  icon: EmptyIcon,
  title,
  body,
}) => (
  <View style={styles.empty}>
    <View style={styles.icon}>
      <EmptyIcon size={28} color={COLORS.accent} weight="duotone" />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.body}>{body}</Text>
  </View>
);

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentSoft,
  },
  title: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.subtle,
    textAlign: "center",
  },
});

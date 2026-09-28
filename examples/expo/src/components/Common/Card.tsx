import type { Icon } from "phosphor-react-native";
import type React from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Tone } from "example-shared/types/Tone";
import { Pill } from "src/components/Common/Pill";
import { COLORS } from "src/utils/constants/colors";

type CardProps = {
  title: string;
  icon: Icon;
  badge: { label: string; tone: Tone };
  hint: string;
  children: ReactNode;
};

export const Card: React.FunctionComponent<CardProps> = ({
  title,
  icon: CardIcon,
  badge,
  hint,
  children,
}) => (
  <View aria-label={title} style={styles.card}>
    <View style={styles.heading}>
      <View style={styles.icon}>
        <CardIcon size={18} color={COLORS.accent} weight="duotone" />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Pill label={badge.label} tone={badge.tone} />
    </View>
    <Text style={styles.hint}>{hint}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "column",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    boxShadow:
      "0 1px 2px rgba(24, 24, 27, 0.06), 0 6px 20px rgba(24, 24, 27, 0.05)",
  },
  heading: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentSoft,
  },
  title: { flex: 1, fontSize: 17, fontWeight: "700", color: COLORS.text },
  hint: { fontSize: 14, lineHeight: 19, color: COLORS.muted },
});

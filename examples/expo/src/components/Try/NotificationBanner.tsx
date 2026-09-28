import { Signpost } from "phosphor-react-native";
import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DEFAULT_ACTION_ID } from "example-shared/device/constants/notifications";
import type { NotificationPreset } from "example-shared/device/types/NotificationPreset";
import { Button } from "src/components/Common/Button";
import { useLab } from "src/hooks/useLab";
import { COLORS } from "src/utils/constants/colors";

type NotificationBannerProps = { preset: NotificationPreset };

export const NotificationBanner: React.FunctionComponent<
  NotificationBannerProps
> = ({ preset }) => {
  const lab = useLab();
  const actions = preset.actions.filter(({ id }) => id !== DEFAULT_ACTION_ID);

  return (
    <View style={styles.notification}>
      <Pressable
        accessibilityRole="button"
        aria-label={`Open the notification: ${preset.title}`}
        onPress={() => lab.pressNotification(preset, DEFAULT_ACTION_ID)}
        style={({ pressed }) => [
          styles.banner,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.header}>
          <View aria-hidden style={styles.appIcon}>
            <Signpost size={12} color={COLORS.onAccent} weight="bold" />
          </View>
          <Text style={styles.app}>FOLIO</Text>
          <Text style={styles.time}>now</Text>
        </View>
        <Text style={styles.title}>{preset.title}</Text>
        <Text numberOfLines={2} style={styles.body}>
          {preset.body}
        </Text>
      </Pressable>
      <View style={styles.actions}>
        <Text style={styles.or}>Or its action:</Text>
        {actions.map((action) => (
          <Button
            key={action.id}
            label={action.label}
            variant="secondary"
            size="sm"
            onPress={() => lab.pressNotification(preset, action.id)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  notification: { gap: 8 },
  banner: {
    gap: 3,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#f4f4f5",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  pressed: { backgroundColor: COLORS.accentSoft },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  appIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
  },
  app: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: COLORS.subtle,
  },
  time: { fontSize: 12, color: COLORS.faint },
  title: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  body: { fontSize: 14, lineHeight: 19, color: COLORS.muted },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 4,
  },
  or: { fontSize: 12, color: COLORS.faint },
});

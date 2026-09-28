import type { Icon } from "phosphor-react-native";
import type React from "react";
import type { ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text } from "react-native";

import { COLORS } from "src/utils/constants/colors";

type ButtonProps = {
  label: string;
  variant: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  icon?: Icon;
  disabled?: boolean;
  onPress: () => void;
};

const VARIANTS = {
  primary: {
    rest: { backgroundColor: COLORS.accent },
    pressed: { backgroundColor: COLORS.accentPressed },
    ink: COLORS.onAccent,
  },
  secondary: {
    rest: {
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    pressed: { backgroundColor: COLORS.sunken },
    ink: COLORS.text,
  },
  ghost: {
    rest: { backgroundColor: "transparent" },
    pressed: { backgroundColor: COLORS.accentSoft },
    ink: COLORS.accent,
  },
  danger: {
    rest: {
      backgroundColor: "#fff1f2",
      borderWidth: 1,
      borderColor: "#fecdd3",
    },
    pressed: { backgroundColor: "#ffe4e6" },
    ink: "#be123c",
  },
} satisfies Record<
  ButtonProps["variant"],
  { rest: ViewStyle; pressed: ViewStyle; ink: string }
>;

const SIZES = {
  md: {
    container: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 12,
      gap: 8,
    },
    label: 15,
    icon: 18,
  },
  sm: {
    container: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      gap: 6,
    },
    label: 13,
    icon: 15,
  },
} satisfies Record<
  NonNullable<ButtonProps["size"]>,
  { container: ViewStyle; label: number; icon: number }
>;

export const Button: React.FunctionComponent<ButtonProps> = ({
  label,
  variant,
  size = "md",
  icon: ButtonIcon,
  disabled = false,
  onPress,
}) => {
  const { rest, pressed, ink } = VARIANTS[variant];
  const { container, label: fontSize, icon: iconSize } = SIZES[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      aria-label={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed: isPressed }) => [
        styles.button,
        container,
        rest,
        isPressed ? pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {ButtonIcon === undefined ? null : (
        <ButtonIcon size={iconSize} color={ink} weight="bold" />
      )}
      <Text style={[styles.label, { fontSize, color: ink }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontWeight: "600" },
  disabled: { opacity: 0.45 },
});

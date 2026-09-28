import { Signpost } from "phosphor-react-native";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "src/utils/constants/colors";

type FolioMarkProps = { size: "sm" | "lg" };

const SIZES = {
  sm: { tile: 24, radius: 7, icon: 15, label: 16 },
  lg: { tile: 64, radius: 18, icon: 36, label: 24 },
} satisfies Record<
  FolioMarkProps["size"],
  { tile: number; radius: number; icon: number; label: number }
>;

export const FolioMark: React.FunctionComponent<FolioMarkProps> = ({
  size,
}) => {
  const { tile, radius, icon, label } = SIZES[size];

  return (
    <View style={[styles.mark, size === "lg" ? styles.stacked : null]}>
      <View
        aria-hidden
        style={[
          styles.tile,
          { width: tile, height: tile, borderRadius: radius },
        ]}
      >
        <Signpost size={icon} color={COLORS.onAccent} weight="duotone" />
      </View>
      <Text style={[styles.label, { fontSize: label }]}>Folio</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  mark: { flexDirection: "row", alignItems: "center", gap: 8 },
  stacked: { flexDirection: "column", gap: 10 },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
  },
  label: { fontWeight: "700", letterSpacing: -0.3, color: COLORS.text },
});

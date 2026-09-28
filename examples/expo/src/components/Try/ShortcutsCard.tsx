import type { Icon } from "phosphor-react-native";
import {
  FilePlus,
  Lightning,
  MagnifyingGlass,
  Notepad,
  SquaresFour,
} from "phosphor-react-native";
import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SHORTCUTS } from "example-shared/device/constants/shortcuts";
import { Card } from "src/components/Common/Card";
import { useLab } from "src/hooks/useLab";
import { COLORS } from "src/utils/constants/colors";

const SHORTCUT_ICONS: Record<string, Icon> = {
  "new-document": FilePlus,
  "meeting-notes": Notepad,
  search: MagnifyingGlass,
};

export const ShortcutsCard: React.FunctionComponent = () => {
  const lab = useLab();

  return (
    <Card
      title="Home screen shortcuts"
      icon={SquaresFour}
      badge={{ label: "Simulated", tone: "neutral" }}
      hint="What holding Folio's icon offers, reported as expo-quick-actions does. Search is one Folio never routes."
    >
      <View accessibilityRole="menu" style={styles.menu}>
        {SHORTCUTS.map((shortcut, index) => {
          const ShortcutIcon = SHORTCUT_ICONS[shortcut.action.id] ?? Lightning;

          return (
            <Pressable
              key={shortcut.action.id}
              accessibilityRole="menuitem"
              aria-label={shortcut.title}
              onPress={() => lab.chooseShortcut(shortcut)}
              style={({ pressed }) => [
                styles.item,
                index > 0 ? styles.separated : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.title}>{shortcut.title}</Text>
              <ShortcutIcon size={18} color={COLORS.text} weight="regular" />
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  menu: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: COLORS.sunken,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  separated: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d4d4d8",
  },
  pressed: { backgroundColor: COLORS.accentSoft },
  title: { fontSize: 15, color: COLORS.text },
});

import { useInbox } from "@priemskiyyy/junction-react";
import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { TabId } from "src/types/TabId";
import { COLORS } from "src/utils/constants/colors";
import { TAB_BAR_HEIGHT } from "src/utils/constants/layout";
import { TABS } from "src/utils/constants/tabs";

type TabBarProps = { tab: TabId; onChange: (tab: TabId) => void };

export const TabBar: React.FunctionComponent<TabBarProps> = ({
  tab,
  onChange,
}) => {
  const insets = useSafeAreaInsets();
  const inbox = useInbox();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      {TABS.map(({ id, label, icon: TabIcon }) => {
        const selected = id === tab;
        const color = selected ? COLORS.accent : COLORS.faint;

        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            aria-label={label}
            onPress={() => onChange(id)}
            style={styles.tab}
          >
            <View>
              <TabIcon
                size={24}
                color={color}
                weight={selected ? "fill" : "regular"}
              />
              {id === "inbox" && inbox.length > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.count}>{inbox.length}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: TAB_BAR_HEIGHT - 8,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e11d48",
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  count: { fontSize: 10, fontWeight: "800", color: COLORS.onAccent },
  label: { fontSize: 11, fontWeight: "600" },
});

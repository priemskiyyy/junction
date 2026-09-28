import type React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { SectionTitle } from "src/components/Common/SectionTitle";
import { FolioScreen } from "src/components/Folio/FolioScreen";
import { InviteCard } from "src/components/Try/InviteCard";
import { LinksCard } from "src/components/Try/LinksCard";
import { NotificationsCard } from "src/components/Try/NotificationsCard";
import { ShortcutsCard } from "src/components/Try/ShortcutsCard";
import { TOAST_SPACE } from "src/utils/constants/layout";

export const TryScreen: React.FunctionComponent = () => (
  <View style={styles.screen}>
    <View style={styles.folio}>
      <FolioScreen />
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
      <SectionTitle
        title="Send Folio something"
        hint="Every entry point below reaches Folio through a real Junction adapter. Watch Folio above."
      />
      <LinksCard />
      <NotificationsCard />
      <ShortcutsCard />
      <InviteCard />
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  folio: {
    flexGrow: 10,
    flexBasis: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  scroll: { flexGrow: 11, flexBasis: 0 },
  list: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: TOAST_SPACE,
  },
});

import { ArrowUpRight, LinkSimple } from "phosphor-react-native";
import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "src/components/Common/Card";
import { useLab } from "src/hooks/useLab";
import { COLORS } from "src/utils/constants/colors";
import { MONOSPACE } from "src/utils/constants/fonts";
import { APP_LINKS, LINKS_ROUTE } from "src/utils/constants/links";

export const LinksCard: React.FunctionComponent = () => {
  const lab = useLab();

  return (
    <Card
      title="Links"
      icon={LinkSimple}
      badge={LINKS_ROUTE.badge}
      hint={LINKS_ROUTE.hint}
    >
      <View style={styles.list}>
        {APP_LINKS.map(({ label, url }) => (
          <Pressable
            key={url}
            accessibilityRole="link"
            aria-label={`Open ${label}`}
            onPress={() => lab.openLink(url)}
            style={({ pressed }) => [
              styles.link,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.texts}>
              <Text style={styles.title}>{label}</Text>
              <Text numberOfLines={1} style={styles.url}>
                {url}
              </Text>
            </View>
            <ArrowUpRight size={16} color={COLORS.accent} weight="bold" />
          </Pressable>
        ))}
      </View>
      <Text style={styles.footnote}>
        Expo Go and development builds launch the app with a URL of their own.
        No Folio route takes it, so Junction ignores it.
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  list: { gap: 6 },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.sunken,
  },
  pressed: { backgroundColor: COLORS.accentSoft },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  url: { fontSize: 12, fontFamily: MONOSPACE, color: COLORS.accentInk },
  footnote: { fontSize: 12, lineHeight: 17, color: COLORS.faint },
});

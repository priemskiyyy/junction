import { CaretRight } from "phosphor-react-native";
import type React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PEOPLE, PERSON_IDS } from "example-shared/folio/constants/people";
import { PersonMonogram } from "src/components/Folio/PersonMonogram";
import { useRuntime } from "src/hooks/useRuntime";
import { COLORS } from "src/utils/constants/colors";

export const SignInScreen: React.FunctionComponent = () => {
  const { app } = useRuntime();

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        Sign in to Folio
      </Text>
      <Text style={styles.hint}>
        Anything that opened Folio meanwhile waits in Junction&apos;s inbox for
        someone to sign in.
      </Text>
      <View style={styles.people}>
        {PERSON_IDS.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            aria-label={`Continue as ${PEOPLE[id].firstName}`}
            onPress={() => app.signIn(id)}
            style={({ pressed }) => [
              styles.person,
              pressed ? styles.pressed : null,
            ]}
          >
            <PersonMonogram id={id} />
            <View style={styles.texts}>
              <Text style={styles.name}>{PEOPLE[id].name}</Text>
              <Text style={styles.role}>{PEOPLE[id].role}</Text>
            </View>
            <CaretRight size={16} color={COLORS.faint} weight="bold" />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flexGrow: 1, gap: 8, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  hint: { fontSize: 14, lineHeight: 19, color: COLORS.subtle },
  people: { gap: 8, marginTop: 8 },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.sunken,
  },
  pressed: { backgroundColor: COLORS.accentSoft },
  texts: { flex: 1, gap: 1 },
  name: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  role: { fontSize: 13, color: COLORS.subtle },
});

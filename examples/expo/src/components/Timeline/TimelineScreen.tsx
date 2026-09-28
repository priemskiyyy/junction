import { Rows } from "phosphor-react-native";
import type React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "src/components/Common/EmptyState";
import { SectionTitle } from "src/components/Common/SectionTitle";
import { TimelineRow } from "src/components/Timeline/TimelineRow";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { COLORS } from "src/utils/constants/colors";
import { TOAST_SPACE } from "src/utils/constants/layout";

const LINES = 60;

export const TimelineScreen: React.FunctionComponent = () => {
  const lab = useLab();
  const timeline = useObservable(lab.timeline);
  const intents = useObservable(lab.intents);
  const lines = timeline.slice(0, LINES);

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <SectionTitle
        title="Timeline"
        hint="junction.diagnostics.events, newest first, beside what the lab did to the device."
      />
      {lines.length === 0 ? (
        <EmptyState
          icon={Rows}
          title="Nothing happened yet"
          body="Open Folio or send it something, and every step Junction takes lands here."
        />
      ) : (
        <View style={styles.card}>
          {lines.map((entry, index) => {
            const label =
              entry.intent === null
                ? null
                : (intents[entry.intent.id]?.label ?? null);

            const launchStarts =
              lines[index - 1]?.launch.number !== entry.launch.number;

            return (
              <View key={entry.id}>
                {launchStarts ? (
                  <Text style={styles.launch}>
                    Launch {entry.launch.number}
                  </Text>
                ) : null}
                <TimelineRow entry={entry} label={label} />
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: TOAST_SPACE,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    boxShadow:
      "0 1px 2px rgba(24, 24, 27, 0.06), 0 6px 20px rgba(24, 24, 27, 0.05)",
  },
  launch: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: COLORS.accent,
  },
});

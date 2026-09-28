import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { describeLabeledLine } from "example-shared/formatting/describeLabeledLine";
import { formatClockTime } from "example-shared/formatting/formatClockTime";
import type { TimelineEntry } from "example-shared/lab/types/TimelineEntry";
import { EVENT_LABELS } from "example-shared/ui/constants/eventLabels";
import { COLORS, TONE_COLORS } from "src/utils/constants/colors";
import { MONOSPACE } from "src/utils/constants/fonts";

type TimelineRowProps = { entry: TimelineEntry; label: string | null };

export const TimelineRow: React.FunctionComponent<TimelineRowProps> = ({
  entry,
  label,
}) => (
  <View style={styles.row}>
    <View
      style={[styles.dot, { backgroundColor: TONE_COLORS[entry.tone].strong }]}
    />
    <View style={styles.texts}>
      <Text style={styles.line}>{describeLabeledLine(entry.line, label)}</Text>
      <Text style={styles.meta}>
        {entry.type === null ? "Device" : EVENT_LABELS[entry.type]} ·{" "}
        {formatClockTime(entry.timestamp)}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  texts: { flex: 1, gap: 3 },
  line: { fontSize: 14, lineHeight: 19, color: COLORS.text },
  meta: { fontSize: 11, fontFamily: MONOSPACE, color: COLORS.faint },
});

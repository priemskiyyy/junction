import type { RecoveryResult } from "@priemskiyyy/junction";
import { useJunction } from "@priemskiyyy/junction-react";
import { ArrowClockwise, X } from "phosphor-react-native";
import type React from "react";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { match } from "ts-pattern";

import { ERROR_WORDS } from "example-shared/formatting/constants/errorWords";
import { RECOVERY_WORDS } from "example-shared/formatting/constants/recoveryWords";
import { describeBinding } from "example-shared/formatting/describeBinding";
import { describeEntryState } from "example-shared/formatting/describeEntryState";
import { describeIntent } from "example-shared/formatting/describeIntent";
import { describeProvenance } from "example-shared/formatting/describeProvenance";
import { describeWaiting } from "example-shared/formatting/describeWaiting";
import { isRetryable } from "example-shared/junction/isRetryable";
import type { FolioInboxEntry } from "example-shared/junction/types/FolioInboxEntry";
import { ENTRY_TONES } from "example-shared/ui/constants/tones";
import { Button } from "src/components/Common/Button";
import { Pill } from "src/components/Common/Pill";
import { useLab } from "src/hooks/useLab";
import { COLORS, TONE_COLORS } from "src/utils/constants/colors";

type InboxEntryCardProps = { entry: FolioInboxEntry; now: number };

export const InboxEntryCard: React.FunctionComponent<InboxEntryCardProps> = ({
  entry,
  now,
}) => {
  const lab = useLab();
  const junction = useJunction();
  const [answer, setAnswer] = useState<RecoveryResult | null>(null);
  const tone = ENTRY_TONES[entry.state];

  const handleRetryPress = async () => {
    setAnswer(await junction.retry(entry.id, { after: 0 }));
  };

  const handleCancelPress = async () => {
    setAnswer(await junction.cancel(entry.id));
  };

  return (
    <View style={styles.card}>
      <View
        style={[styles.bar, { backgroundColor: TONE_COLORS[tone].strong }]}
      />
      <View style={styles.content}>
        <Text style={styles.title}>{describeIntent(entry, lab.getTitle)}</Text>
        <Pill label={describeEntryState(entry, now)} tone={tone} />
        <Text style={styles.detail}>
          {match(entry)
            .with({ state: "pending" }, (pending) => describeWaiting(pending))
            .with(
              { state: "leased" },
              ({ binding }) => `Runs for ${describeBinding(binding)}.`,
            )
            .with(
              { state: "retry-scheduled" },
              () => "Its handler asked to try again.",
            )
            .with(
              { state: "failed" },
              { state: "interrupted" },
              ({ error }) => `Since ${ERROR_WORDS[error.code]}.`,
            )
            .exhaustive()}
        </Text>
        <Text style={styles.meta}>
          {[
            ...describeProvenance(entry.provenance),
            `${entry.attempts} attempts`,
          ].join(" · ")}
        </Text>
        <View style={styles.actions}>
          {isRetryable(entry) ? (
            <Button
              label="Retry"
              variant="primary"
              size="sm"
              icon={ArrowClockwise}
              onPress={handleRetryPress}
            />
          ) : null}
          <Button
            label="Cancel"
            variant="secondary"
            size="sm"
            icon={X}
            onPress={handleCancelPress}
          />
        </View>
        {answer?.status === "refused" ? (
          <Text accessibilityRole="alert" style={styles.refused}>
            Junction refused: {RECOVERY_WORDS[answer.reason]}.
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
    boxShadow:
      "0 1px 2px rgba(24, 24, 27, 0.06), 0 6px 20px rgba(24, 24, 27, 0.05)",
  },
  bar: { width: 4 },
  content: { flex: 1, gap: 8, padding: 14 },
  title: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  detail: { fontSize: 14, lineHeight: 19, color: COLORS.muted },
  meta: { fontSize: 12, color: COLORS.faint },
  actions: { flexDirection: "row", gap: 8, marginTop: 2 },
  refused: { fontSize: 12, color: TONE_COLORS.danger.ink },
});

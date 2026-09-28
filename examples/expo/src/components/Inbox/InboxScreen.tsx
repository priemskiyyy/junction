import { useInbox } from "@priemskiyyy/junction-react";
import { Tray } from "phosphor-react-native";
import type React from "react";
import { ScrollView, StyleSheet } from "react-native";

import { EmptyState } from "src/components/Common/EmptyState";
import { SectionTitle } from "src/components/Common/SectionTitle";
import { InboxEntryCard } from "src/components/Inbox/InboxEntryCard";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { TOAST_SPACE } from "src/utils/constants/layout";

export const InboxScreen: React.FunctionComponent = () => {
  const lab = useLab();
  const inbox = useInbox();
  const now = useObservable(lab.ticker);

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <SectionTitle
        title="Junction's inbox"
        hint="useInbox(): every intent that has not ended yet, and why it waits."
      />
      {inbox.length === 0 ? (
        <EmptyState
          icon={Tray}
          title="Nothing waits"
          body="Everything that arrived has run or ended. Sign out, then open a mention, to see one wait."
        />
      ) : null}
      {inbox.map((entry) => (
        <InboxEntryCard key={entry.id} entry={entry} now={now} />
      ))}
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
});

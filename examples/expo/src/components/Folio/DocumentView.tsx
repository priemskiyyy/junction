import { CaretLeft, Check, PencilSimple } from "phosphor-react-native";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { FolioDocument } from "example-shared/folio/types/FolioDocument";
import { getPersonName } from "example-shared/formatting/getPersonName";
import { Button } from "src/components/Common/Button";
import { Callout } from "src/components/Common/Callout";
import { PersonMonogram } from "src/components/Folio/PersonMonogram";
import { COLORS } from "src/utils/constants/colors";

type DocumentViewProps = {
  document: FolioDocument;
  comment: { id: string } | null;
  editing: boolean;
  onBack: () => void;
  onEditingChange: (editing: boolean) => void;
};

export const DocumentView: React.FunctionComponent<DocumentViewProps> = ({
  document,
  comment,
  editing,
  onBack,
  onEditingChange,
}) => {
  const mention = document.comments.find(({ id }) => id === comment?.id);

  return (
    <View aria-label={document.title} style={styles.document}>
      <View style={styles.toolbar}>
        <Button
          label="Documents"
          variant="ghost"
          size="sm"
          icon={CaretLeft}
          onPress={onBack}
        />
        <Button
          label={editing ? "Save" : "Edit"}
          variant={editing ? "primary" : "secondary"}
          size="sm"
          icon={editing ? Check : PencilSimple}
          onPress={() => onEditingChange(!editing)}
        />
      </View>
      {mention === undefined ? null : (
        <View
          aria-label="The mention that opened this document"
          style={styles.mention}
        >
          <PersonMonogram id={mention.author.id} />
          <View style={styles.texts}>
            <Text style={styles.mentioned}>
              {getPersonName(mention.author.id)} mentioned you
            </Text>
            <Text style={styles.body}>{mention.body}</Text>
          </View>
        </View>
      )}
      <Text accessibilityRole="header" style={styles.title}>
        {document.title}
      </Text>
      <Text style={styles.summary}>{document.summary}</Text>
      {editing ? (
        <Callout
          tone="warning"
          text="Unsaved changes. This screen is not ready, so Junction holds anything that arrives for it until you save."
        />
      ) : null}
      <Text style={styles.label}>Comments</Text>
      {document.comments.map(({ id, author, body }) => (
        <View
          key={id}
          style={[styles.comment, id === comment?.id ? styles.target : null]}
        >
          <PersonMonogram id={author.id} />
          <View style={styles.texts}>
            <Text style={styles.author}>{getPersonName(author.id)}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  document: { gap: 10 },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: COLORS.text,
  },
  summary: { fontSize: 15, lineHeight: 21, color: COLORS.muted },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: COLORS.faint,
  },
  comment: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: COLORS.sunken,
  },
  target: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  mention: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  mentioned: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: COLORS.accentInk,
  },
  texts: { flex: 1, gap: 2 },
  author: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  body: { fontSize: 14, lineHeight: 20, color: COLORS.text },
});

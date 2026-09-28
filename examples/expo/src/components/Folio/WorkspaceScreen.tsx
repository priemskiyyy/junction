import { useIntent } from "@priemskiyyy/junction-react";
import { CaretRight, FileText, SignOut } from "phosphor-react-native";
import type React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { WORKSPACES } from "example-shared/folio/constants/workspaces";
import { createOpenDocumentHandler } from "example-shared/folio/handlers/createOpenDocumentHandler";
import { getPaneName } from "example-shared/folio/getPaneName";
import { getWorkspacesOf } from "example-shared/folio/getWorkspacesOf";
import type { PaneState } from "example-shared/folio/types/PaneState";
import { getPersonName } from "example-shared/formatting/getPersonName";
import { Button } from "src/components/Common/Button";
import { DocumentView } from "src/components/Folio/DocumentView";
import { PersonMonogram } from "src/components/Folio/PersonMonogram";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { useRuntime } from "src/hooks/useRuntime";
import { COLORS } from "src/utils/constants/colors";

type WorkspaceScreenProps = { account: { id: string }; pane: PaneState };

// One pane: it owns the documents of the workspace it shows, and is not ready while it has unsaved changes.
export const WorkspaceScreen: React.FunctionComponent<WorkspaceScreenProps> = ({
  account,
  pane,
}) => {
  const lab = useLab();
  const { app } = useRuntime();
  const world = useObservable(lab.world.state);
  const name = getPaneName({ index: 0, total: 1, workspace: pane.workspace });

  useIntent(
    "openDocument",
    createOpenDocumentHandler({ world: lab.world, app, pane: 0 }),
    {
      name,
      match: ({ workspaceId }) => workspaceId === pane.workspace.id,
      ready: !pane.editing,
    },
  );

  const documents = world.documents.filter(
    (document) => document.workspace.id === pane.workspace.id,
  );

  const open = documents.find(({ id }) => id === pane.document?.id);

  return (
    <View aria-label={name} style={styles.screen}>
      <View style={styles.account}>
        <PersonMonogram id={account.id} />
        <View style={styles.texts}>
          <Text style={styles.name}>{getPersonName(account.id)}</Text>
          <Text style={styles.meta}>Signed in</Text>
        </View>
        <Button
          label="Sign out"
          variant="ghost"
          size="sm"
          icon={SignOut}
          onPress={app.signOut}
        />
      </View>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {getWorkspacesOf(world, account).map((id) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: id === pane.workspace.id }}
            onPress={() => app.selectWorkspace(0, id)}
            style={[
              styles.tab,
              id === pane.workspace.id ? styles.selected : null,
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                id === pane.workspace.id ? styles.selectedLabel : null,
              ]}
            >
              {WORKSPACES[id].name}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {open === undefined ? (
          documents.map((document) => (
            <Pressable
              key={document.id}
              accessibilityRole="button"
              aria-label={document.title}
              onPress={() =>
                app.show({
                  workspaceId: pane.workspace.id,
                  documentId: document.id,
                })
              }
              style={({ pressed }) => [
                styles.item,
                pressed ? styles.pressed : null,
              ]}
            >
              <FileText size={20} color={COLORS.accent} weight="duotone" />
              <View style={styles.texts}>
                <Text style={styles.itemTitle}>{document.title}</Text>
                <Text numberOfLines={1} style={styles.itemSummary}>
                  {document.summary}
                </Text>
              </View>
              <CaretRight size={14} color={COLORS.faint} weight="bold" />
            </Pressable>
          ))
        ) : (
          <DocumentView
            document={open}
            comment={pane.document?.comment ?? null}
            editing={pane.editing}
            onBack={() => app.closeDocument(0)}
            onEditingChange={(editing) => app.setEditing(0, editing)}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  account: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 14,
    paddingRight: 6,
    paddingTop: 8,
  },
  texts: { flex: 1, gap: 1 },
  name: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.subtle },
  tabs: {
    flexDirection: "row",
    gap: 4,
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 3,
    borderRadius: 11,
    backgroundColor: COLORS.sunken,
  },
  tab: { flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: "center" },
  selected: {
    backgroundColor: COLORS.surface,
    boxShadow: "0 1px 2px rgba(24, 24, 27, 0.10)",
  },
  tabLabel: { fontSize: 13, fontWeight: "600", color: COLORS.subtle },
  selectedLabel: { color: COLORS.text },
  content: { gap: 6, paddingHorizontal: 12, paddingBottom: 16 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.sunken,
  },
  pressed: { backgroundColor: COLORS.accentSoft },
  itemTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  itemSummary: { fontSize: 13, color: COLORS.subtle },
});

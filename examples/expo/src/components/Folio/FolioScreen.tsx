import { Play, Power } from "phosphor-react-native";
import type React from "react";
import { StyleSheet, View } from "react-native";
import { match } from "ts-pattern";

import { Button } from "src/components/Common/Button";
import { Pill } from "src/components/Common/Pill";
import { ClosedScreen } from "src/components/Folio/ClosedScreen";
import { FolioApp } from "src/components/Folio/FolioApp";
import { FolioMark } from "src/components/Folio/FolioMark";
import { useLab } from "src/hooks/useLab";
import { useRuntime } from "src/hooks/useRuntime";
import { COLORS } from "src/utils/constants/colors";
import { FOLIO_STATES } from "src/utils/constants/folioStates";

export const FolioScreen: React.FunctionComponent = () => {
  const lab = useLab();
  const runtime = useRuntime();
  const { label, tone } = FOLIO_STATES[runtime.state];

  const handleOpenPress = () => {
    lab.openApp();
  };

  return (
    <View aria-label="Folio" style={styles.frame}>
      <View style={styles.bar}>
        <FolioMark size="sm" />
        <View style={styles.status}>
          <Pill label={label} tone={tone} />
        </View>
        {runtime.state === "running" ? (
          <Button
            label="Quit"
            variant="ghost"
            size="sm"
            icon={Power}
            onPress={lab.quit}
          />
        ) : (
          <Button
            label="Open"
            variant="primary"
            size="sm"
            icon={Play}
            onPress={handleOpenPress}
          />
        )}
      </View>
      <View style={styles.screen}>
        {match(runtime.state)
          .with("running", () => <FolioApp />)
          .with("quit", () => <ClosedScreen onOpenPress={handleOpenPress} />)
          .exhaustive()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
    boxShadow:
      "0 1px 2px rgba(24, 24, 27, 0.08), 0 12px 32px rgba(91, 33, 182, 0.10)",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  status: { flex: 1, alignItems: "flex-start" },
  screen: { flex: 1 },
});

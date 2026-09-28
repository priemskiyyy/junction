import { Play } from "phosphor-react-native";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "src/components/Common/Button";
import { FolioMark } from "src/components/Folio/FolioMark";
import { COLORS } from "src/utils/constants/colors";

type ClosedScreenProps = { onOpenPress: () => void };

export const ClosedScreen: React.FunctionComponent<ClosedScreenProps> = ({
  onOpenPress,
}) => (
  <View style={styles.screen}>
    <FolioMark size="lg" />
    <Text style={styles.title}>Folio is closed</Text>
    <Text style={styles.hint}>
      Send it something below and it launches, as a real app does: the launch
      read hands Junction what opened it.
    </Text>
    <Button
      label="Open Folio"
      variant="primary"
      icon={Play}
      onPress={onOpenPress}
    />
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.subtle,
    textAlign: "center",
    marginBottom: 6,
  },
});

import type { Icon } from "phosphor-react-native";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Knob } from "example-shared/lab/types/Knob";
import type { ActionKnobId } from "example-shared/lab/types/KnobId";
import type { LabNotice } from "example-shared/lab/types/LabNotice";
import { Button } from "src/components/Common/Button";
import { Callout } from "src/components/Common/Callout";
import { COLORS } from "src/utils/constants/colors";

type ActionRowProps = {
  knob: Knob<ActionKnobId>;
  icon: Icon;
  notice: LabNotice | null;
  disabled: boolean;
  onPress: () => void;
  onDismiss: (notice: LabNotice) => void;
};

export const ActionRow: React.FunctionComponent<ActionRowProps> = ({
  knob,
  icon,
  notice,
  disabled,
  onPress,
  onDismiss,
}) => (
  <View style={styles.row}>
    <Text style={styles.description}>{knob.description}</Text>
    <View style={styles.button}>
      <Button
        label={knob.label}
        variant="secondary"
        size="sm"
        icon={icon}
        disabled={disabled}
        onPress={onPress}
      />
    </View>
    {notice === null ? null : (
      <Callout
        tone={notice.tone}
        text={`${notice.title}. ${notice.body}`}
        onDismiss={() => onDismiss(notice)}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 12 },
  description: { fontSize: 13, lineHeight: 18, color: COLORS.subtle },
  button: { alignItems: "flex-start" },
});

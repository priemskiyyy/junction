import { DownloadSimple, Gift } from "phosphor-react-native";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { INVITE_LINK } from "example-shared/device/constants/invites";
import { WORKSPACES } from "example-shared/folio/constants/workspaces";
import { getPersonName } from "example-shared/formatting/getPersonName";
import { Button } from "src/components/Common/Button";
import { Card } from "src/components/Common/Card";
import { PersonMonogram } from "src/components/Folio/PersonMonogram";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";
import { COLORS } from "src/utils/constants/colors";
import { MONOSPACE } from "src/utils/constants/fonts";

export const InviteCard: React.FunctionComponent = () => {
  const lab = useLab();
  const busy = useObservable(lab.busy);

  return (
    <Card
      title="Invite link"
      icon={Gift}
      badge={{ label: "Simulated", tone: "neutral" }}
      hint="Folio is deleted, then installed from Ada's invite. Adjust hands the invite over as a deferred link at the first launch."
    >
      <View style={styles.invite}>
        <PersonMonogram id={INVITE_LINK.from.id} />
        <View style={styles.texts}>
          <Text style={styles.title}>
            {getPersonName(INVITE_LINK.from.id)} invited you to{" "}
            {WORKSPACES[INVITE_LINK.workspace.id].name}
          </Text>
          <Text numberOfLines={1} style={styles.url}>
            {INVITE_LINK.deeplink}
          </Text>
        </View>
      </View>
      <Button
        label="Install Folio from the invite"
        variant="primary"
        icon={DownloadSimple}
        disabled={busy !== null}
        onPress={() => lab.installFromInvite()}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  invite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.sunken,
  },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  url: { fontSize: 12, fontFamily: MONOSPACE, color: COLORS.accentInk },
});

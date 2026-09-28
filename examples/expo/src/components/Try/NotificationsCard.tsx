import { Bell } from "phosphor-react-native";
import type React from "react";

import { NOTIFICATION_PRESETS } from "example-shared/device/constants/notificationPresets";
import { Card } from "src/components/Common/Card";
import { NotificationBanner } from "src/components/Try/NotificationBanner";

export const NotificationsCard: React.FunctionComponent = () => (
  <Card
    title="Notifications"
    icon={Bell}
    badge={{ label: "Simulated", tone: "neutral" }}
    hint="Tap one to open it, as expo-notifications reports the press. Each mention is for one account, whoever is signed in."
  >
    {NOTIFICATION_PRESETS.map((preset) => (
      <NotificationBanner key={preset.id} preset={preset} />
    ))}
  </Card>
);

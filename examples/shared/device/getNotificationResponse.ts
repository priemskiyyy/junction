import type { NotificationResponseLike } from "@priemskiyyy/junction-expo-notifications";

import type { NotificationPreset } from "example-shared/device/types/NotificationPreset";

/** The response expo-notifications reports for one action on a preset notification. */
export const getNotificationResponse = (
  { request }: NotificationPreset,
  actionIdentifier: string,
): NotificationResponseLike => ({
  notification: { request },
  actionIdentifier,
});

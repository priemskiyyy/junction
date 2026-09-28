import type { NotificationResponseLike } from "@priemskiyyy/junction-expo-notifications";

import { DEFAULT_ACTION_ID } from "example-shared/device/constants/notifications";

/** A notification press in the device log's words: which notification, and which of its actions. */
export const describeResponse = ({
  notification,
  actionIdentifier,
}: NotificationResponseLike) => {
  if (actionIdentifier === DEFAULT_ACTION_ID) {
    return `Tapped ${notification.request.identifier}`;
  }

  return `${actionIdentifier} on ${notification.request.identifier}`;
};

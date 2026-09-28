import type { SourceObservation } from "@priemskiyyy/junction";

import type { NotificationPressInput } from "src/types/NotificationPressInput";
import type { NotificationResponseLike } from "src/types/NotificationResponseLike";
import { INTERACTION_KEY_LENGTH } from "src/utils/constants/notifications";

export const getPressObservation = (
  {
    notification: { request },
    actionIdentifier,
    userText,
  }: NotificationResponseLike,
  perAction: boolean,
): SourceObservation<NotificationPressInput> => {
  const input: NotificationPressInput = {
    notification: {
      id: request.identifier,
      category: request.content.categoryIdentifier,
    },
    action: { id: actionIdentifier, text: userText ?? null },
    data: request.content.data ?? {},
  };

  const key = JSON.stringify([request.identifier, actionIdentifier]);

  if (!perAction || key.length > INTERACTION_KEY_LENGTH) {
    return { input };
  }

  return { input, interaction: { key, scope: "installation" } };
};

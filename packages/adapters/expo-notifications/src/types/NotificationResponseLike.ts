/**
 * The parts of an expo-notifications `NotificationResponse` the source reads:
 * which notification was pressed, which of its actions, and its data.
 *
 * @example
 * ```ts
 * const response: NotificationResponseLike = {
 *   notification: { request: { identifier: "n-1", content: { data: { documentId: "42" }, categoryIdentifier: null } } },
 *   actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
 * };
 * ```
 */
export type NotificationResponseLike = {
  notification: {
    request: {
      identifier: string;
      content: {
        data?: Record<string, unknown>;
        categoryIdentifier: string | null;
      };
    };
  };
  actionIdentifier: string;
  userText?: string;
};

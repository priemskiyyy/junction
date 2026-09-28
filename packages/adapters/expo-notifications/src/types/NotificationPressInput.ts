/**
 * What the source pushes for every press: the notification, the action
 * pressed with any text the user typed, and the notification's data.
 *
 * @example
 * ```ts
 * const input: NotificationPressInput = {
 *   notification: { id: "n-1", category: null },
 *   action: { id: "expo.modules.notifications.actions.DEFAULT", text: null },
 *   data: { documentId: "42" },
 * };
 * ```
 */
export type NotificationPressInput = {
  notification: { id: string; category: string | null };
  /** `expo.modules.notifications.actions.DEFAULT` for a tap on the notification itself. */
  action: { id: string; text: string | null };
  data: Record<string, unknown>;
};

import type { NotificationResponseLike } from "src/types/NotificationResponseLike";

/**
 * The parts of the expo-notifications module the source calls. Pass the
 * module, `import * as Notifications from "expo-notifications"`; the source
 * never schedules, dismisses or clears a notification with it.
 *
 * @example
 * ```ts
 * const sdk: NotificationsLike = Notifications;
 * ```
 */
export type NotificationsLike = {
  addNotificationResponseReceivedListener: (
    listener: (response: NotificationResponseLike) => void,
  ) => { remove: () => void };
  /** The response native kept last: after a cold start, the press that launched the app. */
  getLastNotificationResponse: () => NotificationResponseLike | null;
};

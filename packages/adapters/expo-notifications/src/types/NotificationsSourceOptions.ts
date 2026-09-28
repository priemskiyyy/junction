import type { NotificationsLike } from "src/types/NotificationsLike";

/**
 * The options of `notifications()`: the expo-notifications module, and
 * whether one action on one notification counts as one occurrence.
 *
 * @example
 * ```ts
 * const options: NotificationsSourceOptions<typeof Notifications> = { sdk: Notifications, interaction: "per-notification-action" };
 * ```
 */
export type NotificationsSourceOptions<TSdk extends NotificationsLike> = {
  /** The expo-notifications module: `import * as Notifications from "expo-notifications"`. */
  sdk: TSdk;
  /** `per-notification-action` makes a second delivery of one action on one notification a duplicate; off by default, since a notification that stays can be pressed again. */
  interaction?: "per-notification-action";
};

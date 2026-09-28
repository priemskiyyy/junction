import { Junction } from "@priemskiyyy/junction";
import type { IncomingSource } from "@priemskiyyy/junction";
import type * as Notifications from "expo-notifications";
import type * as QuickActions from "expo-quick-actions";
import { expectTypeOf } from "vitest";

import type { createFakeNotifications } from "src/fakeNotifications.fixture";
import { notifications } from "src/notifications";
import type { NotificationPressInput } from "src/types/NotificationPressInput";
import type { NotificationsLike } from "src/types/NotificationsLike";

declare const sdk: typeof Notifications;
declare const quickActions: typeof QuickActions;

expectTypeOf(sdk).toExtend<NotificationsLike>();
expectTypeOf<
  keyof ReturnType<typeof createFakeNotifications>["sdk"]
>().toExtend<keyof typeof Notifications>();
expectTypeOf(notifications({ sdk })).toEqualTypeOf<
  IncomingSource<NotificationPressInput, typeof Notifications>
>();
expectTypeOf(
  new Junction({
    intents: {},
    sources: { presses: notifications({ sdk }) },
  }).source("presses").native,
).toEqualTypeOf<typeof Notifications>();

// @ts-expect-error Quick actions are not notification presses.
export const wrongSdk = notifications({ sdk: quickActions });

export const wrongPolicy = notifications({
  sdk,
  // @ts-expect-error Once per notification action is the one policy there is.
  interaction: "per-notification",
});

import { Junction } from "@priemskiyyy/junction";
import type { IncomingSource } from "@priemskiyyy/junction";
import type * as Notifications from "expo-notifications";
import type * as QuickActions from "expo-quick-actions";
import { expectTypeOf } from "vitest";

import type { createFakeQuickActions } from "src/fakeQuickActions.fixture";
import { quickActions } from "src/quickActions";
import type { QuickActionInput } from "src/types/QuickActionInput";
import type { QuickActionsLike } from "src/types/QuickActionsLike";

declare const sdk: typeof QuickActions;
declare const notifications: typeof Notifications;

expectTypeOf(sdk).toExtend<QuickActionsLike>();
expectTypeOf<keyof ReturnType<typeof createFakeQuickActions>["sdk"]>().toExtend<
  keyof typeof QuickActions
>();
expectTypeOf(quickActions({ sdk })).toEqualTypeOf<
  IncomingSource<QuickActionInput, typeof QuickActions>
>();
expectTypeOf(
  new Junction({
    intents: {},
    sources: { shortcuts: quickActions({ sdk }) },
  }).source("shortcuts").native,
).toEqualTypeOf<typeof QuickActions>();

// @ts-expect-error Notification presses are not quick actions.
export const wrongSdk = quickActions({ sdk: notifications });

import type { AppsFlyerSDK } from "@appsflyer-sdk/js-core-plugin";
import { Junction } from "@priemskiyyy/junction";
import type { IncomingSource } from "@priemskiyyy/junction";
import type Branch from "react-native-branch";
import { expectTypeOf } from "vitest";

import { appsFlyer } from "src/appsFlyer";
import type { createFakeAppsFlyer } from "src/fakeAppsFlyer.fixture";
import type { AppsFlyerInput } from "src/types/AppsFlyerInput";
import type { AppsFlyerLike } from "src/types/AppsFlyerLike";

// react-native-appsflyer 7.0.2 exports an AppsFlyerSDK instance and ships its own index.ts, which only compiles with a global jest declared.
declare const sdk: AppsFlyerSDK;
declare const branch: typeof Branch;

expectTypeOf(sdk).toExtend<AppsFlyerLike>();
expectTypeOf<keyof ReturnType<typeof createFakeAppsFlyer>["sdk"]>().toExtend<
  keyof AppsFlyerSDK
>();
expectTypeOf(appsFlyer({ sdk })).toEqualTypeOf<
  IncomingSource<AppsFlyerInput, AppsFlyerSDK>
>();
expectTypeOf(
  new Junction({
    intents: {},
    sources: { campaigns: appsFlyer({ sdk }) },
  }).source("campaigns").native,
).toEqualTypeOf<AppsFlyerSDK>();

// @ts-expect-error Branch reports sessions, not AppsFlyer deep links.
export const wrongSdk = appsFlyer({ sdk: branch });

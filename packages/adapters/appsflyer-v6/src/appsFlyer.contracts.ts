import type { AppsFlyerSDK } from "@appsflyer-sdk/js-core-plugin";
import { Junction } from "@priemskiyyy/junction";
import type { IncomingSource } from "@priemskiyyy/junction";
import type appsFlyerSdk from "react-native-appsflyer";
import { expectTypeOf } from "vitest";

import { appsFlyer } from "src/appsFlyer";
import type { createFakeAppsFlyer } from "src/fakeAppsFlyer.fixture";
import type { AppsFlyerInput } from "src/types/AppsFlyerInput";
import type { AppsFlyerLike } from "src/types/AppsFlyerLike";

// Compiled with react-native-appsflyer mapped onto 6.18.0, whose declarations augment that module name and import its own TypeScript sources.
declare const sdk: typeof appsFlyerSdk;
declare const seven: AppsFlyerSDK;

expectTypeOf(sdk).toExtend<AppsFlyerLike>();
expectTypeOf<keyof ReturnType<typeof createFakeAppsFlyer>["sdk"]>().toExtend<
  keyof typeof appsFlyerSdk
>();
expectTypeOf(appsFlyer({ sdk })).toEqualTypeOf<
  IncomingSource<AppsFlyerInput, typeof appsFlyerSdk>
>();
expectTypeOf(
  new Junction({
    intents: {},
    sources: { campaigns: appsFlyer({ sdk }) },
  }).source("campaigns").native,
).toEqualTypeOf<typeof appsFlyerSdk>();

// @ts-expect-error react-native-appsflyer 7 has no onDeepLink; its source is @priemskiyyy/junction-appsflyer.
export const wrongMajor = appsFlyer({ sdk: seven });

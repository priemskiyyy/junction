import { Junction } from "@priemskiyyy/junction";
import type { IncomingSource } from "@priemskiyyy/junction";
import type { Detour } from "@swmansion/react-native-detour";
import type * as ReactNative from "react-native";
import { expectTypeOf } from "vitest";

import { detour } from "src/detour";
import type { createFakeDetour } from "src/fakeDetour.fixture";
import type { DetourInput } from "src/types/DetourInput";
import type { DetourLike } from "src/types/DetourLike";

declare const sdk: typeof Detour;
declare const linking: typeof ReactNative.Linking;

expectTypeOf(sdk).toExtend<DetourLike>();
expectTypeOf<keyof ReturnType<typeof createFakeDetour>["sdk"]>().toExtend<
  keyof typeof Detour
>();
expectTypeOf(detour({ sdk })).toEqualTypeOf<
  IncomingSource<DetourInput, typeof Detour>
>();
expectTypeOf(
  new Junction({
    intents: {},
    sources: { links: detour({ sdk }) },
  }).source("links").native,
).toEqualTypeOf<typeof Detour>();

// @ts-expect-error React Native's Linking is not Detour's facade: its launch read answers null.
export const wrongSdk = detour({ sdk: linking });

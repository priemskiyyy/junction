import { Junction } from "@priemskiyyy/junction";
import type { IncomingSource } from "@priemskiyyy/junction";
import type { Adjust, AdjustConfig } from "react-native-adjust";
import { expectTypeOf } from "vitest";

import { adjust } from "src/adjust";
import type { createFakeAdjust } from "src/fakeAdjust.fixture";
import type { AdjustConfigLike } from "src/types/AdjustConfigLike";
import type { AdjustInput } from "src/types/AdjustInput";

declare const config: AdjustConfig;
declare const sdk: typeof Adjust;

expectTypeOf(config).toExtend<AdjustConfigLike>();
expectTypeOf<keyof ReturnType<typeof createFakeAdjust>["sdk"]>().toExtend<
  keyof AdjustConfig
>();
expectTypeOf(adjust({ sdk: config })).toEqualTypeOf<
  IncomingSource<AdjustInput, AdjustConfig>
>();
expectTypeOf(
  new Junction({
    intents: {},
    sources: { installs: adjust({ sdk: config }) },
  }).source("installs").native,
).toEqualTypeOf<AdjustConfig>();

// @ts-expect-error The source takes the AdjustConfig, not the Adjust module.
export const wrongSdk = adjust({ sdk });

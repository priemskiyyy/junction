import { Junction } from "@priemskiyyy/junction";
import type { IncomingSource } from "@priemskiyyy/junction";
import type { Linking } from "react-native";
import type Branch from "react-native-branch";
import { expectTypeOf } from "vitest";

import { branch } from "src/branch";
import type { createFakeBranch } from "src/fakeBranch.fixture";
import type { BranchInput } from "src/types/BranchInput";
import type { BranchLike } from "src/types/BranchLike";

declare const sdk: typeof Branch;
declare const linking: typeof Linking;

expectTypeOf(sdk).toExtend<BranchLike>();
expectTypeOf<keyof ReturnType<typeof createFakeBranch>["sdk"]>().toExtend<
  keyof typeof Branch
>();
expectTypeOf(branch({ sdk })).toEqualTypeOf<
  IncomingSource<BranchInput, typeof Branch>
>();
expectTypeOf(
  new Junction({ intents: {}, sources: { referrals: branch({ sdk }) } }).source(
    "referrals",
  ).native,
).toEqualTypeOf<typeof Branch>();

// @ts-expect-error React Native's Linking reports URLs, not Branch sessions.
export const wrongSdk = branch({ sdk: linking });

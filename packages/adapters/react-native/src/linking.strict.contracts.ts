import type { IncomingSource } from "@priemskiyyy/junction";
import type { Linking } from "react-native";
import { expectTypeOf } from "vitest";

import { linking } from "src/linking";
import type { LinkingInput } from "src/types/LinkingInput";
import type { LinkingLike } from "src/types/LinkingLike";

declare const strictLinking: typeof Linking;

// Compiled under react-native-strict-api: the generated types 0.86 offers on opt-in and 0.87 makes the default.
expectTypeOf(strictLinking).toExtend<LinkingLike>();
expectTypeOf(strictLinking.getInitialURL).returns.resolves.toEqualTypeOf<
  string | null | undefined
>();
expectTypeOf(linking({ sdk: strictLinking })).toEqualTypeOf<
  IncomingSource<LinkingInput, typeof Linking>
>();

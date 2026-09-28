import { intent, Junction } from "@priemskiyyy/junction";
import type { IncomingSource } from "@priemskiyyy/junction";
import type * as ExpoLinking from "expo-linking";
import type { AppState, Linking } from "react-native";
import { expectTypeOf } from "vitest";
import { z } from "zod";

import type { createFakeExpoLinking } from "src/fakeExpoLinking.fixture";
import type { createFakeLinking } from "src/fakeLinking.fixture";
import { linking } from "src/linking";
import type { LinkingInput } from "src/types/LinkingInput";
import type { LinkingLike } from "src/types/LinkingLike";

declare const reactNativeLinking: typeof Linking;
declare const expoLinking: typeof ExpoLinking;
declare const appState: typeof AppState;

expectTypeOf(reactNativeLinking).toExtend<LinkingLike>();
expectTypeOf(expoLinking).toExtend<LinkingLike>();
expectTypeOf(reactNativeLinking.getInitialURL).returns.resolves.toEqualTypeOf<
  string | null
>();
expectTypeOf(expoLinking.getInitialURL).returns.resolves.toEqualTypeOf<
  string | null
>();
expectTypeOf<keyof ReturnType<typeof createFakeLinking>["sdk"]>().toExtend<
  keyof typeof Linking
>();
expectTypeOf<keyof ReturnType<typeof createFakeExpoLinking>["sdk"]>().toExtend<
  keyof typeof ExpoLinking
>();

expectTypeOf(linking({ sdk: reactNativeLinking })).toEqualTypeOf<
  IncomingSource<LinkingInput, typeof Linking>
>();
expectTypeOf(linking({ sdk: expoLinking })).toEqualTypeOf<
  IncomingSource<LinkingInput, typeof ExpoLinking>
>();

const junction = new Junction({
  intents: {
    openDocument: intent(z.object({ documentId: z.string() })),
  },
  sources: { links: linking({ sdk: reactNativeLinking }) },
  routes: ({ from }) => ({
    document: from.links.url({
      url: "https://app.example.com/documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.documentId }),
    }),
  }),
});

expectTypeOf(junction.source("links").native).toEqualTypeOf<typeof Linking>();
expectTypeOf(
  new Junction({
    intents: {},
    sources: { links: linking({ sdk: expoLinking }) },
  }).source("links").native,
).toEqualTypeOf<typeof ExpoLinking>();

// @ts-expect-error AppState has no launch URL and emits no url event.
export const wrongSdk = linking({ sdk: appState });

// @ts-expect-error The source needs the Linking module the application has.
export const withoutSdk = linking({});

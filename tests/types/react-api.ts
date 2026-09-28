import { intent, Junction } from "@priemskiyyy/junction";
import type {
  JunctionIdentity,
  ObservableValue,
  SourceStatus,
} from "@priemskiyyy/junction";
import { createMockSource } from "@priemskiyyy/junction/mock";
import {
  JunctionProvider,
  useInbox,
  useIntent,
  useJunction,
  useSourceStatus,
} from "@priemskiyyy/junction-react";
import type {
  JunctionProviderProps,
  RegisteredExecution,
  RegisteredInboxEntry,
  RegisteredIntentName,
  RegisteredJunction,
  RegisteredPayload,
  RegisteredSourceName,
} from "@priemskiyyy/junction-react";
import { expectTypeOf } from "vitest";
import { z } from "zod";

declare const identity: ObservableValue<JunctionIdentity>;

export const junction = new Junction({
  intents: {
    openTicket: intent(
      z.object({ ticketId: z.string(), accountId: z.string().optional() }),
      { account: ({ accountId }) => accountId },
    ),
    showBanner: intent(z.object({ bannerId: z.string() })),
  },
  identity,
  sources: {
    links: createMockSource<{ url: string }>({ resource: "linking" }).source,
  },
});

// Declaration merging needs an interface: this is how a consumer's hooks learn its Junction.
declare module "@priemskiyyy/junction-react" {
  interface Register {
    junction: typeof junction;
  }
}

expectTypeOf<RegisteredJunction>().toEqualTypeOf<typeof junction>();
expectTypeOf<RegisteredIntentName>().toEqualTypeOf<
  "openTicket" | "showBanner"
>();
expectTypeOf<RegisteredSourceName>().toEqualTypeOf<"links">();
expectTypeOf<RegisteredPayload<"showBanner">>().toEqualTypeOf<{
  bannerId: string;
}>();
expectTypeOf<RegisteredExecution<"openTicket">["account"]>().toEqualTypeOf<{
  id: string;
}>();
expectTypeOf(JunctionProvider)
  .parameter(0)
  .toEqualTypeOf<JunctionProviderProps>();

export const props: JunctionProviderProps = { junction, children: null };

export const useConsumerView = () => {
  expectTypeOf(useJunction()).toEqualTypeOf<typeof junction>();
  expectTypeOf(useInbox()).toEqualTypeOf<RegisteredInboxEntry[]>();
  expectTypeOf(useSourceStatus("links")).toEqualTypeOf<SourceStatus>();

  useIntent("openTicket", async ({ ticketId }, { account, commit }) => {
    expectTypeOf(ticketId).toEqualTypeOf<string>();
    expectTypeOf(account).toEqualTypeOf<{ id: string }>();

    return commit(() => {});
  });

  // @ts-expect-error An undeclared intent.
  useIntent("openInvoice", () => {});

  // @ts-expect-error An undeclared source.
  useSourceStatus("push");
};

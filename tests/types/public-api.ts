import { intent, Junction, JunctionError } from "@priemskiyyy/junction";
import type {
  Admission,
  BootstrapReport,
  IncomingSource,
  InboxEntryOf,
  InboxSnapshot,
  InboxStorage,
  IntentExecutionOf,
  IntentPayload,
  JunctionErrorCode,
  JunctionIdentity,
  ObservableValue,
  SourceSink,
  StorageStatus,
} from "@priemskiyyy/junction";
import {
  createMockSource,
  createMockStorage,
} from "@priemskiyyy/junction/mock";
import type { MockSource, MockStorage } from "@priemskiyyy/junction/mock";
import {
  testIncomingSource,
  testInboxStorage,
} from "@priemskiyyy/junction/testing";
import type {
  IncomingSourceFixture,
  InboxStorageFixture,
} from "@priemskiyyy/junction/testing";
import { expectTypeOf } from "vitest";
import { z } from "zod";

type ScannerLike = {
  onScan: (listener: (code: string) => void) => () => void;
};

declare const sdk: ScannerLike;
declare const identity: ObservableValue<JunctionIdentity>;

const scanner = (): IncomingSource<{ url: string }, ScannerLike> => ({
  name: "scanner",
  native: sdk,
  resource: null,
  attach: (sink: SourceSink<{ url: string }>) => ({
    dispose: sdk.onScan((url) => {
      sink.push({ input: { url } });
    }),
  }),
});

const intents = {
  openTicket: intent(
    z.object({ ticketId: z.string(), accountId: z.string().optional() }),
    {
      account: ({ accountId }) => accountId,
    },
  ),
};

export const junction = new Junction({
  intents,
  identity,
  sources: { scanner: scanner() },
  routes: ({ from }) => ({
    ticketUrl: from.scanner.url({
      url: "https://tickets.example.com/:ticketId",
      intent: "openTicket",
      payload: ({ params }) => ({ ticketId: params.ticketId }),
    }),
  }),
});

expectTypeOf(junction.source("scanner").native).toEqualTypeOf<ScannerLike>();
expectTypeOf(junction.start()).toEqualTypeOf<Promise<BootstrapReport>>();
expectTypeOf(
  junction.dispatch("openTicket", { ticketId: "t-1" }),
).toEqualTypeOf<Promise<Admission>>();
expectTypeOf<IntentPayload<(typeof intents)["openTicket"]>>().toEqualTypeOf<{
  ticketId: string;
  accountId?: string | undefined;
}>();
expectTypeOf<
  IntentExecutionOf<typeof intents, "openTicket">["account"]
>().toEqualTypeOf<{
  id: string;
}>();
expectTypeOf(junction.inbox.get()).toEqualTypeOf<
  InboxEntryOf<typeof intents>[]
>();
expectTypeOf(
  new JunctionError({ code: "TIMED_OUT", message: "" }).code,
).toEqualTypeOf<"TIMED_OUT">();
expectTypeOf<JunctionError["code"]>().toEqualTypeOf<JunctionErrorCode>();

const mock: MockSource<{ url: string }, null> = createMockSource<{
  url: string;
}>();

export const fixture: IncomingSourceFixture<{ url: string }, null> = {
  source: mock.source,
  native: null,
  open: () => {},
  listeners: mock.control.listeners,
};

expectTypeOf(testIncomingSource<{ url: string }, null>).toBeFunction();

const Ticket = z.object({ ticketId: z.string() });

const kept: MockStorage = createMockStorage();

export const persisted = new Junction({
  intents: { openTicket: intent(Ticket, { persist: { schema: Ticket } }) },
  storage: kept.storage,
});

expectTypeOf(persisted.storage.status.get()).toEqualTypeOf<StorageStatus>();
expectTypeOf(persisted.storage.flush()).toEqualTypeOf<Promise<StorageStatus>>();
expectTypeOf(persisted.storage.reset()).toEqualTypeOf<Promise<StorageStatus>>();

export const mmkvLike: InboxStorage = {
  read: () => undefined,
  replace: (snapshot: InboxSnapshot, operation: { id: string }) => {
    expectTypeOf(snapshot.revision).toEqualTypeOf<number>();
    expectTypeOf(operation.id).toEqualTypeOf<string>();
  },
};

export const storageFixture: InboxStorageFixture = {
  storage: kept.storage,
  reopen: () => createMockStorage({ stored: kept.control.stored() }).storage,
};

expectTypeOf(testInboxStorage).toBeFunction();

export const wrongStored = intent(Ticket, {
  // @ts-expect-error The stored schema restores the payload consumers receive.
  persist: { schema: z.object({ ticketId: z.number() }) },
});

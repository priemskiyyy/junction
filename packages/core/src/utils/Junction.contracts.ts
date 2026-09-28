import { expectTypeOf } from "vitest";
import { z } from "zod";

import { createMockSource } from "src/mock/createMockSource";
import type { Admission } from "src/types/Admission";
import type { BootstrapReport } from "src/types/BootstrapReport";
import type { IncomingSource } from "src/types/IncomingSource";
import type { InspectionOf } from "src/types/InspectionOf";
import type { IntentPayload } from "src/types/IntentPayload";
import type { DiagnosticContexts } from "src/types/internal/DiagnosticContexts";
import type { JunctionDiagnosticEvent } from "src/types/JunctionDiagnosticEvent";
import type { JunctionDiagnosticType } from "src/types/JunctionDiagnosticType";
import type { JunctionIdentity } from "src/types/JunctionIdentity";
import type { ObservableValue } from "src/types/ObservableValue";
import type { RecoveryResult } from "src/types/RecoveryResult";
import type { WaitingReason } from "src/types/WaitingReason";
import { intent } from "src/utils/intent";
import { Junction } from "src/utils/Junction";

const Identifier = z.string().min(1);

const intents = {
  openDocument: intent(
    z.object({
      workspaceId: Identifier,
      documentId: Identifier,
      accountId: Identifier.optional(),
    }),
    { account: ({ accountId }) => accountId },
  ),
  showAnnouncement: intent(
    z.object({
      announcementId: Identifier,
      count: z.string().transform(Number),
    }),
  ),
};

type LinkingLike = { openURL: (url: string) => Promise<void> };

declare const Linking: LinkingLike;
declare const identity: ObservableValue<JunctionIdentity>;

const links: IncomingSource<{ url: string }, LinkingLike> = {
  name: "react-native-linking",
  native: Linking,
  resource: "linking",
  attach: () => ({}),
};

const referrals = createMockSource<{ params: Record<string, unknown> }>();

const junction = new Junction({
  intents,
  identity,
  sources: { links, referrals: referrals.source },
  routes: ({ from }) => ({
    documentUrl: from.links.url({
      url: "https://app.example.com/workspaces/:workspaceId/documents/:documentId",
      intent: "openDocument",
      payload: ({ params, query, input }) => {
        expectTypeOf(params).toEqualTypeOf<{
          workspaceId: string;
          documentId: string;
        }>();
        expectTypeOf(input).toEqualTypeOf<{ url: string }>();

        return {
          workspaceId: params.workspaceId,
          documentId: params.documentId,
          accountId: query.single("account"),
        };
      },
    }),
    announcementReferral: from.referrals.event({
      intent: "showAnnouncement",
      match: ({ params }) => params.kind === "announcement",
      payload: ({ params }) => ({
        announcementId: params.id,
        count: params.count,
      }),
    }),
  }),
});

expectTypeOf(junction.start).returns.toEqualTypeOf<Promise<BootstrapReport>>();
expectTypeOf(junction.dispose).returns.toEqualTypeOf<void>();
expectTypeOf(junction.source("links").native).toEqualTypeOf<LinkingLike>();
expectTypeOf(junction.retry("id")).toEqualTypeOf<Promise<RecoveryResult>>();

const inspection = junction.inspect("links", { url: "myapp://open" });

expectTypeOf(inspection).toEqualTypeOf<InspectionOf<typeof intents>>();

if (
  inspection.status === "matched" &&
  inspection.intent.name === "openDocument"
) {
  expectTypeOf(inspection.intent.payload).toEqualTypeOf<
    IntentPayload<(typeof intents)["openDocument"]>
  >();
}

junction.subscribe(
  "openDocument",
  async ({ documentId }, { account, signal, reject, commit }) => {
    expectTypeOf(documentId).toEqualTypeOf<string>();
    expectTypeOf(account).toEqualTypeOf<{ id: string }>();
    expectTypeOf(signal).toEqualTypeOf<AbortSignal>();

    if (documentId === "") {
      return reject("not-found");
    }

    return commit(() => {});
  },
  {
    match: ({ workspaceId }) => workspaceId === "workspace-7",
    ready: () => true,
    scope: "workspace-7",
    timeout: 5_000,
  },
);

junction.subscribe(
  "showAnnouncement",
  ({ count }, { account, intent: named }) => {
    expectTypeOf(count).toEqualTypeOf<number>();
    expectTypeOf(account).toEqualTypeOf<null>();
    expectTypeOf(named.name).toEqualTypeOf<"showAnnouncement">();
  },
);

expectTypeOf(
  junction.dispatch("showAnnouncement", { announcementId: "a", count: "3" }),
).toEqualTypeOf<Promise<Admission>>();

for (const entry of junction.inbox.get()) {
  if (entry.name === "openDocument") {
    expectTypeOf(entry.payload.documentId).toEqualTypeOf<string>();
  }

  if (entry.name === "showAnnouncement") {
    expectTypeOf(entry.payload.count).toEqualTypeOf<number>();
  }

  if (entry.state === "pending") {
    expectTypeOf(entry.waiting.reason).toBeString();
  }

  if (entry.state === "failed") {
    expectTypeOf(entry.error.code).toEqualTypeOf<
      "HANDLER_FAILED" | "INVALID_HANDLER_RESULT" | "ATTEMPTS_EXHAUSTED"
    >();
  }

  if (entry.state === "interrupted") {
    expectTypeOf<"HANDLER_FAILED">().not.toExtend<typeof entry.error.code>();
  }
}

expectTypeOf<
  keyof DiagnosticContexts
>().toEqualTypeOf<JunctionDiagnosticType>();
expectTypeOf<
  JunctionDiagnosticEvent<"retry scheduled">["context"]
>().toEqualTypeOf<{ after: number }>();

junction.diagnostics.events.subscribe((event) => {
  if (event.type === "intent waiting") {
    expectTypeOf(event.context.reason).toEqualTypeOf<WaitingReason>();
  }

  if (event.type === "intent accepted") {
    expectTypeOf(event.context).toEqualTypeOf<null>();
  }
});

const storageStatus = junction.storage.status.get();

if (storageStatus.state === "blocked") {
  expectTypeOf(storageStatus.error.code).toEqualTypeOf<
    "STORAGE_READ_FAILED" | "STORAGE_CORRUPT" | "STORAGE_VERSION_UNSUPPORTED"
  >();
}

const linksStatus = junction.source("links").status.get();

if (linksStatus.state === "failed") {
  expectTypeOf(linksStatus.error.code).toEqualTypeOf<"SOURCE_FAILED">();
}

// @ts-expect-error An account-bound intent needs the identity store.
new Junction({ intents, sources: { links } });

export const publicOnly = new Junction({
  intents: { showAnnouncement: intents.showAnnouncement },
});

// @ts-expect-error dispatch checks the schema's input, where count is a string.
junction.dispatch("showAnnouncement", { announcementId: "a", count: 3 });

// @ts-expect-error The Junction declares no openSettings intent.
junction.dispatch("openSettings", {});

junction.subscribe(
  "openDocument",
  // @ts-expect-error A committed effect is synchronous.
  (_payload, { commit }) => commit(async () => {}),
);

// @ts-expect-error A handler cannot acknowledge by returning an unrelated value.
junction.subscribe("openDocument", () => ({ status: 200 }));

// @ts-expect-error A matcher is synchronous.
junction.subscribe("openDocument", () => {}, { match: async () => true });

// @ts-expect-error Readiness is a boolean or a synchronous getter.
junction.subscribe("openDocument", () => {}, { ready: Promise.resolve(true) });

junction.subscribe("showAnnouncement", (_payload, { account }) => {
  // @ts-expect-error A public intent has no account.
  expectTypeOf(account.id).toBeString();
});

// @ts-expect-error The Junction has no source named ads.
junction.source("ads");

// @ts-expect-error inspect takes the source's own input.
junction.inspect("links", { params: {} });

new Junction({
  intents,
  identity,
  sources: { links, referrals: referrals.source },
  routes: ({ from }) => ({
    missingField: from.links.url({
      url: "https://app.example.com/documents/:documentId",
      intent: "openDocument",
      // @ts-expect-error The route's payload misses workspaceId.
      payload: ({ params }) => ({ documentId: params.documentId }),
    }),
    uncapturedParam: from.links.url({
      url: "https://app.example.com/documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({
        documentId: params.documentId,
        // @ts-expect-error The pattern captures no workspaceId.
        workspaceId: params.workspaceId,
      }),
    }),
    // @ts-expect-error The referrals source has no URL input, so it has no URL routes.
    referralUrl: from.referrals.url({
      url: "https://go.example.com/:code",
      intent: "showAnnouncement",
      payload: () => ({ announcementId: "a", count: "1" }),
    }),
    noScheme: from.links.url({
      // @ts-expect-error A pattern names its scheme.
      url: "/documents/:documentId",
      intent: "showAnnouncement",
      payload: () => ({ announcementId: "a", count: "1" }),
    }),
    undeclared: from.links.url({
      url: "myapp://settings",
      // @ts-expect-error The Junction declares no openSettings intent.
      intent: "openSettings",
      payload: () => ({ announcementId: "a", count: "1" }),
    }),
  }),
});

declare const label: string | undefined;
declare const backoff: number | undefined;
declare const deferral: boolean | undefined;
declare const scope: string | undefined;

junction.subscribe("showAnnouncement", () => {}, {
  name: label,
  scope,
  timeout: backoff,
});
junction.retry("intent-1", { after: backoff });
referrals.control.emit({ input: { params: {} }, deferred: deferral });
junction.dispatch(
  "showAnnouncement",
  { announcementId: "a", count: "1" },
  { interaction: undefined },
);

export const optionalInputs = new Junction({
  intents: { showAnnouncement: intents.showAnnouncement },
  storage: undefined,
  now: undefined,
  timeout: { initial: backoff, execution: undefined },
});

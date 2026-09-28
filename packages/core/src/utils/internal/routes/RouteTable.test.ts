import { expect, test } from "vitest";
import { z } from "zod";

import type { IncomingSource } from "src/types/IncomingSource";
import type { Route } from "src/types/Route";
import type { RouteBuilders } from "src/types/RouteBuilders";
import { intent } from "src/utils/intent";
import { createRouteBuilders } from "src/utils/internal/routes/createRouteBuilders";
import { RouteTable } from "src/utils/internal/routes/RouteTable";
import { JunctionError } from "src/utils/JunctionError";

const intents = {
  openDocument: intent(
    z
      .object({
        documentId: z.string().min(1),
        accountId: z.string().optional(),
        count: z.string().transform(Number).optional(),
      })
      .strict(),
    { account: ({ accountId }) => accountId },
  ),
  showAnnouncement: intent(z.object({ announcementId: z.string() }).strict()),
};

type TestSources = {
  links: IncomingSource<{ url: string }, null>;
  referrals: IncomingSource<{ params: Record<string, unknown> }, null>;
  shares: IncomingSource<
    { params: Record<string, unknown>; url: string },
    null
  >;
};

const getDefinitions = () =>
  new Map<string, (typeof intents)[keyof typeof intents]>(
    Object.entries(intents),
  );

const createTable = (
  routes: (
    from: RouteBuilders<typeof intents, TestSources>,
  ) => Record<string, Route>,
) =>
  new RouteTable({
    definitions: getDefinitions(),
    routes: routes(
      createRouteBuilders<typeof intents, TestSources>([
        "links",
        "referrals",
        "shares",
      ]),
    ),
  });

const documentUrl = (from: RouteBuilders<typeof intents, TestSources>) =>
  from.links.url({
    url: "https://app.example.com/documents/:documentId",
    intent: "openDocument",
    payload: ({ params, query }) => ({
      documentId: params.documentId,
      accountId: query.single("account"),
      count: query.single("count"),
    }),
  });

test("a matching URL produces the route's validated, canonical payload, its schema run once", () => {
  const table = createTable((from) => ({ documentUrl: documentUrl(from) }));

  expect(
    table.resolve("links", {
      url: "https://app.example.com/documents/doc-42?account=a-3&count=3",
    }),
  ).toMatchObject({
    kind: "MATCHED",
    route: "documentUrl",
    name: "openDocument",
    prepared: {
      payload: { documentId: "doc-42", accountId: "a-3", count: 3 },
      text: '{"accountId":"a-3","count":3,"documentId":"doc-42"}',
      target: "a-3",
    },
  });
});

test("an input no route matches is ignored as no-route", () => {
  const table = createTable((from) => ({ documentUrl: documentUrl(from) }));

  expect(
    table.resolve("links", { url: "https://app.example.com/settings" }),
  ).toEqual({
    kind: "IGNORED",
    reason: "no-route",
  });
  expect(table.resolve("referrals", { params: {} })).toEqual({
    kind: "IGNORED",
    reason: "no-route",
  });
});

test("two matching routes are ambiguous, whatever order they were declared in", () => {
  const announcement = (from: RouteBuilders<typeof intents, TestSources>) =>
    from.referrals.event({
      intent: "showAnnouncement",
      match: ({ params }) => params.kind === "announcement",
      payload: ({ params }) => ({ announcementId: params.id }),
    });

  const anything = (from: RouteBuilders<typeof intents, TestSources>) =>
    from.referrals.event({
      intent: "showAnnouncement",
      payload: ({ params }) => ({ announcementId: params.id }),
    });

  const forwards = createTable((from) => ({
    a: announcement(from),
    b: anything(from),
  }));

  const backwards = createTable((from) => ({
    b: anything(from),
    a: announcement(from),
  }));

  const input = { params: { kind: "announcement", id: "an-1" } };

  expect(forwards.resolve("referrals", input)).toEqual({
    kind: "REJECTED",
    reason: "ambiguous-route",
    issues: [{ path: "", message: 'The routes "a", "b" all match.' }],
  });
  expect(backwards.resolve("referrals", input)).toEqual({
    kind: "REJECTED",
    reason: "ambiguous-route",
    issues: [{ path: "", message: 'The routes "b", "a" all match.' }],
  });
});

test("a matched route whose payload the schema refuses is rejected and never falls through", () => {
  const table = createTable((from) => ({ documentUrl: documentUrl(from) }));

  const resolution = table.resolve("links", {
    url: "https://app.example.com/documents/doc-42?count=3&extra=1",
  });

  expect(resolution).toMatchObject({ kind: "MATCHED" });
  expect(
    createTable((from) => ({
      strict: from.links.url({
        url: "https://app.example.com/documents/:documentId",
        intent: "openDocument",
        payload: ({ params }) => ({ documentId: params.documentId, count: 3 }),
      }),
    })).resolve("links", { url: "https://app.example.com/documents/doc-42" }),
  ).toMatchObject({
    kind: "REJECTED",
    reason: "invalid-payload",
    issues: [{ path: "count" }],
  });
});

test("a URL whose origin another source's routes own is ignored, so only its owner produces an intent", () => {
  const table = createTable((from) => ({
    documentUrl: documentUrl(from),
    shareUrl: from.shares.url({
      url: "https://go.example.com/:code",
      intent: "showAnnouncement",
      payload: ({ params }) => ({ announcementId: params.code }),
    }),
  }));

  expect(table.resolve("links", { url: "https://go.example.com/abc" })).toEqual(
    {
      kind: "IGNORED",
      reason: "owned-by-other-source",
    },
  );
  expect(
    table.resolve("shares", {
      params: {},
      url: "https://go.example.com/abc",
    }),
  ).toMatchObject({ kind: "MATCHED", route: "shareUrl" });
});

test("a URL the grammar refuses is rejected as invalid-url on a source with URL routes", () => {
  const table = createTable((from) => ({ documentUrl: documentUrl(from) }));

  expect(
    table.resolve("links", { url: "https://app.example.com/documents/%2e%2e" }),
  ).toEqual({
    kind: "REJECTED",
    reason: "invalid-url",
    issues: [{ path: "", message: "The URL's path holds a dot segment." }],
  });
});

test("a URL on a source with only event routes is data, and its event routes still decide", () => {
  const table = createTable((from) => ({
    announcement: from.shares.event({
      intent: "showAnnouncement",
      payload: ({ params }) => ({ announcementId: params.id }),
    }),
  }));

  expect(
    table.resolve("shares", { params: { id: "an-1" }, url: "not a url" }),
  ).toMatchObject({
    kind: "MATCHED",
    prepared: { payload: { announcementId: "an-1" } },
  });
});

test("a match or a payload that throws rejects the observation as route-failed", () => {
  const throwingMatch = createTable((from) => ({
    announcement: from.referrals.event({
      intent: "showAnnouncement",
      match: () => {
        throw new Error("the matcher broke");
      },
      payload: () => ({ announcementId: "an-1" }),
    }),
  }));

  const throwingPayload = createTable((from) => ({
    announcement: from.referrals.event({
      intent: "showAnnouncement",
      payload: () => {
        throw new Error("the payload broke");
      },
    }),
  }));

  expect(throwingMatch.resolve("referrals", { params: {} })).toEqual({
    kind: "REJECTED",
    reason: "route-failed",
    issues: [
      { path: "", message: 'The route "announcement" threw while matching.' },
    ],
  });
  expect(throwingPayload.resolve("referrals", { params: {} })).toEqual({
    kind: "REJECTED",
    reason: "route-failed",
    issues: [
      {
        path: "",
        message: 'The route "announcement" threw while building its payload.',
      },
    ],
  });
});

test("a repeated query key read as single rejects the observation, never picking one value", () => {
  const table = createTable((from) => ({ documentUrl: documentUrl(from) }));

  expect(
    table.resolve("links", {
      url: "https://app.example.com/documents/doc-42?account=a-3&account=a-4",
    }),
  ).toEqual({
    kind: "REJECTED",
    reason: "route-failed",
    issues: [
      {
        path: "",
        message:
          'The query repeats "account", which is read as a single value.',
      },
    ],
  });
});

test("an input that is not bounded JSON is rejected before any route sees it", () => {
  const table = createTable((from) => ({ documentUrl: documentUrl(from) }));

  expect(
    table.resolve("links", { url: new URL("https://app.example.com") }),
  ).toMatchObject({
    kind: "REJECTED",
    reason: "invalid-input",
    issues: [{ path: "url", message: "Only JSON values can be kept." }],
  });
  expect(table.resolve("links", { url: "x".repeat(70_000) })).toMatchObject({
    kind: "REJECTED",
    reason: "invalid-input",
  });
});

test("an event route receives a frozen copy of the input, never the SDK's object", () => {
  const seen: unknown[] = [];

  const table = createTable((from) => ({
    announcement: from.referrals.event({
      intent: "showAnnouncement",
      payload: (input) => {
        seen.push(input);

        return { announcementId: "an-1" };
      },
    }),
  }));

  const input = { params: { id: "an-1" } };

  table.resolve("referrals", input);

  expect(seen).toEqual([input]);
  expect(seen[0]).not.toBe(input);
  expect(Object.isFrozen(seen[0])).toBe(true);
});

test("an account selector that throws rejects the payload", () => {
  const throwing = intent(z.object({ documentId: z.string() }), {
    account: () => {
      throw new Error("the selector broke");
    },
  });

  const table = new RouteTable({
    definitions: new Map([["openDocument", throwing]]),
    routes: {
      documentUrl: createRouteBuilders<
        { openDocument: typeof throwing },
        TestSources
      >(["links"]).links.url({
        url: "https://app.example.com/documents/:documentId",
        intent: "openDocument",
        payload: ({ params }) => ({ documentId: params.documentId }),
      }),
    },
  });

  expect(
    table.resolve("links", { url: "https://app.example.com/documents/a" }),
  ).toEqual({
    kind: "REJECTED",
    reason: "invalid-payload",
    issues: [{ path: "", message: "The account selector threw." }],
  });
});

test("two sources routing one origin is misconfiguration", () => {
  expect(() =>
    createTable((from) => ({
      documentUrl: documentUrl(from),
      shareUrl: from.shares.url({
        url: "https://app.example.com/r/:code",
        intent: "showAnnouncement",
        payload: ({ params }) => ({ announcementId: params.code }),
      }),
    })),
  ).toThrow(
    new JunctionError({
      code: "INVALID_CONFIGURATION",
      message:
        'routes.shareUrl routes https://app.example.com from "shares", which "links" already routes; one origin belongs to one source.',
    }),
  );
});

test("a route that names an undeclared intent is misconfiguration", () => {
  const route: Route = {
    kind: "event",
    source: { name: "referrals" },
    intent: { name: "missing" },
    match: () => true,
    payload: () => ({}),
  };

  expect(
    () =>
      new RouteTable({
        definitions: getDefinitions(),
        routes: { ghost: route },
      }),
  ).toThrow(
    new JunctionError({
      code: "INVALID_CONFIGURATION",
      message:
        'routes.ghost names the intent "missing", which is not declared.',
    }),
  );
});

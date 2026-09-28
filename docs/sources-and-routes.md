---
description: "A source listens to one provider SDK; a route turns what it observed into one intent's payload. Routes are keyed, typed and exclusive, and inspect() explains any input."
---

# Sources and routes

A **source** listens to one provider SDK your application already set up: React Native's Linking, Branch, AppsFlyer, a notification module. A **route** turns what a source observed into the payload of one intent. Junction owns everything between: validation, deduplication, the inbox and delivery.

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { linking } from "@priemskiyyy/junction-react-native";
import { Linking } from "react-native";
import { z } from "zod";

export const app = new Junction({
  intents: {
    openDocument: intent(
      z.object({ workspaceId: z.string(), documentId: z.string() }),
    ),
  },
  sources: { links: linking({ sdk: Linking }) },
  routes: ({ from }) => ({
    documentLink: from.links.url({
      url: "https://app.example.com/workspaces/:workspaceId/documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({
        workspaceId: params.workspaceId,
        documentId: params.documentId,
      }),
    }),
  }),
});
```

## Sources

`sources` names each source once. A source is plain data, `{ name, native, resource, attach }`, and constructing one does nothing: it listens only once `junction.start()` attaches it. `junction.source("links")` returns its status and the SDK it was given, typed as your own.

Two sources may not claim the same native feed: React Native's `Linking` and `expo-linking` both claim `linking`, so a Junction takes one of them. See [Choose a source](/sources) for what each provider can report.

## Routes

`routes` is called once with typed builders and returns an object keyed by route id, so a duplicate id cannot exist:

- `from.<source>.url({ url, intent, payload })` exists when the source's input has a `url`. `url` is one pattern: a scheme, a host, an optional port and a path, where each `:name` segment captures one segment into `params`. `payload` receives `{ params, query, input }`.
- `from.<source>.event({ intent, match, payload })` exists for every source. `match` and `payload` receive the source's input, and `match` defaults to always.

A route's `payload` returns the payload before validation. Its keys are checked against the intent's input type, and its values stay `unknown`: only the schema can prove them. `query.single(key)` reads one value and throws on a repeated key, so a link that repeats it fails its route instead of picking one; `query.all(key)` and `query.has(key)` read the rest.

## One input, one route

Routes are exclusive. When two routes match one input, the input is refused as `ambiguous-route`, never given to the first. An input no route matches is ignored as `no-route`.

A URL origin, its scheme, host and port together, belongs to one source. Declaring URL routes for one origin from two sources is misconfiguration, and a URL that arrives from the other source is ignored as `owned-by-other-source`, so a link that reaches the app through two sources becomes one intent, from the source that owns its origin. A Branch link is routed by Branch's own params rather than by URL, so leave Branch's link domains out of the Linking source's routes, as the [Branch](/sources/branch) page says.

## What an admission answers

Every observation and every `dispatch()` answers with an `Admission`:

| `status`      | Meaning                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `accepted`    | A new intent, with its id and whether storage confirmed it (`memory` or `committed`).                           |
| `duplicate`   | The same occurrence as an intent already admitted: see [Delivery and recovery](/delivery-and-recovery).         |
| `ignored`     | Nothing routes it (`no-route`), or another source owns its origin (`owned-by-other-source`).                    |
| `rejected`    | Refused, with a `reason`, the schema's or the parser's `issues`, and whether a retry could succeed.             |
| `unconfirmed` | Accepted or recognized in memory, but the write that would make it durable failed and may still have committed. |

## Inspecting an input

`inspect()` explains what one input of a source would become, without admitting it, calling an SDK or needing `start()`:

```ts
const inspection = junction.inspect("links", {
  url: "https://app.example.com/workspaces/w-7/documents/d-42",
});

if (inspection.status === "matched") {
  console.log(inspection.route.id, inspection.intent.payload);
}
```

It answers `matched` with the route and the validated payload, `ignored` with its reason, or `rejected` with its issues, all frozen. It serves a router that owns URLs and asks Junction what they mean: see [Routers](/routers).

---
description: "Declare an intent once with intent(schema, options): its schema, its account rule, how long it may wait, how many attempts it takes, and whether it survives a restart."
---

# Intents and schemas

An intent is something your application can be asked to do from outside: open a document, show a mention, join a workspace. It is declared once, with the schema its payload must pass, and every entry point that leads to it goes through that schema.

```ts
import { intent } from "@priemskiyyy/junction";
import { z } from "zod";

export const openDocument = intent(
  z.object({ workspaceId: z.string().min(1), documentId: z.string().min(1) }),
  { expires: { in: 5 * 60_000 }, attempts: 2 },
);
```

## The schema

Any [Standard Schema](https://standardschema.dev) works: Zod, Valibot, ArkType. It must validate synchronously and produce a JSON object. An asynchronous schema is refused when it runs, with an issue that says so, never awaited.

The schema's input type is what a route or `dispatch()` must provide; its output type is the payload a handler receives. A schema with a `transform` has a different output, and `dispatch()` takes the input.

## The canonical payload

What the schema produces is copied into a canonical payload before anything else sees it:

- plain JSON only: objects, arrays, strings, finite numbers, booleans and `null`. A class instance, a `Date`, a function or a cycle refuses the intent, and `-0` becomes `0`;
- at most 16 KiB of UTF-8 and 16 levels deep;
- keys sorted, so equal payloads have equal text;
- frozen, so no handler can change what another one reads.

## Options

| Option                | Default     | Meaning                                                                                                                                                                                                                 |
| --------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account`             | public      | A function returns the account the payload targets; without a target, as with `true`, the intent binds to whoever is signed in when it is accepted, or at its first attempt while nobody is. See [Identity](/identity). |
| `expires: { in }`     | 10 minutes  | How long an accepted intent may wait, from when it was received, up to 2 147 483 647 milliseconds (about 24.8 days, the longest timer delay). Past it, the intent ends expired, even mid-attempt.                       |
| `attempts`            | 3           | How many attempts it may take, from 1 to 10. A handler asking for another attempt past the last one fails the intent with `ATTEMPTS_EXHAUSTED`.                                                                         |
| `version`             | 1           | The payload's version. A stored intent of another version is quarantined when it is restored, never migrated.                                                                                                           |
| `persist: { schema }` | memory only | Keeps accepted intents across restarts. `schema` validates a stored payload when it comes back. See [Persistence](/persistence).                                                                                        |

An account selector's answer comes from the payload, so it is checked like any value from outside: an account id is a string of 1 to 160 characters, and anything else refuses the intent as `invalid-payload`.

## Declaring them together

A Junction takes its intents as one object. Its keys are the intents' names, and every route, consumer and inbox entry is typed from it:

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { z } from "zod";

const Document = z.object({ documentId: z.string().min(1) });

export const app = new Junction({
  intents: {
    openDocument: intent(Document, { persist: { schema: Document } }),
    showAnnouncement: intent(z.object({ announcementId: z.string() })),
  },
  storage,
});
```

## Raising one yourself

`dispatch()` admits an intent your own code raises, such as a button inside a push-driven flow. It skips routing, never validation, account binding or the limits, and it answers with the admission, not with the handling:

```ts
const admission = await junction.dispatch("showAnnouncement", {
  announcementId: "a-1",
});

if (admission.status === "rejected") {
  console.warn(admission.reason, admission.issues);
}
```

An undeclared name is misconfiguration and throws. A payload the schema refuses answers `rejected` with `invalid-payload` and the schema's issues.

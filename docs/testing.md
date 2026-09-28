---
description: "Test the code that consumes intents with a mock source and a mock storage, drive time through the now option, and hold a source or a storage of your own to Junction's contract."
---

# Testing

Junction ships what testing an app needs under two entry points: `@priemskiyyy/junction/mock` for your app's tests, and `@priemskiyyy/junction/testing` for the conformance suites a source or storage of your own must pass.

## A mock source

`createMockSource` is a source that emits what the test says, when it says it:

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { createMockSource } from "@priemskiyyy/junction/mock";
import { z } from "zod";

const links = createMockSource<{ url: string }>({ resource: "linking" });

const testJunction = new Junction({
  intents: { openDocument: intent(z.object({ documentId: z.string() })) },
  sources: { links: links.source },
  routes: ({ from }) => ({
    document: from.links.url({
      url: "myapp://documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.documentId }),
    }),
  }),
});

await testJunction.start();

const admission = await links.control.emit({
  input: { url: "myapp://documents/42" },
});
```

- `initial` gives it a launch read: an observation, `null` for an empty launch, or `"hold"` to settle it later with `control.initial.settle(observation)` or `control.initial.fail(error)`. As an observation, it can claim a deferral or an interaction key, as a real launch read does.
- `control.emit(observation)` pushes as the provider would, and answers the admission; `control.fail(error)` reports a provider error.
- `control.attachments` and `control.listeners()` show what Junction attached and disposed.
- `onAttach` and `onDispose` let it misbehave on purpose: push while attaching, throw, fail its cleanup.

## A mock storage

`createMockStorage` keeps one snapshot in memory and settles every write as the test says:

```ts
import { createMockStorage } from "@priemskiyyy/junction/mock";

const { storage: backend, control } = createMockStorage();

control.hold();
control.failNext({ committed: true });

const restarted = createMockStorage({ stored: control.stored() });
```

`hold()` keeps each write pending until it is committed or failed through `control.writes`; `release()` lets them all land. `failNext({ committed })` fails the next write after it committed or before. `stored()` is what a restarted app would read, and `read: "hold"` holds the read itself.

## Time

Every clock read goes through the `now` option, `Date.now` by default. Pass your own to test deadlines and retries without waiting:

```ts
import { Junction } from "@priemskiyyy/junction";

let clock = 0;

export const timed = new Junction({
  intents,
  identity,
  now: () => clock,
});

timed.start();
timed.dispatch("showAnnouncement", { announcementId: "a-1" });

clock += 11 * 60_000;
timed.refresh();
```

The turn `refresh()` starts, a microtask later, ends the announcement nobody took as expired.

With fake timers, fake `Date` too: Junction arms real timers against its clock, and a frozen `Date` makes a retry that is due never look due.

## Screens

Render the screens under `JunctionProvider` with a Junction over mock sources, and drive them the way a user would: emit the link, press the button, assert what the screen shows. [The React binding](/react) describes the provider and the hooks, and the Intent Lab's flow tests do this through the whole app.

## Conformance

A source of your own passes `testIncomingSource`, and a storage `testInboxStorage`, from `@priemskiyyy/junction/testing`: see [Writing a source](/writing-a-source) and [Writing a storage](/writing-a-storage). Each registers one `describe` block of the checks every shipped source and storage passes.

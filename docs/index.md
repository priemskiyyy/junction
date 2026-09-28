---
description: "Junction turns links, deferred links, notification presses and quick actions into validated, typed intents, and delivers each one to the screen that owns it, once that screen is mounted, ready and signed in to the right account."
---

# What Junction is

Junction is an entry-point library for React Native and TypeScript applications. Universal Links, App Links, custom schemes, deferred links, notification presses, home screen shortcuts and your own dispatches all arrive as typed intents. Junction captures them once, at bootstrap, and hands each one to the feature that owns it, when that feature is mounted, ready and signed in to the right account.

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { linking } from "@priemskiyyy/junction-react-native";
import { Linking } from "react-native";
import { z } from "zod";

export const junction = new Junction({
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

junction.start();
```

Reading a URL is easy. What surrounds it is where applications break, and it is what Junction owns:

- **Links arrive before the app is ready.** A cold-start link waits in a bounded inbox until the screen that owns it is mounted, ready and signed in, and expires if it never is.
- **Ownership is explicit.** `match` says which consumer owns an intent and `ready` says whether it can run now. An unready owner is never robbed by another consumer, and two owners are an ambiguity Junction reports instead of a race it resolves by mount order.
- **Validation is the boundary.** Every intent passes its schema, and every URL passes a strict grammar that refuses credentials, dot segments, encoded separators and spoofed hosts.
- **Work belongs to its attempt.** An account switch, an unmount or a timeout invalidates a running handler, and `commit()` guards the final effect, so a stale `await` cannot navigate.
- **Occurrences, not URLs.** A repeated tap is two intents. Only evidence a provider gives, such as a notification's own identifiers, makes a second delivery a duplicate.
- **Honest outcomes.** Handled, rejected, retried, failed, interrupted, expired or cancelled, each visible in the inbox and the diagnostics.
- **Your SDKs stay yours.** A source only listens to the SDK your application set up, and `junction.source(name).native` hands it back, typed as your own.

## The guarantee

> An accepted intent runs at most once at a time, only for the one consumer that owns it, only while that consumer is ready and the intent's account is the current one, and it reports an honest outcome, even when the provider repeats a callback, React remounts, the account changes or storage fails.

Everything in these pages serves that sentence. [The model](mental-model.md) walks through how, and the [runtime architecture](internals/architecture.md) names the test that guards each rule.

## What Junction is not

Junction does not navigate, create or host links, attribute installs, initialize SDKs, grant consent, sign anyone in or configure native link handling. Those stay with your router, your provider SDKs and your native project. The [native configuration](native-configuration.md) checklists say what each platform needs.

## Where to go next

- [Getting started](getting-started.md) takes one link from the URL to the screen that opens it.
- [The Intent Lab](examples.md) shows every rule on a simulated phone, with nothing to install.
- [Choose a source](sources.md) lists the entry points Junction listens to.

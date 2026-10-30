---
description: "Install Junction, declare an intent and a route, start it at bootstrap, consume the intent in the screen that owns it, and watch what waits."
---

# Getting started

## Install

```sh
pnpm add @priemskiyyy/junction@next @priemskiyyy/junction-react@next @priemskiyyy/junction-react-native@next zod
```

The core, `@priemskiyyy/junction`, has no dependencies; `@priemskiyyy/junction-react` binds it to React, and `@priemskiyyy/junction-react-native` listens to Linking. Any Standard Schema library works for the schemas; the examples use Zod.

## Declare an intent and its routes

An intent is something your application can be asked to do from outside. A route turns what a source observed into an intent's payload:

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { linking } from "@priemskiyyy/junction-react-native";
import { Linking } from "react-native";
import { z } from "zod";

export const junction = new Junction({
  intents: {
    openDocument: intent(z.object({ documentId: z.string().min(1) })),
  },
  sources: { links: linking({ sdk: Linking }) },
  routes: ({ from }) => ({
    documentLink: from.links.url({
      url: "https://app.example.com/documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.documentId }),
    }),
    documentScheme: from.links.url({
      url: "myapp://documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.documentId }),
    }),
  }),
});

junction.start();
```

Create the Junction once, at module scope, outside any component. Constructing it attaches nothing; `start()` attaches every source synchronously, reads the URL the app launched from, and never rejects. A link that arrives before any screen is mounted waits in the inbox.

## Register it for React

The hooks learn your Junction's intents and sources from one type registration:

<!-- snippet: fragment -->

```tsx
import { JunctionProvider } from "@priemskiyyy/junction-react";

declare module "@priemskiyyy/junction-react" {
  interface Register {
    junction: typeof junction;
  }
}

export const Root = () => (
  <JunctionProvider junction={junction}>
    <Application />
  </JunctionProvider>
);
```

The provider publishes the Junction and does nothing else: it never starts or disposes it, so Strict Mode's double mount and every remount leave it alone.

## Consume the intent where it belongs

The screen that can open a document registers itself as the consumer of `openDocument`, and says when it is ready:

```tsx
import { useIntent } from "@priemskiyyy/junction-react";

export const DocumentsScreen = () => {
  const navigation = useNavigation();

  useIntent(
    "openDocument",
    ({ documentId }, { commit }) =>
      commit(() => navigation.navigate("Document", { documentId })),
    { ready: navigation.isReady() },
  );

  return null;
};
```

The payload is typed from the schema. `commit()` runs the navigation once, and only if the attempt is still current: if the screen unmounts or the account changes while the handler awaits something, the navigation never happens. Until the screen is mounted and ready, the intent waits.

## Watch what waits

```tsx
import { useInbox } from "@priemskiyyy/junction-react";

export const WaitingBadge = () => {
  const waiting = useInbox(
    (inbox) => inbox.filter(({ state }) => state === "pending").length,
  );

  if (waiting === 0) {
    return null;
  }

  return <span>{waiting} waiting</span>;
};
```

Every pending entry says why it waits: no screen takes it yet, two screens claim it, its owner is not ready, nobody is signed in, and so on. [Diagnostics](diagnostics.md) show the same story as a timeline.

## Next

- [The model](mental-model.md) explains capture, ownership, readiness and leases.
- [Intents and schemas](intents.md) covers accounts, deadlines, attempts and persistence.
- [Choose a source](sources.md) adds notifications, shortcuts and deferred links.

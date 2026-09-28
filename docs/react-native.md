---
description: "Set Junction up in a React Native or Expo app: create and start it at bootstrap, outside React, consume intents in screens, and what differs in Expo Go, after a JavaScript reload and on the web."
---

# React Native and Expo

Junction is React Native first. The React binding is the same one the web uses: there is no separate React Native binding, and the sources are React Native packages over the SDKs your app already set up.

## Create and start it at bootstrap

Create the Junction in a module of its own, and start it where your app starts, outside React. Some providers deliver the launch link only to listeners that exist early, and a component can mount too late or twice:

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { linking } from "@priemskiyyy/junction-react-native";
import { Linking } from "react-native";
import { z } from "zod";

export const app = new Junction({
  intents: {
    openDocument: intent(z.object({ documentId: z.string() })),
  },
  sources: { links: linking({ sdk: Linking }) },
  routes: ({ from }) => ({
    document: from.links.url({
      url: "myapp://documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.documentId }),
    }),
  }),
});

app.start();
```

`start()` attaches every source synchronously and resolves once each launch read settled or timed out; it never waits for a deferred link. Consume the intents in the screens that own them with [`useIntent`](/react), and make readiness honest: a screen that cannot navigate yet is `ready: false`, or reads your navigation's readiness.

## Expo

Pass `expo-linking` instead of React Native's `Linking`; the source treats them alike. In a development build and a store build, your `scheme` and associated domains reach the app as you configured them.

**Expo Go** opens a project's links only as `exp://<host>/--/<path>`, under its own scheme, and launches the project with a URL of its own. Your app's scheme reaches a development build, not Expo Go. To try links in Expo Go, build them with `Linking.createURL(path)` and hand Junction your app's form of what arrives, as the [Intent Lab on Expo](/examples) does; the URL Expo Go launches with matches no route and is ignored.

## A JavaScript reload

A development reload, or `Updates.reloadAsync()` applying an update, starts a new JavaScript runtime while the process stays. React Native answers `getInitialURL()` with the launch URL again, and several providers hand their last launch event to the first listener again, so the launch intent is admitted again. A source with occurrence evidence, such as expo-notifications with `per-notification-action`, makes the replay a duplicate; Linking reports none.

## The web

On the web the page's URL belongs to your router. There `getInitialURL()` answers the page's own address, and expo-linking reports every `window` message as a `url` event, so leave the Linking source out of a web build. Other sources, such as notifications, work where their SDK does.

## Background and foreground

A link that brings a backgrounded app forward arrives as a live `url` event, and Junction admits it like any other: if its screen is not mounted or not ready, it waits in the inbox. An app the operating system ended launches again with the link as its launch read. [Persistence](/persistence) keeps an intent across an ending your app did not choose.

# @priemskiyyy/junction-detour

Detour entry points for Junction: every link Software Mansion's Detour resolves, the deferred one after an install included, through the `Detour` facade of the `@swmansion/react-native-detour` SDK your app already set up. The source only listens: it pushes what the mounted `DetourProvider` resolves, with Detour's own claim about deferral, and never mounts, configures or clears anything.

## Installation

```sh
pnpm add @priemskiyyy/junction @priemskiyyy/junction-detour
```

## Create a Junction

```tsx
import { intent, Junction } from "@priemskiyyy/junction";
import { detour } from "@priemskiyyy/junction-detour";
import { Detour, DetourProvider } from "@swmansion/react-native-detour";
import { z } from "zod";

export const junction = new Junction({
  intents: {
    openDocument: intent(z.object({ documentId: z.string() })),
  },
  sources: { links: detour({ sdk: Detour }) },
  routes: ({ from }) => ({
    document: from.links.url({
      url: "detour://documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.documentId }),
    }),
  }),
  // A deferred match is a network request, which can take longer than the default 2 seconds.
  timeout: { initial: 10_000 },
});

// Before the provider mounts: Detour hands a link it resolves later only to the listeners it has.
junction.start();

export const App = () => (
  <DetourProvider config={{ appID, apiKey }}>
    <Navigation />
  </DetourProvider>
);
```

## Options

| Option | Type         | Description                                                                                                        |
| ------ | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `sdk`  | `DetourLike` | The SDK's `Detour` facade. The source calls only `addEventListener("url")`, its `remove()`, and `getInitialURL()`. |

## Capabilities

| Capability           | Support                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch read          | `getInitialURL()`, which settles once the mounted `DetourProvider` finished its launch processing: the link that opened the app, or the deferred link Detour matched for a new install. |
| Live events          | Yes: every link the provider resolves while the app runs, as its `linkProcessingMode` allows.                                                                                           |
| Deferred links       | Yes, with `deferred` from Detour's `linkType`: `true` for a deferred link, `false` for a verified or a scheme link.                                                                     |
| Interaction identity | None: Detour reports no occurrence id, so every link is a new intent.                                                                                                                   |
| Native detach        | The subscription's `remove()`, on `dispose()`.                                                                                                                                          |
| Platforms            | iOS and Android. On web, `DetourProvider` processes no link and `getInitialURL()` never settles, so `start()` waits `timeout.initial` there: leave the source out of a web build.       |

## How an event is mapped

| Detour hands the listener or the launch read             | The source                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| `detour://<route>?…&fromDeepLink=true&linkType=deferred` | pushes `{ input: { url: "detour://<route>?…" }, deferred: true }` |
| the same with `linkType=verified` or `linkType=scheme`   | pushes it with `deferred: false`                                  |
| a URL without those two parameters at its end            | pushes it whole, with no claim about deferral                     |
| `undefined` from `getInitialURL()`                       | an empty launch                                                   |

Detour hands every link on as `detour://` and the link's route in your app, so URL routes use that scheme: `detour://documents/:documentId`. The source removes only the pair Detour appends last, so a link's own query, parameters of the same names included, reaches the route as Detour serialized it. A value the link did not carry is missing, and a required schema field refuses the intent.

## Native configuration

Junction configures nothing. Detour needs its app and keys from the Detour dashboard, `DetourProvider` mounted with them, and the Universal Links, App Links and scheme your Detour links open, set up as Detour's documentation describes.

## What Junction does not normalize

- **Mount `DetourProvider`.** `getInitialURL()` settles only once the provider finished its launch processing, which for a new install includes a network match. Until then the launch read waits: past `timeout.initial` Junction reports it as timed out, and still admits the link as initial when it arrives.
- **The launch URL has one reader.** Detour hands it to the calls waiting when launch processing ends, or else to the first call after, and never again. Do not also give `Detour` to React Navigation's `linking`, or read `getInitialURL()` yourself.
- **One owner per link.** In Detour's default `linkProcessingMode: "all"`, and in `"web-only"`, the provider listens to React Native's Linking itself, so a Linking source for the same links would make each a second intent: keep Detour the only owner of its links. `"deferred-only"` hands on only the deferred link, and it also skips the step that resolves Detour's short links and checks their click limits, so a Detour link opened while the app is installed would reach a Linking source as its raw `https://` short URL, which no route of yours matches. Detour pairs that mode with its own Expo Router intent handler; with Junction, prefer `"all"`.
- Detour drops a link it refuses, such as a Universal Link past its click limit, before the facade hands it on.
- It never mounts or configures Detour, sends analytics or clears the provider's link.

## Behavior

- Creating the source listens to nothing and reads nothing.
- `start()` adds the `url` listener synchronously, then calls `getInitialURL()`.
- It claims the `detour` feed, so a second Detour source in the same Junction is misconfiguration.
- `dispose()` removes the listener and touches the facade no further.

## Tests

- **Ran**: the source through a real Junction against an in-process fake of `@swmansion/react-native-detour` 2.3.1's facade, modelled on its launch URL kept during launch processing, the launch read that waits for it and its single reader, and its `detour://` URLs with the two appended parameters, serialized as `URLSearchParams` does; the conformance suite; type contracts against 2.3.1's declarations.
- **Did not run**: a device, `DetourProvider` or Detour's servers. Whether a link resolves, and whether a deferred link matches, is decided by Detour.

## License

MIT

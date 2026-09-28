# @priemskiyyy/junction-adjust

Adjust entry points for Junction: the deferred deep link a new install came through, which Adjust reports once the install's attribution arrives, through the `AdjustConfig` your app already builds. The source only listens: it sets the deferred deep link callback on your config and nothing else.

## Installation

```sh
pnpm add @priemskiyyy/junction @priemskiyyy/junction-adjust
```

## Create a Junction

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { adjust } from "@priemskiyyy/junction-adjust";
import { Adjust, AdjustConfig } from "react-native-adjust";
import { z } from "zod";

const config = new AdjustConfig(appToken, AdjustConfig.EnvironmentProduction);

// Adjust would open the link through the system too, and the Linking source would make it a second intent.
config.disableDeferredDeeplinkOpening();

export const junction = new Junction({
  intents: {
    openDocument: intent(z.object({ documentId: z.string() })),
  },
  sources: { installs: adjust({ sdk: config }) },
  routes: ({ from }) => ({
    document: from.installs.url({
      url: "myapp://documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.documentId }),
    }),
  }),
});

// Before Adjust.initSdk(): Adjust wires only a callback the config already has.
junction.start();

Adjust.initSdk(config);
```

## Options

| Option | Type               | Description                                                                                                          |
| ------ | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `sdk`  | `AdjustConfigLike` | The `AdjustConfig` your app passes to `Adjust.initSdk()`. The source calls only its `setDeferredDeeplinkCallback()`. |

## Capabilities

| Capability           | Support                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch read          | None: Adjust reports the deferred link through its callback once the attribution arrives. A link that opened the app belongs to the Linking source. |
| Live events          | The deferred deep link, when Adjust's attribution for a new install carries one.                                                                    |
| Deferred links       | Yes: every link the source pushes is `deferred: true`, as Adjust's deferred deep link callback reports it.                                          |
| Interaction identity | None: Adjust reports no occurrence id, so every delivery is a new intent.                                                                           |
| Native detach        | None: react-native-adjust cannot remove this callback alone, so Adjust keeps calling it after `dispose()` and Junction ignores what it delivers.    |
| Platforms            | iOS and Android.                                                                                                                                    |

## How an event is mapped

| react-native-adjust hands the deferred deep link callback          | The source                                            |
| ------------------------------------------------------------------ | ----------------------------------------------------- |
| `{ deeplink }`                                                     | pushes `{ input: { url: deeplink }, deferred: true }` |
| an empty map, which Android sends when the attribution has no link | ignores it                                            |

Routes are URL routes, as over the Linking source, matched against the deep link your Adjust link carries. A value the link did not carry is missing, and a required schema field refuses the intent.

## Native configuration

Junction configures nothing. A deferred deep link needs an Adjust link with a deep link, set up in the Adjust dashboard, and the Adjust SDK in your app. The deep link's scheme or domain is your app's own configuration, as for Linking.

## What Junction does not normalize

- **Start Junction before `Adjust.initSdk(config)`.** Native wires the deferred deep link callback only when the config has it at initialization; a callback set later is never called.
- **Adjust opens the deferred link too, unless told not to.** By default Adjust also opens the link through the operating system, so it reaches the Linking source and becomes a second intent. Call `config.disableDeferredDeeplinkOpening()`, or leave the deferred link to the Linking source and use no Adjust source.
- **Adjust keeps one deferred deep link callback, the first.** react-native-adjust keeps the first callback set on any config for the life of the JavaScript runtime. A callback your app sets before Junction's leaves Junction deaf, one set after is ignored, and a second Junction started in the same runtime, after a Fast Refresh for example, hears nothing. Route the deferred link through Junction instead of a callback of your own.
- It never initializes Adjust, calls `processDeeplink()`, reads attribution or changes consent, and never calls `Adjust.componentWillUnmount()`, which removes every callback your app set.

## Behavior

- Creating the source sets nothing on the config.
- `start()` sets the callback synchronously, so `Adjust.initSdk(config)` right after it wires the callback.
- It claims the `adjust` feed, so a second Adjust source in the same Junction is misconfiguration.
- `dispose()` removes nothing, since react-native-adjust has no removal for this callback alone; Junction ignores whatever it delivers afterwards.

## Tests

- **Ran**: the source through a real Junction against an in-process fake of react-native-adjust 5.8.0, modelled on its first-wins callback, its wiring at `initSdk()` only, and Android's empty map for an attribution without a link; the conformance suite, for a provider with no native detach; type contracts against react-native-adjust 5.8.0's declarations.
- **Did not run**: a device, Adjust's native SDKs or its servers. Whether an install is attributed, and whether its link is deferred, is decided by Adjust.

## License

MIT

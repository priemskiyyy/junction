# @priemskiyyy/junction-appsflyer

AppsFlyer entry points for Junction: every deep link AppsFlyer's Unified Deep Linking finds, the launch link and a deferred one after an install included, through the react-native-appsflyer 7 module your app already set up. The source only listens: it pushes `FOUND` results with AppsFlyer's own claim about deferral, and reports errors on its status. For react-native-appsflyer 6, use `@priemskiyyy/junction-appsflyer-v6`.

## Installation

```sh
pnpm add @priemskiyyy/junction @priemskiyyy/junction-appsflyer
```

## Create a Junction

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { appsFlyer } from "@priemskiyyy/junction-appsflyer";
import { AppsFlyer } from "react-native-appsflyer";
import { z } from "zod";

export const junction = new Junction({
  intents: {
    openDocument: intent(z.object({ documentId: z.string() })),
  },
  sources: { campaigns: appsFlyer({ sdk: AppsFlyer }) },
  routes: ({ from }) => ({
    campaign: from.campaigns.event({
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.deep_link_value }),
    }),
  }),
});

// Before AppsFlyer.init(): AppsFlyer drops a deep link that arrives before its listener exists.
junction.start();

// Registered right after init(), never after awaiting it: AppsFlyer requires every listener synchronously.
AppsFlyer.init({ devKey, appId });
AppsFlyer.registerSessionReadyListener(() => AppsFlyer.start());
```

## Options

| Option | Type            | Description                                                                                                                    |
| ------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `sdk`  | `AppsFlyerLike` | react-native-appsflyer 7's `AppsFlyer`. The source calls only `registerDeepLinkListener()` and `unregisterDeepLinkListener()`. |

## Capabilities

| Capability           | Support                                                                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch read          | Through the listener: AppsFlyer delivers the launch link to its deep link callback once the SDK started, as a live event: its intent has `provenance.initial: false`, and `start()` reports `none`. |
| Live events          | Yes: every deep link AppsFlyer resolves while the app runs.                                                                                                                                         |
| Deferred links       | Yes, with `deferred` set from the link's `is_deferred`, as AppsFlyer reports it.                                                                                                                    |
| Interaction identity | None: AppsFlyer reports no occurrence id, so every result is a new intent.                                                                                                                          |
| Native detach        | `unregisterDeepLinkListener()` on Android; iOS has none, so AppsFlyer keeps delivering and Junction ignores it.                                                                                     |
| Platforms            | iOS and Android, on React Native's New Architecture, which react-native-appsflyer 7 requires.                                                                                                       |

## How an event is mapped

| AppsFlyer hands its deep link callback | The source                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `status: "FOUND"`                      | pushes `{ input: { params } }`, `params` being the link's `deepLink` values |
| `status: "NOT_FOUND"`                  | ignores it                                                                  |
| `status: "ERROR"`                      | reports its `error` on the source's status as `SOURCE_ERROR`                |

Routes are event routes over `{ params }`, with AppsFlyer's own names: `deep_link_value`, `deep_link_sub1` to `deep_link_sub10`, and the campaign fields. For a new install AppsFlyer passes only the deep link values, and iOS matches a deferred link probabilistically; a value a link did not carry is missing, and a required schema field refuses the intent.

## Native configuration

Junction configures nothing. AppsFlyer resolves deep links only once the app is set up for them: OneLink in the AppsFlyer dashboard, the Associated Domains entitlement for the OneLink domain and a URI scheme on iOS, App Link intent filters on Android, and, in a hand-written `AppDelegate`, the URL and user activity callbacks routed through `AppsFlyerAttribution.shared`.

## What Junction does not normalize

- **Start Junction before `AppsFlyer.init()`.** AppsFlyer drops, for good, a deep link that arrives before its listener is registered.
- **AppsFlyer keeps one deep link callback.** Registering one replaces the previous one, so the source is your app's deep link listener: route what you need through Junction instead of registering another.
- **The same link can reach two sources.** A OneLink opens through Universal Links or App Links too. Leave the OneLink domain out of the Linking source's routes, so it becomes one intent, from AppsFlyer.
- It never initializes, starts or stops AppsFlyer, sets an identity or asks for consent.

## Behavior

- Creating the source registers nothing.
- `start()` sets the deep link callback synchronously; AppsFlyer's native registration settles later, and a rejection is reported on the source's status.
- It claims the `appsflyer` feed, so a second AppsFlyer source in the same Junction is misconfiguration.
- `dispose()` calls `unregisterDeepLinkListener()`, which AppsFlyer supports on Android only; on iOS it rejects in JavaScript before reaching native code, and the rejection is contained.

## Tests

- **Ran**: the source through a real Junction against an in-process fake of react-native-appsflyer 7.0.2 over `@appsflyer-sdk/js-core-plugin` 7.0.15, modelled on its one-callback registry, its normalized results and its Android-only unregister; the conformance suite; type contracts against js-core-plugin 7.0.15's `AppsFlyerSDK`, the type of react-native-appsflyer's `AppsFlyer`.
- **Did not run**: a device, AppsFlyer's native SDKs or its servers. Whether a OneLink resolves, and whether a deferred link matches, is decided by AppsFlyer.

## License

MIT

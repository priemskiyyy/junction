# @priemskiyyy/junction-appsflyer-v6

AppsFlyer entry points for Junction on react-native-appsflyer 6: every deep link AppsFlyer's Unified Deep Linking finds, the launch link and a deferred one after an install included, through the module your app already set up. The source only listens: it pushes `FOUND` results with AppsFlyer's own claim about deferral, and reports errors on its status. On react-native-appsflyer 7, use `@priemskiyyy/junction-appsflyer`: the factory and its types keep their names, so moving is a change of package.

## Installation

```sh
pnpm add @priemskiyyy/junction @priemskiyyy/junction-appsflyer-v6
```

## Create a Junction

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { appsFlyer } from "@priemskiyyy/junction-appsflyer-v6";
import appsFlyerSdk from "react-native-appsflyer";
import { z } from "zod";

export const junction = new Junction({
  intents: {
    openDocument: intent(z.object({ documentId: z.string() })),
  },
  sources: { campaigns: appsFlyer({ sdk: appsFlyerSdk }) },
  routes: ({ from }) => ({
    campaign: from.campaigns.event({
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.deep_link_value }),
    }),
  }),
});

// Before initSdk(), which delivers deep links only with onDeepLinkListener: true.
junction.start();

appsFlyerSdk.initSdk({ devKey, appId, onDeepLinkListener: true });
```

## Options

| Option | Type            | Description                                                                                                 |
| ------ | --------------- | ----------------------------------------------------------------------------------------------------------- |
| `sdk`  | `AppsFlyerLike` | react-native-appsflyer 6's default export. The source calls only `onDeepLink()` and the remover it returns. |

## Capabilities

| Capability           | Support                                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch read          | Through the listener: AppsFlyer delivers the launch link to `onDeepLink` once the SDK started, as a live event: its intent has `provenance.initial: false`, and `start()` reports `none`. |
| Live events          | Yes: every deep link AppsFlyer resolves while the app runs.                                                                                                                               |
| Deferred links       | Yes, with `deferred` set from `isDeferred`, as AppsFlyer reports it.                                                                                                                      |
| Interaction identity | None: AppsFlyer reports no occurrence id, so every result is a new intent.                                                                                                                |
| Native detach        | The remover `onDeepLink()` returned, on `dispose()`.                                                                                                                                      |
| Platforms            | iOS and Android.                                                                                                                                                                          |

## How an event is mapped

| react-native-appsflyer 6 hands `onDeepLink`          | The source                                                                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `deepLinkStatus: "FOUND"`                            | pushes `{ input: { params } }`, `params` being the result's `data`                                                    |
| `deepLinkStatus: "NOT_FOUND"`                        | ignores it                                                                                                            |
| `deepLinkStatus: "ERROR"`                            | reports AppsFlyer's message in `data` on the source's status as `SOURCE_ERROR`, as the 7.x source reports its `error` |
| an `AFParseJSONException`, for a payload not in JSON | reports it on the source's status as `SOURCE_ERROR`                                                                   |

Routes are event routes over `{ params }`, with AppsFlyer's own names: `deep_link_value`, `deep_link_sub1` to `deep_link_sub10`, and the campaign fields. The package's types promise `campaign` and `media_source` on every result, but for a new install AppsFlyer passes only the deep link values, and iOS matches a deferred link probabilistically; a value a link did not carry is missing, and a required schema field refuses the intent.

## Native configuration

Junction configures nothing. AppsFlyer resolves deep links only once the app is set up for them: OneLink in the AppsFlyer dashboard, the Associated Domains entitlement for the OneLink domain and a URI scheme on iOS, App Link intent filters on Android, and the URL and user activity callbacks forwarded to AppsFlyer in a hand-written `AppDelegate`.

## What Junction does not normalize

- **Start Junction before `initSdk()`**, and pass `onDeepLinkListener: true`: without the option AppsFlyer delivers no deep link, and a link resolved before the listener exists is gone.
- **The same link can reach two sources.** A OneLink opens through Universal Links or App Links too. Leave the OneLink domain out of the Linking source's routes, so it becomes one intent, from AppsFlyer.
- It never initializes or stops AppsFlyer, sets an identity or asks for consent.

## Behavior

- Creating the source listens to nothing.
- `start()` adds its `onDeepLink` listener synchronously.
- It claims the `appsflyer` feed, so a second AppsFlyer source in the same Junction is misconfiguration.
- `dispose()` removes the listener and touches the module no further.

## Tests

- **Ran**: the source through a real Junction against an in-process fake of react-native-appsflyer 6.18.0, modelled on its EventEmitter listener, its JSON parsing and the parse exception it hands the callback in place of a result; the conformance suite; type contracts against react-native-appsflyer 6.18.0's declarations.
- **Did not run**: a device, AppsFlyer's native SDKs or its servers. Whether a OneLink resolves, and whether a deferred link matches, is decided by AppsFlyer.

## License

MIT

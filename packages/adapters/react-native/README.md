# @priemskiyyy/junction-react-native

React Native and Expo entry points for Junction: every Universal Link, App Link and custom-scheme URL the operating system opens the app with, and the one that launched it, through the `Linking` module your app already has. Pass React Native's `Linking` or the `expo-linking` module. The source only listens.

## Installation

```sh
pnpm add @priemskiyyy/junction @priemskiyyy/junction-react-native
```

## Create a Junction

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { linking } from "@priemskiyyy/junction-react-native";
import { Linking } from "react-native";
import { z } from "zod";

export const junction = new Junction({
  intents: {
    openDocument: intent(z.object({ documentId: z.string() })),
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

With Expo, pass the `expo-linking` module instead:

```ts
import { linking } from "@priemskiyyy/junction-react-native";
import * as Linking from "expo-linking";

export const links = linking({ sdk: Linking });
```

## Options

| Option | Type          | Description                                                                                                                                                   |
| ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`  | `LinkingLike` | React Native's `Linking`, or the `expo-linking` module. The source calls only `addEventListener("url")`, the subscription's `remove()` and `getInitialURL()`. |

## Capabilities

| Capability           | Support                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Launch read          | Yes: `getInitialURL()`, once per `start()`, after the listener exists.                                      |
| Live events          | Yes: the `url` event, while the app runs or when a link brings it back from the background.                 |
| Deferred links       | No: a link opened before the app was installed never reaches Linking. Use a provider source such as Branch. |
| Interaction identity | None: the operating system gives no occurrence id, so every open is a new intent.                           |
| Native detach        | The subscription's `remove()`, on `dispose()`.                                                              |
| Platforms            | iOS and Android only; leave the source out of a web build, as below.                                        |

## How an event is mapped

| The provider delivers                             | The source pushes                                   |
| ------------------------------------------------- | --------------------------------------------------- |
| a `url` event `{ url }`                           | `{ input: { url } }`, routed by `from.<source>.url` |
| `getInitialURL()` resolving a URL                 | the launch read `{ url }`, admitted as initial      |
| `getInitialURL()` resolving `null` or `undefined` | an empty launch read                                |
| `getInitialURL()` rejecting                       | a failed launch read; later links still arrive      |

## Native configuration

Junction reads what the operating system delivers and configures nothing. Links reach Linking only once the app is set up for them:

- **iOS**: Universal Links need the Associated Domains entitlement (`applinks:app.example.com`) and an `apple-app-site-association` file on the domain; custom schemes are declared under `CFBundleURLTypes`. A bare app's `AppDelegate` forwards `application(_:open:options:)` and `application(_:continue:restorationHandler:)` to `RCTLinkingManager`.
- **Android**: App Links need an `intent-filter` with `android:autoVerify="true"` for the host and an `assetlinks.json` file on the domain; custom schemes are an `intent-filter` with the scheme. The activity's `launchMode="singleTask"` lets a link reach the running app.
- **Expo**: `scheme`, `ios.associatedDomains` and `android.intentFilters` in the app config; prebuild writes the native parts.

## What Junction does not normalize

- URLs arrive as the operating system delivered them. Expo Go's `exp://` and development build URLs reach your routes unchanged: route them or leave them unmatched.
- It does not share URLs with your router. React Navigation's `linking` and Expo Router's automatic handling must not also navigate from a URL Junction routes.
- It never reads Expo's cached linking URL (`getLinkingURL()`, `useLinkingURL()`) and never calls `clearInitialURL()`, which belong to your app. The launch read is React Native's, the same feed as the listener, so one link is never delivered twice.
- Two taps on the same link are two intents: Linking reports no occurrence id to deduplicate by.
- A JavaScript reload, a development reload or `Updates.reloadAsync()` applying an update, starts a new runtime whose `getInitialURL()` answers the launch URL again, so the launch link becomes an intent again.
- On web the URL belongs to your router. There `getInitialURL()` answers the page's own address, so every page load would become an intent, and expo-linking also reports every `window` message, from an embedded widget or a browser extension, as a `url` event with that address. Leave the source out of a web build.

## Behavior

- Creating the source subscribes to nothing and reads nothing.
- `start()` installs the `url` listener synchronously, then reads the launch URL once.
- It claims the `linking` feed, so a second Linking source in the same Junction is misconfiguration.
- It never calls `openURL()`, `canOpenURL()`, `openSettings()` or `sendIntent()`.
- `dispose()` removes the listener and touches the module no further.

## Tests

- **Ran**: the source through a real Junction against in-process fakes of React Native 0.86.3's `Linking` and expo-linking 57.0.11 (whose listener and launch read are React Native's, with Expo's own cached URL beside them); the conformance suite for both; type contracts against react-native 0.86.3's default declarations, its `react-native-strict-api` declarations (the default from 0.87), and expo-linking 57.0.11's.
- **Did not run**: a device, a simulator or React Native's native modules. Whether Universal Links and App Links verify is decided by your native configuration.

## License

MIT

---
description: "Junction configures nothing native. What iOS, Android and Expo need before a link, a notification or a shortcut reaches the app, and where each provider's own setup lives."
---

# Native configuration

Junction reads what the operating system and your providers deliver, and configures nothing. An entry point reaches a source only once the app is set up for it. `junction.source(name).status` reads `attached` when the listener is installed, which says nothing about whether associated domains verified.

## Links

- **iOS.** Universal Links need the Associated Domains entitlement (`applinks:app.example.com`) and an `apple-app-site-association` file served from the domain. Custom schemes are declared under `CFBundleURLTypes`. A bare app's `AppDelegate` forwards `application(_:open:options:)` and `application(_:continue:restorationHandler:)` to `RCTLinkingManager`.
- **Android.** App Links need an `intent-filter` with `android:autoVerify="true"` for the host and an `assetlinks.json` file served from the domain. A custom scheme is an `intent-filter` with that scheme. `launchMode="singleTask"` lets a link reach the running activity instead of a new one.
- **Expo.** `scheme`, `ios.associatedDomains` and `android.intentFilters` in the app config; prebuild writes the native parts.

## Providers

Each provider has its own dashboard and native setup, and its source's page names what Junction expects of it:

| Provider                                     | Before Junction sees an event                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [Branch](/sources/branch)                    | The Branch SDK installed and initialized natively, with your keys and link domains.                          |
| [AppsFlyer](/sources/appsflyer)              | OneLink configured, the SDK initialized with your dev key and app id, and Junction started before `init()`.  |
| [Adjust](/sources/adjust)                    | The deferred deep link callback set on the `AdjustConfig` before `Adjust.initSdk()`.                         |
| [Detour](/sources/detour)                    | `DetourProvider` mounted with your app id and key, and Detour's links set up as its documentation describes. |
| [Notifications](/sources/expo-notifications) | Permission granted, categories registered for actions, and notifications presented by your app.              |
| [Quick actions](/sources/expo-quick-actions) | The shortcuts registered with `setItems()` or declared in the app config.                                    |

Junction never initializes, configures or grants consent with an SDK: the application owns its SDK, and Junction only listens.

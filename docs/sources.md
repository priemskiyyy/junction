---
description: "Every source Junction ships, what it can report, and how to choose between them: Linking, Branch, AppsFlyer, Adjust, Detour, notifications and quick actions, or a source of your own."
---

# Choose a source

A source translates one provider SDK onto Junction's contract and nothing more. Each package is cold: its factory attaches nothing until `start()`, and it never imports its provider at runtime; you pass the SDK your app initialized as `sdk`.

| Source                                       | Package                                    | Launch read              | Deferred links           | Occurrence evidence             |
| -------------------------------------------- | ------------------------------------------ | ------------------------ | ------------------------ | ------------------------------- |
| [Linking and Expo Linking](/sources/linking) | `@priemskiyyy/junction-react-native`       | `getInitialURL()`        | no                       | none                            |
| [Branch](/sources/branch)                    | `@priemskiyyy/junction-branch`             | through its subscription | yes, Branch's claim      | none                            |
| [AppsFlyer 7](/sources/appsflyer)            | `@priemskiyyy/junction-appsflyer`          | through its listener     | yes, `is_deferred`       | none                            |
| [AppsFlyer 6](/sources/appsflyer-v6)         | `@priemskiyyy/junction-appsflyer-v6`       | through `onDeepLink`     | yes, `isDeferred`        | none                            |
| [Adjust](/sources/adjust)                    | `@priemskiyyy/junction-adjust`             | none                     | yes, always deferred     | none                            |
| [Detour](/sources/detour)                    | `@priemskiyyy/junction-detour`             | `getInitialURL()`        | yes, Detour's `linkType` | none                            |
| [Notifications](/sources/expo-notifications) | `@priemskiyyy/junction-expo-notifications` | the last response        | no                       | opt-in, per notification action |
| [Quick actions](/sources/expo-quick-actions) | `@priemskiyyy/junction-expo-quick-actions` | the launch action        | no                       | none                            |

A launch "through" a listener arrives as a live event: its intent has `provenance.initial: false`, and `start()` reports that source's launch read as `none`.

## Choosing

- **Links your app's domains open**: Linking. Every Universal Link, App Link and custom-scheme URL, while the app runs and the one that launched it.
- **Links that must survive an install**: a provider that resolves deferred links, Branch, AppsFlyer, Adjust or Detour. Give its link domains to that source alone, and leave them out of your Linking routes, so one link is one intent.
- **Notification presses**: expo-notifications. Pass `interaction: "per-notification-action"` when a press may reach both the launch read and the listener.
- **Home screen shortcuts**: expo-quick-actions.
- **Anything else**: [write a source](/writing-a-source). It is a plain object over the SDK you already have.

## What a source never does

It never initializes, configures or grants consent with its SDK, never opens a URL, and never clears what its SDK keeps: your app owns its SDK. It pushes only what its provider positively reports as actionable, a clicked Branch link, a `FOUND` AppsFlyer result, and claims an occurrence only when the provider gives evidence of one.

# Changelog

## @priemskiyyy/junction 0.1.0 - Unreleased

- First release. `Junction` captures what its sources observe, validates each observation into a typed intent, holds it in a bounded inbox and delivers it to the one consumer that owns it, once that consumer is ready and the right account is signed in.
- Intents are declared once with `intent(schema, options)`, over any Standard Schema that validates synchronously and produces a JSON object. `account`, `expires`, `attempts`, `version` and `persist` shape what each intent may do.
- Routes are keyed, typed and exclusive: a URL route over a strict grammar that refuses credentials, dot segments, encoded separators and spoofed hosts, or an event route over any input. Two routes matching one input are an ambiguity, never a first match.
- Consumers own intents through `match`, run them only when `ready`, and fall back only when no primary matches. Two owners are an ambiguity the inbox reports, never a race settled by mount order.
- One attempt runs at a time, on a lease. Its execution commits a final effect once, rejects or asks to retry, and an invalidated attempt settles nothing.
- Only occurrence evidence deduplicates: an interaction key a source claims, kept in a bounded ledger. Equal URLs and payloads are separate intents.
- Persistence through an `InboxStorage`: complete snapshots written by one writer, a lease stored before a persistent handler runs, a restart that brings a running intent back interrupted, and a storage that blocks rather than starts empty when it cannot be trusted.
- A time bound on every storage call, `timeout.storage`: a read past it blocks the storage, and a write past it counts as failed while it stays the one write in flight.
- Passive diagnostics that carry no payload, each event's context typed by its type, `createMockSource` and `createMockStorage` under `./mock`, and the `testIncomingSource` and `testInboxStorage` conformance suites under `./testing`.
- Only misconfiguration throws, as a `JunctionError` with a `code`. Every operation answers with a result.

## @priemskiyyy/junction-react 0.1.0 - Unreleased

- First release. `JunctionProvider`, `useIntent`, `useInbox`, `useSourceStatus` and `useJunction`, typed from one `Register` augmentation.
- `useIntent` keeps its registration across renders and reads the latest handler, `match` and `ready` through `useEffectEvent`, so options change without re-registering.
- The provider owns no lifetime: it never starts or disposes the Junction. The observing hooks read an empty inbox and idle sources on the server.
- Requires `@priemskiyyy/junction` 0.1 and React 19.2.

## @priemskiyyy/junction-react-native 0.1.0 - Unreleased

- First release. `linking({ sdk })` over React Native's `Linking` or the `expo-linking` module: the launch URL as the launch read, and every link opened while the app runs.

## @priemskiyyy/junction-branch 0.1.0 - Unreleased

- First release. `branch({ sdk })` over react-native-branch 7: every session a clicked Branch link opens, the launch and deferred ones included, and Branch's errors on the source's status.

## @priemskiyyy/junction-appsflyer 0.1.0 - Unreleased

- First release. `appsFlyer({ sdk })` over react-native-appsflyer 7: every deep link Unified Deep Linking finds, with AppsFlyer's own claim about deferral.

## @priemskiyyy/junction-appsflyer-v6 0.1.0 - Unreleased

- First release. `appsFlyer({ sdk })` over react-native-appsflyer 6, with the same factory and types as the 7.x package.

## @priemskiyyy/junction-expo-notifications 0.1.0 - Unreleased

- First release. `notifications({ sdk, interaction })` over expo-notifications 57: every press on a notification or one of its actions, the press that launched the app included, and an opt-in `per-notification-action` occurrence policy.

## @priemskiyyy/junction-expo-quick-actions 0.1.0 - Unreleased

- First release. `quickActions({ sdk })` over expo-quick-actions 6: the home screen action that launched the app and every later one.

## @priemskiyyy/junction-adjust 0.1.0 - Unreleased

- First release. `adjust({ sdk })` over react-native-adjust 5's `AdjustConfig`: the deferred deep link a new install came through, claimed as deferred.

## @priemskiyyy/junction-detour 0.1.0 - Unreleased

- First release. `detour({ sdk })` over `@swmansion/react-native-detour` 2: every link Detour resolves, with its claim about deferral and without the parameters it appends.

## @priemskiyyy/junction-silo 0.1.0 - Unreleased

- First release. `silo({ value })`, an `InboxStorage` over one Silo value handle, which fails a read of a store that did not hydrate rather than answer an empty inbox.

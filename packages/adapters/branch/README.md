# @priemskiyyy/junction-branch

Branch entry points for Junction: every session a Branch link opens, the launch link and a deferred one after an install included, through the react-native-branch module your app already set up. The source only listens: it pushes what Branch reports as a clicked Branch link, and reports Branch's errors on its status.

## Installation

```sh
pnpm add @priemskiyyy/junction @priemskiyyy/junction-branch
```

## Create a Junction

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { branch } from "@priemskiyyy/junction-branch";
import Branch from "react-native-branch";
import { z } from "zod";

export const junction = new Junction({
  intents: {
    openDocument: intent(z.object({ documentId: z.string() })),
  },
  sources: { referrals: branch({ sdk: Branch }) },
  routes: ({ from }) => ({
    referral: from.referrals.event({
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.documentId }),
    }),
  }),
});

// Before any other Branch.subscribe(): Branch hands its cached launch link to the first subscriber only.
junction.start();
```

## Options

| Option | Type         | Description                                                                                               |
| ------ | ------------ | --------------------------------------------------------------------------------------------------------- |
| `sdk`  | `BranchLike` | react-native-branch's default export. The source calls only `subscribe()` and the unsubscribe it returns. |

## Capabilities

| Capability           | Support                                                                                                                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch read          | Through the subscription: Branch delivers the session it cached at launch to the app's first subscriber, marked `+rn_cached_initial_event`. It arrives as a live event, so its intent has `provenance.initial: false` and `start()` reports this source's launch read as `none`. |
| Live events          | Yes: every session a Branch link opens while the app runs.                                                                                                                                                                                                                       |
| Deferred links       | Yes, as Branch reports them: a clicked link on the first session after an install. The source claims nothing about deferral itself.                                                                                                                                              |
| Interaction identity | None: Branch reports no occurrence id, and a link id is not one, so every open is a new intent.                                                                                                                                                                                  |
| Native detach        | The unsubscribe `subscribe()` returned, on `dispose()`.                                                                                                                                                                                                                          |
| Platforms            | iOS and Android.                                                                                                                                                                                                                                                                 |

## How an event is mapped

| Branch reports to `onOpenComplete`        | The source                                                    |
| ----------------------------------------- | ------------------------------------------------------------- |
| params with `+clicked_branch_link: true`  | pushes `{ input: { params, uri } }`, `uri` `null` when absent |
| params with `+clicked_branch_link: false` | ignores it: a plain deep link or an organic open              |
| an `error`                                | reports it on the source's status as `SOURCE_ERROR`           |

Routes are event routes over `{ params, uri }`, with Branch's own param names. A param a link did not set is missing, and a required schema field refuses the intent.

## Native configuration

Junction configures nothing. Branch works only once the app is set up for it: the Branch key and link domains in `branch.json` or the native manifests, the Associated Domains entitlement and the `app.link` domains on iOS, the intent filters on Android, and Branch's own initialization in `AppDelegate` and `MainApplication`. With `deferInitForPluginRuntime`, Branch initializes when the first `subscribe()` runs, which is `junction.start()` when Junction subscribes first.

## What Junction does not normalize

- **Only the first subscriber gets the launch link.** react-native-branch 7 redeems its cached launch session for the app's first `Branch.subscribe()` only. Call `junction.start()` before any other subscription, or the launch link reaches the other subscriber and not Junction.
- **A JavaScript reload redeems the launch link again.** Branch keeps the last session in native statics, so after a development reload or `Updates.reloadAsync()` the first subscriber receives it once more, as a new intent.
- **The same link can reach two sources.** A Branch link opens through Universal Links or App Links too. Leave Branch's link domains out of the Linking source's routes, so a Branch link becomes one intent, from Branch.
- It never opens URLs, reads referring params, sets an identity or changes tracking; those stay with your Branch setup.

## Behavior

- Creating the source subscribes to nothing.
- `start()` subscribes synchronously; Branch wires its live listeners once its cached check settled.
- It claims the `branch` feed, so a second Branch source in the same Junction is misconfiguration.
- `dispose()` unsubscribes. react-native-branch 7 still wires the listeners of a subscription that unsubscribed before its cached check settled, and can never remove them; Junction ignores whatever they deliver.

## Tests

- **Ran**: the source through a real Junction against an in-process fake of react-native-branch 7.0.0, modelled on its subscriber: the first-subscriber cached launch session, live listeners wired after that check, errors through `onOpenComplete`, and the late wiring after an early unsubscribe; the conformance suite; type contracts against react-native-branch 7.0.0's declarations.
- **Did not run**: a device, Branch's native SDK or its servers. Whether a link resolves, and whether a deferred link matches, is decided by Branch.

## License

MIT

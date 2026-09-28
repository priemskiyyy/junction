# @priemskiyyy/junction-expo-quick-actions

Expo quick action entry points for Junction: the home screen action that launched the app and every one chosen later, through the expo-quick-actions module your app already set up. The source only listens: it never sets, clears or queries your app's items.

## Installation

```sh
pnpm add @priemskiyyy/junction @priemskiyyy/junction-expo-quick-actions
```

## Create a Junction

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { quickActions } from "@priemskiyyy/junction-expo-quick-actions";
import * as QuickActions from "expo-quick-actions";
import { z } from "zod";

export const junction = new Junction({
  intents: {
    newDocument: intent(z.object({ folderId: z.string() })),
  },
  sources: { shortcuts: quickActions({ sdk: QuickActions }) },
  routes: ({ from }) => ({
    compose: from.shortcuts.event({
      intent: "newDocument",
      match: ({ action }) => action.id === "compose",
      payload: ({ action }) => ({ folderId: action.params.folderId }),
    }),
  }),
});

junction.start();
```

## Options

| Option | Type               | Description                                                                                                                                                         |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`  | `QuickActionsLike` | The expo-quick-actions module, `import * as QuickActions from "expo-quick-actions"`. The source reads only `initial`, and calls `addListener()` and its `remove()`. |

## Capabilities

| Capability           | Support                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Launch read          | `initial`, once the listener exists: the action that launched the app, which the module keeps for the life of the process. |
| Live events          | Yes: every action chosen while the app runs or waits in the background.                                                    |
| Deferred links       | None: a quick action is never deferred.                                                                                    |
| Interaction identity | None: an action's id names the item, not the press, so every action is a new intent.                                       |
| Native detach        | The subscription's `remove()`, on `dispose()`.                                                                             |
| Platforms            | iOS and Android. On web, expo-quick-actions has no launch action and delivers none.                                        |

## How an event is mapped

| expo-quick-actions hands the listener or answers `initial` | The source                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| an `Action`                                                | pushes `{ input: { action: { id, params } } }`, `params` `{}` when it has none |
| `null` or `undefined` from `initial`                       | an empty launch                                                                |

`action.id` is the item's `id` and `params` its `params`, as your app gave them. The title, subtitle and icon are display, and the source leaves them out. A value the item did not carry is missing, and a required schema field refuses the intent.

## Native configuration

Junction configures nothing. Your app provides the items: `setItems()` at runtime on both platforms, or static iOS items through the expo-quick-actions config plugin's `iosActions`. expo-quick-actions supports no static Android items.

## What Junction does not normalize

- **The launch action stays for the life of the process.** The module reads it once when it loads and has no way to clear it, so a JavaScript reload, `Updates.reloadAsync()` included, delivers the same action again as a new launch read.
- **The launch action can arrive twice on iOS.** iOS can also perform the action that launched the app through the app delegate once the app runs, and expo-quick-actions hands that to the listeners JavaScript has by then. When Junction already listens, the same action becomes a second intent, since nothing tells the two deliveries apart.
- **One owner per action.** `useQuickActionCallback()`, `useQuickActionRouting()` or a listener of your own handles the same action again. Route actions through Junction only.

## Behavior

- Creating the source listens to nothing and reads no action.
- `start()` adds the listener synchronously, then reads `initial`.
- It claims the `quick-actions` feed, so a second expo-quick-actions source in the same Junction is misconfiguration.
- `dispose()` removes the listener and touches the module no further.

## Tests

- **Ran**: the source through a real Junction against an in-process fake of expo-quick-actions 6.0.2, modelled on its launch action read once as a constant and never cleared, its emitter that drops an action when JavaScript has no listener, and the launch action reaching a listener too; the conformance suite; type contracts against expo-quick-actions 6.0.2's declarations.
- **Did not run**: a device or a home screen. When iOS and Android deliver an action is decided by the platform.

## License

MIT

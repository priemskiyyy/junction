# @priemskiyyy/junction-expo-notifications

Expo notification entry points for Junction: every press on a notification or one of its actions, the press that launched the app included, through the expo-notifications module your app already set up. The source only listens: it never schedules, presents, dismisses or badges a notification, and never clears the response Expo keeps.

## Installation

```sh
pnpm add @priemskiyyy/junction @priemskiyyy/junction-expo-notifications
```

## Create a Junction

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { notifications } from "@priemskiyyy/junction-expo-notifications";
import * as Notifications from "expo-notifications";
import { z } from "zod";

export const junction = new Junction({
  intents: {
    openDocument: intent(z.object({ documentId: z.string() })),
  },
  sources: { presses: notifications({ sdk: Notifications }) },
  routes: ({ from }) => ({
    document: from.presses.event({
      intent: "openDocument",
      match: ({ action }) =>
        action.id === Notifications.DEFAULT_ACTION_IDENTIFIER,
      payload: ({ data }) => ({ documentId: data.documentId }),
    }),
  }),
});

junction.start();
```

## Options

| Option        | Type                        | Description                                                                                                                                                                                                   |
| ------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`         | `NotificationsLike`         | The expo-notifications module, `import * as Notifications from "expo-notifications"`. The source calls only `addNotificationResponseReceivedListener()`, its `remove()`, and `getLastNotificationResponse()`. |
| `interaction` | `"per-notification-action"` | Off by default. With it, one action on one notification is one occurrence for the installation, so a second delivery of it is a duplicate.                                                                    |

## Capabilities

| Capability           | Support                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Launch read          | `getLastNotificationResponse()`, once the listener exists: the press that launched the app, or the last press your app has not cleared.           |
| Live events          | Yes: every press while the app runs, in the foreground or brought back from the background.                                                       |
| Deferred links       | None: a press is never deferred.                                                                                                                  |
| Interaction identity | Opt-in, with `interaction: "per-notification-action"`: the notification's identifier and the action's. None by default, as the reasons below say. |
| Native detach        | The subscription's `remove()`, on `dispose()`.                                                                                                    |
| Platforms            | iOS and Android. On web, expo-notifications delivers no press and its launch read throws, which the source's status reports.                      |

## How an event is mapped

| expo-notifications hands the listener or the launch read | The source                                                                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| a `NotificationResponse`                                 | pushes `{ input: { notification: { id, category }, action: { id, text }, data } }`                                            |
| the same, with `interaction: "per-notification-action"`  | claims the key of the notification's identifier and the action's for the installation, unless the pair exceeds 160 characters |
| `null` from `getLastNotificationResponse()`              | an empty launch                                                                                                               |

`notification.id` is the request's `identifier` and `category` its `categoryIdentifier`, `null` when it has none. `action.id` is the `actionIdentifier`, `Notifications.DEFAULT_ACTION_IDENTIFIER` for a tap on the notification itself, and `action.text` is what the user typed into a text input action, `null` otherwise. `data` is the content's `data`, `{}` when absent. A value the notification did not carry is missing, and a required schema field refuses the intent.

## Native configuration

Junction configures nothing. Presses reach the app once it is set up for notifications: the `expo-notifications` config plugin, a notification channel on Android, and the categories whose actions you route, registered with `setNotificationCategoryAsync()`. Permissions, push tokens and the notification handler stay with your app.

## What Junction does not normalize

- **Expo keeps the last press until your app clears it.** `getLastNotificationResponse()` answers the same press for as long as the native process lives, so a JavaScript reload in development, or another Junction started in the same process, reads it again. Call `Notifications.clearLastNotificationResponse()` once your handler handled the press. With `per-notification-action` on a persistent intent, the second read is a duplicate for a day.
- **A press can arrive twice at launch.** Native keeps the press and also emits it to the listeners JavaScript has, so a press handled just as `start()` adds the listener reaches both. By default those are two intents, and with `per-notification-action` the second is a duplicate. Expo's own `useLastNotificationResponse()` compares notification identifiers for the same reason.
- **A notification identifier is not an occurrence.** `scheduleNotificationAsync()` takes your own identifier, which a later notification may reuse, and Android keeps a notification with `autoDismiss: false` for a second press. That is why `per-notification-action` is a policy you opt into, not a default.
- **One owner per press.** A press your app also handles elsewhere, with its own response listener or `useLastNotificationResponse()`, runs twice. Route presses through Junction only.
- It never observes notifications that arrive without a press; `addNotificationReceivedListener()` stays with your app.

## Behavior

- Creating the source listens to nothing and reads no response.
- `start()` adds the response listener synchronously, then reads the kept response, so no press falls between the two.
- It claims the `notifications` feed, so a second expo-notifications source in the same Junction is misconfiguration.
- `dispose()` removes the listener and touches the module no further.

## Tests

- **Ran**: the source through a real Junction against an in-process fake of expo-notifications 57.0.21, modelled on its kept last response, its emitter that drops a press when JavaScript has no listener, and the press that reaches both the kept response and a listener added just then; the conformance suite; type contracts against expo-notifications 57.0.21's declarations.
- **Did not run**: a device, APNs or FCM. When a press reaches JavaScript, and whether native keeps it, is decided by the platform.

## License

MIT

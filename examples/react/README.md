# Intent Lab, a Junction example in React

The Intent Lab puts Folio, a small documents app, on a phone inside the page, beside what Junction sees of it. Every entry point reaches Folio through a real adapter from [`packages/adapters`](../../packages/adapters), listening to an in-page simulation of its SDK, and every simulation shares one world: two people, two workspaces, Folio's service and the device's storage. Nothing leaves your browser.

```sh
pnpm install
pnpm build
pnpm --filter example-react dev
```

The packages are linked from the workspace, so build them first.

## The tour

The page walks through five sections, each with a "Try this" hint:

1. **Open Folio from outside.** Messages with links, two notifications with their actions, the home screen shortcuts and an invite install sit beside the phone. Tap one while Folio runs, or after swiping it away: then Folio launches cold, and the source reads what it launched from. **Latest intent** shows Junction's answer, the intent's route and provenance, the payload after its schema, and every step of its journey.
2. **Who takes it, and why it waits.** The inbox is `useInbox()`, each entry with its state, the reason it waits in plain words, its deadline, and Retry or Cancel. Beside it, `junction.diagnostics` shows the screens that take intents: Folio's shell as the fallback, and each pane for its own workspace. Two panes on one workspace are an ambiguity Junction waits out, and a pane with unsaved changes holds what it owns.
3. **Checked at the door.** `junction.inspect()` over any link: the route and the payload it would make, or why nothing would, from a lookalike host to an id the schema refuses.
4. **One occurrence, one intent.** Two taps on one link are two intents. One notification press the platform hands over twice is one, because the adapter reports its notification and action as the occurrence.
5. **Break it, and watch.** Slow or offline documents, failing storage writes, a launch press delivered twice, a restart, a scrambled saved inbox, and a clock that skips past every deadline. Each action says afterwards what Junction kept true. The timeline is `junction.diagnostics.events` across every launch, and its SDK calls tab shows that the adapters only listen, while Folio's own code starts Adjust.

**Reset lab** in the header starts over.

## The sources

| Source          | Adapter                                                           | Simulated SDK                                                                                          |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `links`         | `linking()` from `@priemskiyyy/junction-react-native`             | React Native's `Linking`: the URL Folio launched from, and links opened while it runs                  |
| `notifications` | `notifications()` from `@priemskiyyy/junction-expo-notifications` | expo-notifications: the press native keeps, and, with the switch on, that press handed over twice      |
| `shortcuts`     | `quickActions()` from `@priemskiyyy/junction-expo-quick-actions`  | expo-quick-actions: `initial` for the shortcut Folio launched from, and later ones                     |
| `installs`      | `adjust()` from `@priemskiyyy/junction-adjust`                    | react-native-adjust: the deferred deep link callback, which the attribution calls after a first launch |

## Folio's intents

| Intent          | Payload                                               | Runs for                     | Survives a restart | Comes from                                   |
| --------------- | ----------------------------------------------------- | ---------------------------- | ------------------ | -------------------------------------------- |
| `openDocument`  | `workspaceId`, `documentId`                           | whoever signs in             | yes                | `https://` and `folio://` links              |
| `openComment`   | `accountId`, `workspaceId`, `documentId`, `commentId` | the person the mention names | no                 | a tap on a mention notification              |
| `newDocument`   | `template`                                            | whoever signs in             | no                 | the New document and Meeting notes shortcuts |
| `joinWorkspace` | `inviteId`, `workspaceId`                             | whoever signs in             | yes                | the invite's deferred link                   |

## How it fits together

| File                                                                | Role                                                                                                                              |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.tsx`                                                      | Creates the lab once, outside React, and renders it.                                                                              |
| `../shared/lab/createIntentLab.ts`                                  | The lab: launches Folio as a new process with a new Junction, quits it, and keeps the timeline, the intents it saw and the knobs. |
| `../shared/junction/createFolioJunction.ts`                         | Folio's Junction: the four sources, their routes, the signed-in identity and the storage.                                         |
| `../shared/junction/folioIntents.ts`                                | The intents, their Zod schemas, their account binding and what persists.                                                          |
| `../shared/folio/handlers/`                                         | The four handlers, which both examples register: each awaits Folio's service, then commits, rejects or asks to retry.             |
| `../shared/device/`                                                 | The phone: a process per launch with fresh simulated SDKs, and the log of what each SDK was asked and handed over.                |
| `../shared/storage/createLabStorage.ts`                             | An `InboxStorage` over the device's storage, which outlives every launch.                                                         |
| `src/Application.tsx`                                               | Publishes the current launch's Junction with `JunctionProvider`; the hooks follow it across restarts.                             |
| `src/components/Folio/`                                             | Folio's screens. `FolioShell` registers the fallback and the other consumers; each `WorkspacePane` its own.                       |
| `src/components/{Latest,Inbox,Inspector,Occurrences,Lab,Timeline}/` | The panels around the phone, each reading Junction through the binding's hooks.                                                   |

## Tests

`pnpm vitest run --project example-react` drives the page through its buttons, a flow per test, with fake timers under Junction's clock. `pnpm test:examples` builds the example and runs it in Chromium at 375 and 1280 pixels, with no page errors and no horizontal scroll.

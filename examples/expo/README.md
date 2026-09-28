# Intent Lab on Expo

Folio from the [React example](../react/README.md), rebuilt on React Native with [`@priemskiyyy/junction-react`](../../packages/react), the same provider and hooks the web uses: there is no separate React Native binding. The lab is the same one from `example-shared`, with one difference: the `links` source listens to the device's own `expo-linking`, so a link opened on the device reaches Junction through the real module. Notifications, shortcuts and the invite install stay simulated. Folio's live screen sits above the entry points, so every tap shows what Junction did with it.

```sh
pnpm install
pnpm build
pnpm --filter example-expo dev
```

The packages are linked from the workspace, so build them first.

## How it fits together

| File                                           | Role                                                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`                                    | Creates the lab once, outside React, over this device's own `expo-linking` (simulated on the web), and wraps the root in `SafeAreaProvider`.                    |
| `app.json`                                     | Registers the `folio` scheme, so a development build's links come back to it.                                                                                   |
| `src/Application.tsx`                          | Publishes the current launch's Junction with `JunctionProvider`, lays out the header, the four tabs, the answer toast and the tab bar.                          |
| `src/components/Try/`                          | Folio's live screen above the entry points: links, notifications, home screen shortcuts and an invite.                                                          |
| `src/components/Folio/`                        | Folio's screens in React Native's primitives, over the handlers `example-shared` holds. They stay mounted on every tab, so their consumers keep owning intents. |
| `src/components/Inbox/`, `Timeline/`, `Break/` | `useInbox()` with retry and cancel, the diagnostics timeline by launch, and the knobs that break Folio's world.                                                 |
| `src/components/Chrome/`                       | The header, the tab bar with the inbox count, and the toast that tells how Junction answered, why an intent waits and how it ended.                             |
| `src/utils/linking/createDeviceLinking.ts`     | The device's own Linking for the lab: links open as `Linking.createURL()` builds them, and Expo Go's `exp://…/--/` URLs reach Junction in Folio's form.         |
| `src/utils/constants/`                         | Folio's links, the palette (Tailwind's zinc and violet, as the web lab uses them), fonts, tabs and layout sizes.                                                |

Links are real on iOS and Android. In Expo Go a project's links are `exp://<host>/--/<path>`, under Expo Go's own scheme, so the app builds them with `Linking.createURL()` and hands Junction Folio's `folio://` form of what arrives: the application owns its SDK and decides what reaches Junction. A development build opens `folio://` links directly. The URL Expo Go or a development build launches the app with is not a Folio link, so no route takes it and Junction ignores it. On the web the page's URL belongs to the router, so the links source stays simulated there.

On a device the OS owns the launch URL, so a link opens Folio's lab only while the app runs, and the link that launched the app is its launch read on every launch the lab makes, as it is after a JavaScript reload.

## Tests

Expo is typechecked (`pnpm --filter example-expo lint:typescript`) and bundled (`pnpm --filter example-expo build` for the web, `build:native` for iOS and Android); `pnpm check` runs neither on a device. It was last run by hand in Expo Go on an iOS 26 simulator, with links opened through the OS, and on the web at a phone's size.

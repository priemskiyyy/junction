# Example applications

Both examples are the same lab: Folio, a small documents app, where links, notification presses, home screen shortcuts and an invite install become typed intents that Junction delivers to the screen that owns them. Every entry point goes through a real Junction adapter; the lab simulates the SDK underneath it, and breaks Folio's world on request.

Run `pnpm build` from the repository root first. The examples import the built packages.

| Example        | Run                               | What it shows                                                                                                                                          |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [React](react) | `pnpm --filter example-react dev` | The full tour: Folio on a phone beside Junction's answer, the inbox and why each intent waits, a link inspector, duplicates, the lab and the timeline. |
| [Expo](expo)   | `pnpm --filter example-expo dev`  | The same lab on React Native, where the links source listens to the phone's own `expo-linking`.                                                        |

## Shared code

`examples/shared` is the `example-shared` workspace package:

- `folio/` holds the product: the people, workspaces and documents, Folio's in-page service with its latency and outage, Folio's state for one launch, and the four intent handlers both examples register.
- `device/` holds the phone: one process per launch with fresh simulated SDKs, what the device keeps across launches, and the log of every SDK call and hand-off.
- `junction/` holds Folio's Junction: the intents and their schemas, the sources over the SDKs it is given, and the routes.
- `storage/` holds an `InboxStorage` over the device's storage, which can fail its writes or be scrambled.
- `lab/` holds the lab: launches and quits, the timeline across launches, the knobs, their notices and the experiments.
- `formatting/` and `ui/` hold every Junction state in plain words, the tones, the Tailwind theme and the class recipes.

Nothing leaves the page: Folio's server, the storage and every SDK run inside it, and no provider account is needed.

## Tests

`pnpm vitest run --project example-react` and `--project example-shared` run the unit tests, which `pnpm test:unit` includes. `pnpm test:examples` builds the React example and drives it in Chromium with Playwright at phone and desktop widths. The Expo app is typechecked by `pnpm lint:typescript` and bundled with `expo export`; nothing here runs it on a device.

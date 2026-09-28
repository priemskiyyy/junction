---
description: "The Intent Lab: Folio, a documents app on a simulated phone, where every Junction rule is one button away, in React for the web and in React Native with Expo."
---

<script setup>
import { withBase } from "vitepress";
</script>

# The Intent Lab

The Intent Lab puts Folio, a small documents app, on a phone inside the page, beside what Junction sees of it. Links, notification presses, home screen shortcuts and an invite install reach Folio through the real Junction sources, each listening to a simulated SDK. Nothing leaves the page, and there is nothing to configure.

<a :href="withBase('/demo/')" target="_blank" rel="noreferrer">Open the Intent Lab</a>, the React example running entirely in the page.

## What it shows

| Section                        | What you try                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Open Folio from outside        | A link that launches Folio cold waits for sign-in, then opens for whoever signs in, with its full journey.  |
| Who takes it, and why it waits | Two panes claiming one link, a pane with unsaved changes, a mention for another account, and retry.         |
| Checked at the door            | `junction.inspect()` over any link: a lookalike host, an id the schema refuses, a link with a password.     |
| One occurrence, one intent     | Two taps on a link are two intents; one notification press delivered twice is one.                          |
| Break it, and watch            | Slow and failing services, failing storage writes, a restart, a scrambled saved inbox, and a skipped clock. |

## Run it

```sh
pnpm install
pnpm build
pnpm --filter example-react dev
```

The Expo version is the same lab on React Native, where the links source listens to the phone's own `expo-linking`:

```sh
pnpm --filter example-expo dev
```

The code lives in [`examples/`](https://github.com/priemskiyyy/junction/tree/main/examples): the shared lab runtime, the four intent handlers both apps register, and each app's components.

# Getting help

Start with [getting started](docs/getting-started.md), [diagnostics](docs/diagnostics.md) and the [verification matrix](docs/verification.md). Each source has its own README under [packages/adapters](packages/adapters), with what its provider does that Junction does not normalize.

For a bug report, include:

- The smallest example that reproduces the issue, ideally over `createMockSource` from `@priemskiyyy/junction/mock`.
- The Junction, source, provider SDK, React and React Native or Expo versions, and the platform: iOS, Android or the web, cold start or warm.
- The options involved: `intents` and their options, `sources`, `routes`, `identity`, `storage` and `timeout`.
- What Junction answered: the admission of a `dispatch`, the inbox entry with its `state` and `waiting` reason, and `junction.diagnostics.get()`.
- The diagnostic events around it, from `junction.diagnostics.events`.
- Whether it happens before `start()`, while the stored inbox restores, across a sign-in or an account switch, or after `dispose()`.

Use [GitHub issues](https://github.com/priemskiyyy/junction/issues) for reproducible bugs and feature requests. Diagnostics carry no payload, URL or account, so they are safe to share as they are. Remove tokens, keys and personal data from anything else you paste, links included.

If a link never reaches Junction, check first whether the provider's own listener receives it without Junction. Link association, attribution and deferred matching are the provider's.

See [CONTRIBUTING.md](CONTRIBUTING.md) to run the test suites or propose a change.

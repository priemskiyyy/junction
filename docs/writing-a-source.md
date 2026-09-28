---
description: "A source is a plain object over an SDK your app already set up. The contract, the rules every shipped source follows, and the conformance suite that holds a source of your own to them."
---

# Writing a source

A provider Junction does not ship is a source of your own: a plain object over the SDK your app already set up. It translates what the SDK reports onto Junction's contract, and nothing more.

```ts
import type { IncomingSource } from "@priemskiyyy/junction";

type Press = { campaignId: string; params: Record<string, string> };

type PushSdk = {
  addPressListener: (listener: (press: Press) => void) => () => void;
  getLaunchPress: () => Promise<Press | null>;
};

export const pushPresses = (sdk: PushSdk): IncomingSource<Press, PushSdk> => ({
  name: "push-presses",
  native: sdk,
  resource: "push-presses",
  attach: (sink) => {
    const remove = sdk.addPressListener((press) => {
      sink.push({ input: press });
    });

    return {
      initial: async () => {
        const press = await sdk.getLaunchPress();

        if (press === null) {
          return null;
        }

        return { input: press };
      },
      dispose: remove,
    };
  },
});
```

## The contract

- `name` names the adapter in diagnostics. `native` is the SDK, typed as your own, which `junction.source(key).native` returns. `resource` is the exclusive native feed it listens to, or `null`: two sources of one Junction may not claim the same one.
- `attach(sink)` is called once by `start()`, synchronously. It installs the listener before it returns, so an SDK that needs its listener early gets it, and it may push or fail from inside `attach`: what it pushes is admitted, and what it reports shows on the status, once it returns.
- `sink.push(observation)` answers with the admission. An observation is `{ input, deferred?, interaction? }`: the input under the provider's own names, the provider's claim about deferral, and an occurrence key when the provider documents one.
- `sink.fail(error)` reports a provider error on the source's status and keeps it attached.
- `initial()` is the launch read: the entry point that launched the app, as an observation, `null` for none, a throw for a failed read. Junction calls it once, after the listener exists, stamps the receipt when the read starts, and times it out with `timeout.initial`; a late answer is still admitted, as the launch.
- `dispose()` removes every listener `attach` installed. It never shuts the SDK down, and Junction ignores whatever arrives after it anyway.

A breach of the contract is contained: an `attach` that throws or answers something other than an attachment fails that source alone, a launch read that answers something other than an observation fails the read, a push that is not an observation, or whose fields throw when read, is refused as `invalid-input`, and a `deferred` that is not a boolean is kept as no claim.

## The rules

1. **The factory is cold.** Creating the source reads nothing, subscribes to nothing and calls nothing.
2. **Take the SDK the app set up.** Never import the provider at runtime, and never initialize, configure or close it. Type it structurally, naming only what the source calls.
3. **Push only what the provider positively reports as actionable.** Report an error through `fail`; ignore a no-match, an unknown result and a progress callback. Never infer success from the absence of an error.
4. **Claim an occurrence only with evidence.** `interaction.key` is for an identifier the provider documents as one occurrence, so a replay of it is a duplicate. A link, a campaign, a timestamp or a counter is not one, and a notification can be pressed again. `scope: "installation"` keeps a key across restarts for a persistent intent, whose ledger is stored, and `"runtime"` only for this JavaScript runtime.
5. **Keep the input plain.** A bounded snapshot of plain data, never an SDK object: the route reads it, and a URL route needs `url: string`.
6. **Never change the provider.** No consent, identity, cache clearing or `openURL`.

## Test it

`testIncomingSource` from `@priemskiyyy/junction/testing` holds a source to the contract through a real Junction: coldness, attachment, the launch read, pushes, misses, and the listeners dispose removes.

<!-- snippet: fragment -->

```ts
import { testIncomingSource } from "@priemskiyyy/junction/testing";

testIncomingSource({
  name: "push presses",
  createFixture: () => {
    const fake = createFakePushSdk();

    return {
      source: pushPresses(fake.sdk),
      native: fake.sdk,
      open: () => fake.press({ campaignId: "c-1", params: {} }),
      launch: () => fake.launchWith({ campaignId: "c-1", params: {} }),
      listeners: fake.listeners,
    };
  },
});
```

The fake must model what the suite exercises: a fake that does not implement a behavior makes its test vacuous. `createMockSource` from `@priemskiyyy/junction/mock` is a correct source for testing your app, and one that misbehaves on purpose for testing Junction's containment.

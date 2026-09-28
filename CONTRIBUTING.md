# Contributing

Use Node 22.18 or newer and the pnpm version in `package.json`. Run `pnpm install --frozen-lockfile`, then `pnpm check` before submitting a change, and read its output. `pnpm check` builds every package, then runs TypeScript, ESLint, the lint-rule probes and the inferred-`any` scan, Prettier and the unit tests.

## Layout

- `packages/core`: the runtime, published as `@priemskiyyy/junction` with the `./mock` and `./testing` subpaths.
- `packages/react`: the React and React Native binding.
- `packages/adapters/*`: one source package per provider SDK API, published as `@priemskiyyy/junction-<name>`. Packages share nothing privately.
- `packages/integrations/*`: bridges to sibling libraries, such as the Silo storage.
- `examples/*`: the Intent Lab, one mock-powered lab of the races Junction handles.
- `docs/`: the VitePress site.
- `scripts/`: the repository checks. `verify-lint-rules.mjs` lints probes with the real ESLint config and proves every rule in both directions; `verify-no-any.mjs` fails on a binding that infers `any`.

Runtime owners and helpers live in `src/utils/`, shared helpers in `src/utils/common/`, constants in `src/utils/constants/<topic>.ts` as UPPER_SNAKE values, and public types in `src/types/`, one type per file. Internal contracts belong in each folder's `internal/` directory, so `src/types/internal/` holds the types no consumer sees and `src/utils/internal/<topic>/` the machinery no consumer may import. The core's mock source and storage live in `src/mock/` and the conformance suites in `src/testing/`. Typecheck-only expectations sit beside their sources as `*.contracts.ts`, and `tests/types/` holds the consumer-view type tests that the root `tsc` checks.

Package roots export the supported public API explicitly, one export per file and no `export *`, and no other file is a barrel. The entry points are `src/index.ts` and the core's `src/mock.ts` and `src/testing.ts`. `src/index.test.ts` pins each entry's runtime names with `Object.keys`.

Every `exports` entry is `types`, then `import`, then `default`, with `import` and `default` on the same ESM file, because React Native consumers run Jest, which needs a resolvable condition. Every package is version `0.1.0` under the MIT license, and the core has zero runtime dependencies.

## Code

ESLint enforces every rule it can check, and `pnpm test:lint` proves each one with a probe it must reject and, where a rule has exceptions, one it must allow. Change a rule and its probes together.

- **ESLint** (the siblings' rules): `type` over `interface`, no `enum`, `switch`, `any`, `as` (including `as const`), angle-bracket assertions, non-null `!`, `void` operator, `??=`, `||=`, `&&=`, `readonly` in any form (`Readonly<>`, `readonly T[]`, readonly fields and mapped modifiers), `export *`, relative imports, re-exports outside `index.ts`, `mock.ts` and `testing.ts`, `.filter().map()` and `.map().filter()`, or a ternary as a return value (`return a ? b : c` or an arrow whose body is one); `curly: all`; `no-else-return`; `consistent-type-imports`; no inline ESLint configuration; React Native's missing `AbortSignal` members (`throwIfAborted()`, the static helpers, `reason`); `Date.now()`, `new Date()` and `performance.now()` in package sources, because every clock read goes through the `now` option (`new Junction({ ..., now })`, `Date.now` by default, held by `utils/internal/runtime/Clock.ts`); and the blank-line rule around declarations, blocks and returns. Every restriction carries a message naming the alternative. `react-hooks` recommended rules on React files.
- **Comments**: none, except a provider quirk or a workaround the code cannot say, in one line. No narration and no design-log references in code. Public exports (the runtime values each entry point exports, the members of `Junction`, source factories, binding components and hooks, and every type an entry point exports) carry a JSDoc of one or two sentences and an `@example`; a field of a public type whose contract its name cannot say carries a one-line JSDoc. A constant in `utils/constants/` carries a one-line JSDoc naming the fact it encodes. Other internal types, internals and tests carry none. A test's `@ts-expect-error` states its reason.
- **Code**: early returns and no `else` after a return, and never a ternary as a return value: an `if` that returns early, then the other return; `typeof x === "function"` guards; exhaustive union dispatch closed by `assertUnreachable`, or a `satisfies Record<...>` table for a pure mapping; helpers named for exactly what they return or do, never with a vague verb (`getCanonicalPayload`, not `readPayload`; `parseUrl`, not `readUrl`), a one-line helper with one caller inlined; handlers named `handle*`; arrow functions exported one per file; classes only for stateful owners, with `#private` fields, public members as arrow fields and private helpers as `#method()`; no default exports; no module-level mutable state; no `process.env`; `src/...` imports inside a package; grouped options; published data frozen at runtime; one `.flatMap()` with early returns (`return []` to skip, `return [value]` to keep) instead of `.filter().map()` or `.map().filter()`. No runtime complexity for what the contract or the types already guarantee: what the types enforce is never checked again at runtime, and only what no type can say (ranges, grammar, values from outside) is checked. No generic guard helpers (`isRecord`, `isThenable`, `isPromiseLike`, `isObject` and the like): they claim a type they cannot prove. Trust the declared type where the type is the contract (options, adapter answers, SDK returns, schema results), and contain the failure when a caller breaks it. Where a genuine runtime boundary needs a check, write the precise one the case needs: `isPlainObject` for data being copied, a comparison on the discriminant, `Array.isArray`, or assimilating a possible promise through `new Promise((resolve) => resolve(value))` inside a `try`.
- **Data**: a lifecycle discriminates on `state`, an answer or outcome on `status`, a payload on `kind`. Public discriminant and reason values are lowercase, multiword ones kebab. Internal state machines use `UPPER_CASE` states. Error codes are UPPER_SNAKE. Published data uses `T | null` for an absent value; inputs use optional fields. Identifiers live in their object: `intent: { id, name }`, `attempt: { id }`, `account: { id }`, `source: { name }`, `adapter: { name }`. Time is a `number` of epoch milliseconds named `timestamp`, and a deadline is `expires: { at }`. Durations are milliseconds with no suffix. Published data is frozen at runtime. Types carry no `readonly`.
- **Tests**: `<Source>.test.ts` beside the source, flat `test()` calls named as the invariant they guard, `globals: false`, no `describe` outside the conformance suites, assertions on specific values and call arguments, fake timers only for time-based rules with `vi.useRealTimers()` in `afterEach`, interleaving by reentrancy and held mock calls, never by sleeping. A new test is watched failing before it is trusted.
- **Prose**: keep sentences concise and use commas, colons or separate sentences instead of em dashes.
- **Carve-outs**, each with a one-line comment and nothing wider: the `Register` interface and its augmentations (the binding's own tests', the consumer type tests', the examples'); the one `describe` in each conformance suite; method syntax on `IntentDefinition` members, on the route option types and the internal registration's handler and matcher, so one table holds every intent's, and on `*Like` members that need bivariance; the overloaded function signatures of `intent`, as Trace's `event`; the overload pairs of `resolveSource` behind `Junction.source` (as Trace's `resolveDestination`), `createRouteBuilders` and `getTypedInbox`, which restore the relations a lookup by name erases; and the overloads of `useInbox`, whose return type depends on whether a selector is given, as Anchor's `useSession`.

Junction never throws into its host at runtime. The only synchronous throws are `JunctionError` `INVALID_CONFIGURATION` for misconfiguration and misuse, and `STALE_EXECUTION` and `ALREADY_SETTLED` into a handler that misused its own execution. Every operation answers with a result, every adapter call, schema, mapper, predicate and listener is contained, and a failure becomes a result, a state or a diagnostic.

## Sources

A source is a plain `{ name, native, resource, attach }`, and `attach` returns an attachment with an optional `initial` launch read and an optional `dispose`. It translates one provider SDK onto the contract and nothing more. The rules:

1. **The factory is cold.** Creating the source reads nothing, subscribes to nothing and calls nothing. It may run at module scope.
2. **Take the SDK the application set up.** The option is `sdk`, typed structurally as `<Name>Like`, naming only what the adapter calls. Never import the provider at runtime, never initialize, configure or close it. A typecheck-only `<name>.contracts.ts` assigns the real SDK to the structural type, proves `native` keeps the real type, and refuses a wrong object with `@ts-expect-error`.
3. **`attach` is synchronous.** It installs the provider's listener before it returns, so an SDK that needs its listener before initialization gets it. It may push from inside `attach`.
4. **`initial` reads the launch snapshot**, after the listener exists, as an observation, so it can claim deferral or an occurrence like any push. `null` is an empty launch; a throw is a failed read. The core calls it once, times it out and stamps the receipt with the moment it started.
5. **Push only what the provider positively reports as actionable.** An error goes through `sink.fail`; a no-match, an unknown result variant and a progress callback are ignored. Never test success negatively.
6. **Claim an interaction only with evidence.** `interaction` is only for an identifier the provider documents as one occurrence. A link id, a notification id, a campaign id, a timestamp or a counter is not one.
7. **Normalize plain data.** The input is a bounded plain snapshot under the provider's own names, never an SDK object.
8. **Never call what changes the provider.** No initialization, consent, identity, cache clearing or `openURL`.
9. **Silence after dispose.** `dispose` removes every listener the adapter installed and never shuts the SDK down. The core ignores late callbacks anyway.
10. **Types before runtime checks.** What the types enforce is not checked again at runtime.
11. **Methods of `<Name>Like` use property syntax.** Method syntax only on a member that needs parameter bivariance, with the one-line reason "A method, so that ...".

Every source package has this layout:

```text
packages/adapters/<name>/
  LICENSE  README.md  package.json  tsconfig.json  tsdown.config.ts
  src/index.ts                     the factory and the public types, nothing else
  src/<factory>.ts                 the factory alone; every helper with logic lives in src/utils/
  src/<factory>.test.ts            mapping, recognition, coldness, native, disposal
  src/<factory>.contracts.ts       typecheck only, against the real SDK
  src/conformance.test.ts          testIncomingSource
  src/index.test.ts                expect(Object.keys(api)).toEqual([...])
  src/fake<Sdk>.fixture.ts         an in-process fake modelled on a named SDK version
  src/types/<Name>SourceOptions.ts
  src/types/<Name>Like.ts
  src/types/<Name>Input.ts
  src/utils/constants/<topic>.ts   provider names and fixed values, UPPER_SNAKE, each with a one-line JSDoc
  src/utils/<helper>.ts            one arrow per file, named for what it returns or does, with its test beside it
```

Its `package.json` has no `dependencies`: the core is a peer at `>=0.1.0 <0.2` plus a `workspace:*` dev dependency, and the provider SDK is an optional peer, pinned exactly only as a root dev dependency. It sets `sideEffects: false`, the description "<Provider> entry points for Junction: <what the source observes>, over the <sdk> you inject.", and the keywords provider, platform, then `typescript`, `junction`, `deep-linking`. Its README has, in order: `# @priemskiyyy/junction-<name>`, one paragraph, Installation, Create a Junction, Options (table), Capabilities (table: launch read, live events, deferred links, interaction identity, native detach, platforms), How an event is mapped (table), Native configuration, What Junction does not normalize, Behavior (bullets), Tests (what ran and what did not), License.

## Testing

`pnpm test:unit` runs one Vitest project per package, each with a `src` alias onto its own source. Every folder under `packages/adapters` and `packages/integrations` with a `package.json` is a project without being listed. Adapter and binding tests import the core by its package name, so run `pnpm build` first.

A new test is watched failing once before it is trusted. When the implementation came first, break it on purpose and confirm the test goes red. A bare `toHaveBeenCalled()` is not an assertion; assert the calls with their arguments. A `@ts-expect-error <reason>` suppresses only the next line, so on a multi-line literal it sits on the line where the error is reported; TS2578 is a failing negative case, and a negative case counts only when the whole file compiles to exit 0. Assert the property, never a bound on it, and never through a call that returns `any` (`Reflect.apply`, `JSON.parse`): call directly with `@ts-expect-error <reason>`. A fake that does not implement the behavior under test makes that test vacuous.

## Documentation

Documentation examples must compile against the current API. Use commas, colons or separate sentences instead of em dashes.

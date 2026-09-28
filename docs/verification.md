---
description: "How each claim of Junction is checked: unit and invariant tests, interleaving sweeps, type contracts against the real SDKs, conformance suites, mutation runs, the Intent Lab's flow tests, and what was never run."
---

# Verification matrix

Every claim these pages make is checked by something that runs. `pnpm check` runs the build, the typecheck, the lint rules and their probes, the formatting and every test; `pnpm check:release` adds the documentation, the packages as published and a mutation run.

| What                               | How it is checked                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The URL grammar                    | Unit tests of every refusal and every normalization, patterns and URLs alike.                                                                                     |
| Canonical payloads                 | Unit tests of the bounds, `-0`, class instances, sorted text and freezing.                                                                                        |
| Routing and admission              | Tests of exclusive routes, origin ownership, the ledger's duplicates and conflicts, the limits and `inspect()`.                                                   |
| Ownership, readiness and execution | Tests of the selection table, invalidation by every cause, the commit latch, stale executions and the blocked slot.                                               |
| Reentrancy                         | Tests of listeners that cancel, dispose, dispatch or sign out inside a scheduler turn, and handlers that do.                                                      |
| Delivery invariants                | An interleaving sweep, with fast-check, of random orders of observations, consumers, readiness, identity, outcomes and recovery, memory and persistent.           |
| Persistence                        | The crash matrix as tests, one per crash point, restarts over the same storage, and a sweep of writes that commit, fail or both.                                  |
| Types                              | Contracts that compile the public API's positive and negative cases, and the packages as published, compiled by a consumer under Bundler and NodeNext resolution. |
| Sources                            | Each against an in-process fake modelled on its SDK's source at the pinned version, the conformance suite, and contracts against the SDK's own declarations.      |
| Storages                           | The storage conformance suite, over the mock storage and over the Silo bridge with a fake of Silo's value handle.                                                 |
| The tests themselves               | A mutation run: each guard that no crash would reveal is broken on purpose, and a test must go red; a mutant that hangs the suite counts as caught.               |
| The React binding                  | Hook tests with Strict Mode, Suspense, server rendering and hydration.                                                                                            |
| The whole                          | The Intent Lab's flow tests drive every entry point through its buttons, and Playwright runs the page in a browser.                                               |

## What was never run

No test runs on a device, a simulator or a provider's servers. Whether a Universal Link verifies, a deferred link matches or a notification is delivered is decided by the operating system and the provider; the fakes model what their SDKs hand the app once they do. The Expo lab is typechecked and bundled for web, iOS and Android, and was run by hand in Expo Go on a simulator.

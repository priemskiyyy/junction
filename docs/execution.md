---
description: "A handler receives the payload and an execution: its lease, signal, account and deadline, commit for the final effect, and reject and retry for its answer. What settles an attempt, and what an invalidated one can still do."
---

# Execution and outcomes

A handler receives the frozen payload and an **execution**: the lease of one attempt. It runs one at a time per Junction.

```ts
junction.subscribe(
  "openDocument",
  async ({ documentId }, { account, signal, reject, commit }) => {
    const access = await api.checkAccess({
      documentId,
      account: account.id,
      signal,
    });

    if (!access.allowed) {
      return reject("not-authorized");
    }

    return commit(() => navigation.openDocument(documentId));
  },
);
```

## The execution

| Field                                | Meaning                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `intent`                             | `{ id, name }` of the intent.                                                                              |
| `attempt`                            | `{ id, number }`: which attempt this is, from 1.                                                           |
| `account`                            | `{ id }` of the account an account-bound intent runs for, fixed for the attempt; `null` for a public one.  |
| `expires`                            | `{ at }`: the deadline, in epoch milliseconds.                                                             |
| `provenance`                         | Which source and route it came from, whether it was the launch read, and the provider's claim of deferral. |
| `signal`                             | Aborts when the attempt is invalidated or its handler has answered. Cooperative: it stops nothing itself.  |
| `assertCurrent()`                    | Throws `STALE_EXECUTION` once the attempt is no longer current.                                            |
| `commit(effect)`                     | Runs the final effect once, only while current.                                                            |
| `reject(reason)`, `retry({ after })` | Build the handler's answer.                                                                                |

## Answers

| The handler                    | The intent                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| returns nothing                | is acknowledged and leaves the inbox                                                                                                             |
| returns `reject(reason)`       | is rejected, for good, with the reason in the timeline                                                                                           |
| returns `retry({ after })`     | waits at least `after` milliseconds and runs again, or fails with `ATTEMPTS_EXHAUSTED`, or expires when no attempt can start before its deadline |
| throws, or its promise rejects | fails with `HANDLER_FAILED`, the thrown value as its `cause`, and is never retried by itself                                                     |
| returns anything else          | fails with `INVALID_HANDLER_RESULT`: the types refuse it, and a JavaScript handler gets the failure                                              |

A `reason` has 1 to 160 characters, and `after` is a whole number of milliseconds up to 2 147 483 647; anything else fails the attempt with `INVALID_HANDLER_RESULT`.

## The final effect

`commit(effect)` is the guard around the one effect that must not happen twice, usually a navigation. It checks that the attempt is current, marks the effect as entered, runs it and latches the attempt as handled:

- The latch wins over anything that follows, including an unmount the effect itself causes, so a navigation that unmounts its own screen is still handled and never replays.
- An effect that throws leaves the intent `interrupted` with `EFFECT_UNCERTAIN`, with what it threw as the error's `cause`: it may or may not have taken effect, so Junction never runs it again by itself. `commit` rethrows the error to the handler, and whatever the handler does with it, the intent stays uncertain.
- A second `commit` throws `ALREADY_SETTLED` without running its effect.
- A stale `commit` throws `STALE_EXECUTION` before it runs anything.

The effect must be synchronous; the types refuse one that returns a promise. Work before it, such as a network check, belongs in the handler, where `signal` and `assertCurrent()` apply.

## Invalidated attempts

An attempt stops being current when it is invalidated ([Ownership and readiness](/ownership-and-readiness) lists what does) or once its answer is applied, a moment after the handler returns or its promise settles, so a callback the handler queued before answering can still commit until then. From then on it can settle nothing: `commit` and `assertCurrent()` throw, and its signal aborts once the answer's own events have been heard. An execution kept past its answer, in a closure or a timer, is stale.

The execution slot stays taken until the handler's promise settles, even after invalidation: a handler that ignores its signal is not treated as finished, and no second handler starts beside it. One that outlives its timeout records `execution blocked`. When it settles, what happened decides:

| Settled after    | The intent                                                                            |
| ---------------- | ------------------------------------------------------------------------------------- |
| a commit latched | is acknowledged, whatever invalidated it afterwards                                   |
| an interruption  | is `interrupted` with the interruption's code, for [recovery](/delivery-and-recovery) |
| a cancellation   | is cancelled, even if an interruption came first                                      |
| an expiry        | is expired                                                                            |

## Timeouts

`timeout.execution` bounds one attempt, 30 seconds by default, and a consumer's `timeout` overrides it. Past it the attempt is invalidated with `TIMED_OUT`; the handler keeps the slot until it settles.

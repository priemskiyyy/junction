---
description: "How Junction picks the one consumer that owns an intent, why ownership comes before readiness, and what makes an intent wait instead of running."
---

# Ownership and readiness

Junction delivers each intent to one owner, and only once that owner is ready. Ownership comes first: a blocked owner is never bypassed, and an ambiguity is never settled by mount order.

## Choosing the owner

For each waiting intent, Junction evaluates every consumer of its name:

1. The **candidates** are the primary consumers whose `match` holds. Only when none does are the matching fallbacks the candidates.
2. **One candidate** is the owner. **None** waits as `no-consumer`. **Two or more** wait as `ambiguous-consumer`, with the candidates named in the inbox entry, until one stops matching or unmounts.
3. A `match` that throws holds the intent as `selection-error`: a faulty matcher is never routed around.

Readiness never shrinks the candidates. An owner that is not ready holds its intent as `consumer-not-ready`, and a `ready` getter that throws holds it as `readiness-error`. A second screen that happens to be ready does not take it: the owner was chosen by what the intent is, not by who can run first.

## Why an intent waits

| Waiting reason       | Until                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| `no-consumer`        | A consumer that matches it registers.                                 |
| `ambiguous-consumer` | Only one candidate is left.                                           |
| `consumer-not-ready` | Its owner's `ready` holds.                                            |
| `readiness-error`    | Its owner's `ready` stops throwing.                                   |
| `selection-error`    | Every `match` it meets stops throwing.                                |
| `identity-restoring` | The identity store knows who is signed in. See [Identity](/identity). |
| `authentication`     | Someone signs in.                                                     |
| `account-mismatch`   | The account it is bound to signs in.                                  |
| `capacity`           | The one running attempt settles: one handler runs at a time.          |
| `storage`            | A storage write succeeds again. See [Persistence](/persistence).      |

An intent waiting for one reason never blocks a later intent that can run: the scheduler takes the earliest intent that can.

## Changes while an attempt runs

A consumer that appears while an attempt runs does not take the lease away. The running attempt is invalidated, and its signal aborted, when:

- its owner is disposed (`OWNER_DISPOSED`), changes `scope` (`SCOPE_CHANGED`), or stops matching (`OWNER_UNMATCHED`) or being ready (`OWNER_NOT_READY`) on an update or a refresh;
- the identity changes (`IDENTITY_CHANGED`);
- it outlives its timeout (`TIMED_OUT`);
- the intent expires, is cancelled, or the Junction is disposed.

Before a handler starts, its attempt is only a claim. A consumer that registered in the meantime can make the intent ambiguous or outrank the owner, and the claim then returns to waiting with its attempt undone: nothing ran, so nothing can have happened.

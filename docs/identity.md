---
description: "Account-bound intents run only for their account, signed in. How an intent binds to an account, why Junction never switches accounts, and what an identity change does to a running attempt."
---

# Identity and accounts

Some intents are about one account: open a document in Ada's workspace, show Grace's mention. Junction runs such an intent only while its account is signed in, and never switches accounts to run it.

## The identity store

Account-bound intents need `identity`, a read-only observable of who is signed in:

```ts
import type { JunctionIdentity, ObservableValue } from "@priemskiyyy/junction";

export const session: ObservableValue<JunctionIdentity> = {
  get: () => ({ status: "authenticated", account: { id: "ada" } }),
  subscribe: () => () => {},
};
```

`status` is `restoring` while your app does not know yet, `anonymous` when nobody is signed in, and `authenticated` with the `account`. `start()` reads and subscribes to it before any source attaches. A `get()` that throws, or an account `id` that is not a string, reads as `restoring`, so account-bound intents wait instead of running for a guess.

An intent that only needs someone signed in is not account-bound: that is readiness, `ready: () => session.get().status === "authenticated"`.

## Binding

An account-bound intent binds to one account and never rebinds:

- `account: (payload) => payload.accountId` binds it to the account the payload targets, when there is one. The account in a link is a **target, not authority**: it says whose intent this is, and never signs anyone in.
- Without a target, it binds to the account signed in when it was accepted, or, while nobody is, stays unbound and binds at its first attempt.

Until its account is signed in, the intent waits with `identity-restoring`, `authentication` or `account-mismatch`. A ready consumer cannot bypass that: the binding is declared once, on the intent, so no screen can run it for the wrong account.

## Changes of identity

Every change of status or account invalidates the running attempt at once, public or not, with `IDENTITY_CHANGED`. Signing out and back in to the same account still passes through `anonymous`, so an attempt started before never finishes under a session it did not start in. The execution's `account` is the one the attempt started under, whatever happens next; guard account-sensitive effects with `commit` or `assertCurrent()` after every `await`.

## Signing out

Intents bound to an account stay bound until they expire. When your app signs out on a shared device, cancel the ones bound to the account that left:

```ts
const leaving = "ada";

for (const entry of junction.inbox.get()) {
  if (entry.binding.kind === "bound" && entry.binding.account.id === leaving) {
    await junction.cancel(entry.id);
  }
}
```

A running one answers `requested` and ends cancelled once its handler settles; see [Delivery and recovery](/delivery-and-recovery).

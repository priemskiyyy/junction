---
description: "The inbox holds every intent that has not ended, in admission order. What deduplicates, what the limits are, when an intent expires, and how retry and cancel recover a failed or interrupted one."
---

# Delivery and recovery

`junction.inbox` holds every intent that has not ended: waiting, running, scheduled for a retry, failed or interrupted, in the order it was accepted. It is a frozen array that changes only when an entry does, so an unchanged entry keeps its reference.

```ts
const stop = junction.inbox.subscribe(() => {
  const failed = junction.inbox.get().filter(({ state }) => state === "failed");

  console.log(`${failed.length} failed`);
});
```

Through the registered types the entries are a union by `name`, so checking `entry.name` types `entry.payload`. The inbox is your application's API and carries payloads; diagnostics never do.

## States

| `state`           | Carries                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `pending`         | `waiting.reason`, and the consumers the reason is about                                     |
| `leased`          | `attempt: { id, number }` of the running attempt                                            |
| `retry-scheduled` | `retry: { at }`, when the next attempt may start                                            |
| `failed`          | `error`, whose `code` is `HANDLER_FAILED`, `INVALID_HANDLER_RESULT` or `ATTEMPTS_EXHAUSTED` |
| `interrupted`     | `error`, whose `code` says what interrupted it, such as `IDENTITY_CHANGED`                  |

An acknowledged, rejected, expired or cancelled intent leaves the inbox.

## What deduplicates

Equal URLs and equal payloads are not the same interaction: two taps on one link are two intents, since Junction cannot tell a double tap from a repeated callback and never drops a real open to guess. Only **occurrence evidence** deduplicates: an interaction key a source claims, such as a notification's identifier, or one you pass to `dispatch(name, input, { interaction: { key } })`.

- The same key with the same intent and payload is a `duplicate` of the intent it made, whatever state that intent is in. For a persistent intent the duplicate waits for the storage like an admission, and answers `unconfirmed` with that intent's id while the last write is unconfirmed, since what makes it a duplicate may not be stored yet; the write is retried.
- The same key with another intent or payload is `rejected` as `interaction-conflict`, and nothing is replaced.
- A key is kept for a day after its intent ended, and the ledger keeps 1 024 of them, oldest first out.

## Limits

The inbox holds at most 32 open intents and 256 KiB of payload. Past either, an admission is `rejected` as `inbox-full` with `retryable: true`: accepted work is never evicted to make room.

## Expiry

Every intent has a deadline, 10 minutes after it was received unless its definition says otherwise. Past it, a waiting intent ends expired, and a running one is invalidated and ends expired once its handler settles. A retry never extends a deadline, and neither does a wall clock set back: Junction time moves only with the wall clock's forward steps, so it never runs back and never stops.

## Recovery

A failed or interrupted intent stays in the inbox until your app decides, or until its deadline passes and it ends expired:

```ts
const [entry] = junction.inbox.get();

if (entry?.state === "interrupted") {
  const result = await junction.retry(entry.id, { after: 1_000 });

  if (result.status === "refused") {
    console.warn(result.reason);
  }
}
```

- `retry(id, { after })` moves it back to waiting, with its id, payload, account and deadline unchanged, once its old handler settled, before its deadline and within its attempts. Retrying an interrupted intent is your call about an effect that may have happened.
- `cancel(id)` ends a waiting, failed or interrupted intent as cancelled and answers `applied`. A running one is invalidated and answers `requested`: when its handler settles, a committed effect still counts as handled, an intent whose deadline passed meanwhile ends expired, and anything else ends cancelled.

Both answer with a result and never throw at runtime; `retry()` throws only for an `after` outside its range, which is misconfiguration. While the storage restores, both wait for it, so they find the intents it brings back. A refusal names its reason: `unknown`, `not-started`, `disposed`, `not-recoverable`, `running`, `expired` or `attempts-exhausted`.

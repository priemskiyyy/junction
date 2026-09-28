---
description: "How Junction thinks: capture every entry point centrally at bootstrap, consume each intent locally where it belongs, ownership before readiness, occurrences instead of URLs, and work that belongs to its lease."
---

# The model

## Capture centrally, consume locally

An entry point arrives when it likes: a link can launch the app before anything is rendered, a notification press can land during a sign-in, a deferred link can arrive seconds after the first screen. Junction splits the work in two:

1. **Capture**, once, at bootstrap. The sources listen from the moment `start()` runs, so nothing that arrives early is lost. Each observation is routed, validated and admitted into the inbox.
2. **Consume**, locally, when a feature is ready. A screen registers as the consumer of the intents it owns, and Junction delivers each intent to its one owner once that owner is ready.

Between the two, an intent waits in a bounded inbox, visibly, with its reason.

## The life of an intent

1. A source pushes an observation. A route turns it into a payload, the intent's schema validates it, and Junction freezes a canonical copy. An input no route takes is ignored; one that fails the grammar or the schema is refused.
2. The intent is admitted and waits. Each scheduler turn picks its owner: the consumer whose `match` accepts it, or a fallback when no primary does.
3. When its owner is ready and its account is current, the intent is leased: one attempt runs its handler, and only one attempt runs at a time.
4. The attempt settles: handled, rejected, retried later, failed, or interrupted when it was invalidated with an effect that may have happened. An intent that waits past its deadline expires.

## The principles

- **Junction normalizes ownership and delivery, not routing, attribution or authentication.** Your router navigates, your providers attribute, your app signs people in.
- **A source translates one provider SDK and nothing more.** It listens to the SDK your application initialized, and pushes only what the provider positively reports as actionable.
- **Constructing a Junction does nothing.** Only `start()` attaches sources; observing the inbox or the diagnostics never creates native demand.
- **Ownership comes before readiness.** An owner that is not ready keeps its intent; another consumer never takes it meanwhile. Two owners are an ambiguity, never resolved by mount order.
- **Equal URLs and payloads are not the same interaction.** Only occurrence evidence deduplicates.
- **An execution belongs to its lease.** Once the lease is invalidated, the attempt can settle nothing.
- **Junction never throws into its host at runtime.** Only misconfiguration throws; everything else answers with a result. What your own listener throws is rethrown in a microtask, so your error reporting still sees it.

## Where each part lives

| Concern                        | Page                                                  |
| ------------------------------ | ----------------------------------------------------- |
| What an intent is              | [Intents and schemas](intents.md)                     |
| How an observation is routed   | [Sources and routes](sources-and-routes.md)           |
| Which URLs are accepted        | [The URL grammar](url-grammar.md)                     |
| Who takes an intent, and when  | [Ownership and readiness](ownership-and-readiness.md) |
| What a handler may do          | [Execution and outcomes](execution.md)                |
| Whose intent it is             | [Identity and accounts](identity.md)                  |
| Duplicates, deadlines, retries | [Delivery and recovery](delivery-and-recovery.md)     |
| Surviving a restart            | [Persistence](persistence.md)                         |

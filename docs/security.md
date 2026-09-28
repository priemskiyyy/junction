---
description: "Everything an entry point carries comes from outside. How Junction treats URLs, payloads, accounts, occurrence keys, diagnostics and stored intents as untrusted, and what stays your app's to check."
---

# Security

Anything an entry point carries was written by someone else: a link in an email, a notification's data, a campaign's parameters. Junction treats all of it as untrusted input and gives your app typed, bounded, validated intents.

## URLs

Junction parses URLs with [its own strict grammar](/url-grammar), the same on every JavaScript engine, instead of the platform's `URL`, which normalizes silently:

- credentials before a host (`https://app.example.com@evil.example`) refuse the URL, since they disguise where it goes;
- dot segments and encoded separators refuse it, so `%2e%2e` and `%2F` cannot reach another path;
- a host holds only the characters a host can, and an origin belongs to one source;
- a URL over 8 KiB, or holding spaces, control characters or backslashes, is refused before parsing.

Routes are exclusive: an input two routes match is refused, never given to the first.

## Payloads

Every payload passes its intent's schema, then becomes a canonical copy: plain JSON only, at most 16 KiB and 16 levels deep, frozen. A route's `payload` returns values typed `unknown`, so only the schema can prove them. Write strict schemas: an unknown key a route passes is refused at runtime only by a strict schema.

## Accounts

The account in a link is a **target, not authority**. It decides which signed-in account an intent runs for, and never signs anyone in or switches accounts: an intent for Ada waits while Grace is signed in. Authorization stays your app's: check access in the handler, with the execution's `account`, before the effect.

## Occurrences

An occurrence key deduplicates only within its source and scope, so equal ids of two providers never collide. A key comes from outside too: it has 1 to 160 characters, and a replay of it with another payload is refused as `interaction-conflict` instead of replacing the first.

## Diagnostics

Diagnostics never carry a payload, a URL, an account or a provider's error: an event names what happened, with reasons, codes and counts, and the snapshot's statuses drop each error's `cause`. Safe to ship to a crash reporter; the inbox, which carries payloads, and the statuses themselves, which keep the cause, are not.

## Storage

A persistent intent is stored as its canonical payload, validated again by `persist.schema` when it is restored, never as a raw URL, a token or a thrown value. Whatever your storage keeps at rest is as protected as that storage: use an encrypted backend when payloads are sensitive, and cancel an account's intents at sign-out on a shared device, as [Identity](/identity) describes.

## Limits

Bounds keep a flood of entry points from exhausting the app: 32 open intents and 256 KiB of payload in the inbox, 1 024 settled occurrences in the ledger, and at most 32 admissions staged while the storage restores. Past a bound an admission is refused, and accepted work is never evicted.

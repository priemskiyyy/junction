import { expect, test } from "vitest";

import { createRegistration } from "src/utils/internal/consumers/createRegistration.fixture";
import { selectOwner } from "src/utils/internal/consumers/selectOwner";

const payload = { workspaceId: "workspace-7" };

test("no matching consumer leaves the intent waiting with no consumer", () => {
  const other = createRegistration("other", { match: () => false });

  expect(selectOwner([], payload)).toEqual({
    kind: "WAITING",
    reason: "no-consumer",
    consumers: [],
  });
  expect(selectOwner([other], payload)).toEqual({
    kind: "WAITING",
    reason: "no-consumer",
    consumers: [],
  });
});

test("the one matching primary owns the intent, and a fallback is ignored beside it", () => {
  const primary = createRegistration("primary");
  const fallback = createRegistration("fallback", { fallback: true });

  expect(selectOwner([fallback, primary], payload)).toEqual({
    kind: "OWNER",
    registration: primary,
  });
});

test("an unready primary still owns the intent: readiness never shrinks the candidates", () => {
  const primary = createRegistration("primary", { ready: false });
  const fallback = createRegistration("fallback", { fallback: true });

  expect(selectOwner([primary, fallback], payload)).toEqual({
    kind: "OWNER",
    registration: primary,
  });
});

test("two matching primaries are ambiguous whatever their order, even when only one is ready", () => {
  const ready = createRegistration("ready");
  const blocked = createRegistration("blocked", { ready: false });

  expect(selectOwner([ready, blocked], payload)).toEqual({
    kind: "WAITING",
    reason: "ambiguous-consumer",
    consumers: [ready, blocked],
  });
  expect(selectOwner([blocked, ready], payload)).toEqual({
    kind: "WAITING",
    reason: "ambiguous-consumer",
    consumers: [blocked, ready],
  });
});

test("a fallback owns the intent only when no primary matches, and two fallbacks are ambiguous", () => {
  const unmatched = createRegistration("unmatched", { match: () => false });
  const fallback = createRegistration("fallback", { fallback: true });
  const second = createRegistration("second", { fallback: true });

  expect(selectOwner([unmatched, fallback], payload)).toEqual({
    kind: "OWNER",
    registration: fallback,
  });
  expect(selectOwner([fallback, second], payload)).toEqual({
    kind: "WAITING",
    reason: "ambiguous-consumer",
    consumers: [fallback, second],
  });
});

test("a matcher that throws holds the intent with a selection error instead of routing around it", () => {
  const faulty = createRegistration("faulty", {
    match: () => {
      throw new Error("the matcher broke");
    },
  });

  const fallback = createRegistration("fallback", { fallback: true });

  expect(selectOwner([faulty, fallback], payload)).toEqual({
    kind: "WAITING",
    reason: "selection-error",
    consumers: [faulty],
  });
});

test("only true matches: a truthy answer from a JavaScript matcher does not", () => {
  // @ts-expect-error A matcher written in JavaScript can answer anything.
  const truthy = createRegistration("truthy", { match: () => "yes" });

  expect(selectOwner([truthy], payload)).toEqual({
    kind: "WAITING",
    reason: "no-consumer",
    consumers: [],
  });
});

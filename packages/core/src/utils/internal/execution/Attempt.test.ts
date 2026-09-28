import { expect, test, vi } from "vitest";

import type { IntentRecord } from "src/types/internal/IntentRecord";
import type { Invalidation } from "src/types/internal/Invalidation";
import { intent } from "src/utils/intent";
import { createRegistration } from "src/utils/internal/consumers/createRegistration.fixture";
import { Attempt } from "src/utils/internal/execution/Attempt";
import { JunctionError } from "src/utils/JunctionError";
import { z } from "zod";

const createRecord = (): IntentRecord => ({
  id: "intent-1",
  name: "openDocument",
  definition: intent(z.object({ documentId: z.string() })),
  payload: { documentId: "document-42" },
  size: 28,
  timestamp: 1_000,
  expiresAt: 601_000,
  provenance: { kind: "dispatch" },
  binding: { kind: "public" },
  attempts: 1,
  interaction: null,
  current: { state: "ADMITTED" },
  revision: 0,
});

const createAttempt = (
  invalidateIfStale: (attempt: Attempt) => Invalidation | null = (attempt) =>
    attempt.invalidation(),
) => {
  const onCommit = vi.fn();

  const attempt = new Attempt({
    record: createRecord(),
    registration: createRegistration("consumer-1"),
    account: null,
    invalidateIfStale,
    onCommit,
  });

  return { attempt, onCommit };
};

test("the execution names its intent and attempt, is frozen, and its signal starts unaborted", () => {
  const { attempt } = createAttempt();

  expect(attempt.execution).toMatchObject({
    intent: { id: "intent-1", name: "openDocument" },
    attempt: { id: attempt.id, number: 1 },
    account: null,
    expires: { at: 601_000 },
    provenance: { kind: "dispatch" },
  });
  expect(Object.isFrozen(attempt.execution)).toBe(true);
  expect(attempt.execution.signal.aborted).toBe(false);
});

test("invalidating aborts the signal once and keeps the first reason", () => {
  const { attempt } = createAttempt();

  expect(
    attempt.invalidate({ kind: "INTERRUPTED", code: "OWNER_DISPOSED" }),
  ).toBe(true);
  expect(attempt.invalidate({ kind: "EXPIRED" })).toBe(false);
  expect(attempt.execution.signal.aborted).toBe(true);
  expect(attempt.invalidation()).toEqual({
    kind: "INTERRUPTED",
    code: "OWNER_DISPOSED",
  });
});

test("assertCurrent passes while current and throws STALE_EXECUTION once invalidated", () => {
  const { attempt } = createAttempt();

  expect(() => attempt.execution.assertCurrent()).not.toThrow();

  attempt.invalidate({ kind: "INTERRUPTED", code: "IDENTITY_CHANGED" });

  expect(() => attempt.execution.assertCurrent()).toThrow(
    new JunctionError({
      code: "STALE_EXECUTION",
      message:
        "The attempt is no longer current. The identity changed while the attempt ran.",
    }),
  );
});

test("commit runs its effect once, latches handled, and a second commit never runs", () => {
  const { attempt, onCommit } = createAttempt();
  const effect = vi.fn();
  const second = vi.fn();

  expect(attempt.execution.commit(effect)).toEqual({ status: "handled" });
  expect(effect.mock.calls).toEqual([[]]);
  expect(onCommit.mock.calls).toEqual([[attempt]]);
  expect(attempt.latch()).toBe("HANDLED");
  expect(() => attempt.execution.commit(second)).toThrow(
    new JunctionError({
      code: "ALREADY_SETTLED",
      message:
        "The attempt already committed its effect; a second one never runs.",
    }),
  );
  expect(second).not.toHaveBeenCalled();
});

test("a stale commit throws before it calls its effect", () => {
  const { attempt } = createAttempt();
  const effect = vi.fn();

  attempt.invalidate({ kind: "EXPIRED" });

  expect(() => attempt.execution.commit(effect)).toThrow(
    new JunctionError({
      code: "STALE_EXECUTION",
      message: "The attempt is no longer current. The intent expired.",
    }),
  );
  expect(effect).not.toHaveBeenCalled();
  expect(attempt.latch()).toBe(null);
});

test("the live check runs at commit, so a lease that went stale since the last check still refuses", () => {
  const { attempt } = createAttempt((current) => {
    current.invalidate({ kind: "INTERRUPTED", code: "OWNER_NOT_READY" });

    return current.invalidation();
  });

  const effect = vi.fn();

  expect(() => attempt.execution.commit(effect)).toThrow(JunctionError);
  expect(effect).not.toHaveBeenCalled();
});

test("an effect that unmounts its consumer still latches handled, and one that throws latches uncertain", () => {
  const { attempt } = createAttempt();

  attempt.execution.commit(() => {
    attempt.invalidate({ kind: "INTERRUPTED", code: "OWNER_DISPOSED" });
  });

  expect(attempt.latch()).toBe("HANDLED");

  const failing = createAttempt().attempt;
  const failure = new Error("the navigator threw");

  expect(() =>
    failing.execution.commit(() => {
      throw failure;
    }),
  ).toThrow(failure);
  expect(failing.latch()).toBe("UNCERTAIN");
});

test("reject and retry build plain frozen outcomes", () => {
  const { attempt } = createAttempt();

  const rejected = attempt.execution.reject("not-authorized");
  const retried = attempt.execution.retry({ after: 1_000 });

  expect(rejected).toEqual({ status: "rejected", reason: "not-authorized" });
  expect(retried).toEqual({ status: "retry", after: 1_000 });
  expect(Object.isFrozen(rejected)).toBe(true);
  expect(Object.isFrozen(retried)).toBe(true);
});

import { afterEach, expect, test, vi } from "vitest";

import type { IntentExecution } from "src/types/IntentExecution";
import { createDeferred } from "src/utils/common/createDeferred";
import { JunctionError } from "src/utils/JunctionError";
import { createJunction, tick } from "src/utils/junction.fixture";

afterEach(() => {
  vi.useRealTimers();
});

const getStates = (junction: ReturnType<typeof createJunction>["junction"]) =>
  junction.inbox.get().map((entry) => {
    if (entry.state === "failed" || entry.state === "interrupted") {
      return `${entry.state}: ${entry.error.code}`;
    }

    return entry.state;
  });

test("a handler that returns acknowledges, and the intent leaves the inbox", async () => {
  const { junction } = createJunction();
  const events: string[] = [];

  junction.diagnostics.events.subscribe(({ type }) => events.push(type));
  junction.start();
  junction.subscribe("showAnnouncement", () => {});
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(junction.inbox.get()).toEqual([]);
  expect(events).toEqual([
    "junction started",
    "source attached",
    "intent accepted",
    "attempt started",
    "intent acknowledged",
  ]);
});

test("reject, retry, a throw and an invalid answer each take their own transition", async () => {
  const { junction } = createJunction();
  const failure = new Error("the API is down");

  junction.start();
  junction.subscribe(
    "showAnnouncement",
    ({ announcementId }, { reject, retry }) => {
      if (announcementId === "reject") {
        return reject("not-authorized");
      }

      if (announcementId === "retry") {
        return retry({ after: 60_000 });
      }

      if (announcementId === "throw") {
        throw failure;
      }
    },
  );
  junction.subscribe(
    "openDocument",
    // @ts-expect-error A handler written in JavaScript can answer anything.
    () => ({ status: 200 }),
  );

  const events: string[] = [];

  junction.diagnostics.events.subscribe(({ type, context }) =>
    events.push(`${type} ${JSON.stringify(context)}`),
  );

  for (const announcementId of ["reject", "retry", "throw"]) {
    await junction.dispatch("showAnnouncement", { announcementId });
    await tick();
  }

  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await tick();

  expect(events).toContain('intent rejected {"reason":"not-authorized"}');
  expect(getStates(junction)).toEqual([
    "retry-scheduled",
    "failed: HANDLER_FAILED",
    "failed: INVALID_HANDLER_RESULT",
  ]);

  const failed = junction.inbox.get()[1];

  expect(failed?.state === "failed" ? failed.error.cause : null).toBe(failure);
});

test("a handler that answers an object whose reads throw fails with INVALID_HANDLER_RESULT, and frees the slot", async () => {
  const { junction } = createJunction();
  const handled: string[] = [];

  junction.start();
  junction.subscribe("showAnnouncement", ({ announcementId }) => {
    if (announcementId !== "throwing") {
      handled.push(announcementId);

      return undefined;
    }

    return {
      get status(): "handled" {
        throw new Error("the outcome's getter threw");
      },
    };
  });
  await junction.dispatch("showAnnouncement", { announcementId: "throwing" });
  await junction.dispatch("showAnnouncement", { announcementId: "next" });
  await tick();
  await tick();

  expect(getStates(junction)).toEqual(["failed: INVALID_HANDLER_RESULT"]);
  expect(handled).toEqual(["next"]);
});

test("one handler runs at a time, in the order the intents were accepted", async () => {
  const { junction } = createJunction();
  const held = [createDeferred(), createDeferred()];
  const started: string[] = [];

  junction.start();
  junction.subscribe("showAnnouncement", ({ announcementId }) => {
    started.push(announcementId);

    return held[started.length - 1]?.promise;
  });
  await junction.dispatch("showAnnouncement", { announcementId: "first" });
  await junction.dispatch("showAnnouncement", { announcementId: "second" });
  await tick();

  expect(started).toEqual(["first"]);
  expect(
    junction.inbox.get().map((entry) => {
      if (entry.state === "pending") {
        return entry.waiting.reason;
      }

      return entry.state;
    }),
  ).toEqual(["leased", "capacity"]);

  held[0]?.resolve();
  await tick();

  expect(started).toEqual(["first", "second"]);
});

test("a changed scope invalidates the running attempt and aborts its signal, and the intent is interrupted", async () => {
  const { junction } = createJunction();
  const held = createDeferred();
  const executions: IntentExecution<string, boolean>[] = [];

  junction.start();

  const handleAnnouncement = (
    _payload: unknown,
    execution: IntentExecution<string, boolean>,
  ) => {
    executions.push(execution);

    return held.promise;
  };

  const registration = junction.subscribe(
    "showAnnouncement",
    handleAnnouncement,
    { scope: "editor-1" },
  );

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  registration.update(handleAnnouncement, { scope: "editor-2" });

  expect(executions[0]?.signal.aborted).toBe(true);
  expect(() => executions[0]?.assertCurrent()).toThrow(
    new JunctionError({
      code: "STALE_EXECUTION",
      message:
        "The attempt is no longer current. The consumer running the attempt changed its scope.",
    }),
  );

  held.resolve();
  await tick();

  expect(getStates(junction)).toEqual(["interrupted: SCOPE_CHANGED"]);
});

test("a new handler identity does not invalidate the running attempt, and the next attempt uses it", async () => {
  const { junction } = createJunction();
  const held = createDeferred();
  const next = vi.fn();
  const executions: IntentExecution<string, boolean>[] = [];

  junction.start();

  const registration = junction.subscribe(
    "showAnnouncement",
    (_payload, execution) => {
      executions.push(execution);

      return held.promise;
    },
  );

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await junction.dispatch("showAnnouncement", { announcementId: "a-2" });
  await tick();

  registration.update(next);

  expect(executions[0]?.signal.aborted).toBe(false);

  held.resolve();
  await tick();

  expect(next.mock.calls).toEqual([
    [{ announcementId: "a-2" }, expect.anything()],
  ]);
});

test("a handler that ignores its aborted signal cannot commit: the effect never runs", async () => {
  const { junction } = createJunction();
  const response = createDeferred();
  const navigate = vi.fn();

  junction.start();

  const handleAnnouncement = async (
    _payload: unknown,
    { commit }: IntentExecution<string, boolean>,
  ) => {
    await response.promise;

    return commit(navigate);
  };

  const registration = junction.subscribe(
    "showAnnouncement",
    handleAnnouncement,
  );

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  registration.update(handleAnnouncement, { ready: false });
  response.resolve();
  await tick();

  expect(navigate).not.toHaveBeenCalled();
  expect(getStates(junction)).toEqual(["interrupted: OWNER_NOT_READY"]);
});

test("an execution kept past its answer is stale: its signal aborts, and its commit throws before it calls its effect", async () => {
  const { junction } = createJunction();
  const executions: IntentExecution<string, boolean>[] = [];
  const navigate = vi.fn();

  junction.start();
  junction.subscribe("showAnnouncement", (_payload, execution) => {
    executions.push(execution);

    return execution.retry({ after: 60_000 });
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  const stale = new JunctionError({
    code: "STALE_EXECUTION",
    message: "The attempt is no longer current. Its handler already answered.",
  });

  expect(executions[0]?.signal.aborted).toBe(true);
  expect(() => executions[0]?.assertCurrent()).toThrow(stale);
  expect(() => executions[0]?.commit(navigate)).toThrow(stale);
  expect(navigate).not.toHaveBeenCalled();
  expect(getStates(junction)).toEqual(["retry-scheduled"]);
});

test("an execution is stale while its handler's answer is applied, so a listener cannot commit through it", async () => {
  const { junction } = createJunction();
  const executions: IntentExecution<string, boolean>[] = [];
  const navigate = vi.fn();
  const errors: unknown[] = [];

  junction.diagnostics.events.subscribe(({ type }) => {
    if (type !== "retry scheduled") {
      return;
    }

    try {
      executions[0]?.commit(navigate);
    } catch (error) {
      errors.push(error);
    }
  });
  junction.start();
  junction.subscribe("showAnnouncement", (_payload, execution) => {
    executions.push(execution);

    return execution.retry({ after: 60_000 });
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(navigate).not.toHaveBeenCalled();
  expect(errors).toEqual([
    new JunctionError({
      code: "STALE_EXECUTION",
      message:
        "The attempt is no longer current. Its handler already answered.",
    }),
  ]);
  expect(getStates(junction)).toEqual(["retry-scheduled"]);
});

test("a consumer disposed while its handler runs aborts the signal, and the intent is interrupted once the handler settles", async () => {
  const { junction } = createJunction();
  const held = createDeferred();
  const signals: AbortSignal[] = [];

  junction.start();

  const registration = junction.subscribe(
    "showAnnouncement",
    (_payload, { signal }) => {
      signals.push(signal);

      return held.promise;
    },
  );

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  registration.dispose();

  expect(signals[0]?.aborted).toBe(true);

  held.resolve();
  await tick();

  expect(getStates(junction)).toEqual(["interrupted: OWNER_DISPOSED"]);
});

test("a committed effect that unmounts its own consumer is still handled, and never replays", async () => {
  const { junction } = createJunction();
  const navigate = vi.fn();

  junction.start();

  const registration = junction.subscribe(
    "showAnnouncement",
    (_payload, { commit }) =>
      commit(() => {
        navigate();
        registration.dispose();
      }),
  );

  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(navigate.mock.calls).toEqual([[]]);
  expect(junction.inbox.get()).toEqual([]);
});

test("a committed effect that throws leaves the intent interrupted as uncertain with what it threw, never retried by itself", async () => {
  const { junction } = createJunction();

  const navigate = vi.fn(() => {
    throw new Error("the navigator threw");
  });

  junction.start();
  junction.subscribe("showAnnouncement", (_payload, { commit }) =>
    commit(navigate),
  );
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();
  await tick();

  expect(navigate.mock.calls).toHaveLength(1);
  expect(getStates(junction)).toEqual(["interrupted: EFFECT_UNCERTAIN"]);
  expect(junction.inbox.get()).toMatchObject([
    { error: { cause: new Error("the navigator threw") } },
  ]);
});

test("a second commit throws ALREADY_SETTLED and never runs its effect, and the first still counts", async () => {
  const { junction } = createJunction();
  const first = vi.fn();
  const second = vi.fn();
  const errors: unknown[] = [];

  junction.start();
  junction.subscribe("showAnnouncement", (_payload, { commit }) => {
    commit(first);

    try {
      commit(second);
    } catch (error) {
      errors.push(error);
    }
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(first.mock.calls).toHaveLength(1);
  expect(second).not.toHaveBeenCalled();
  expect(errors).toEqual([
    new JunctionError({
      code: "ALREADY_SETTLED",
      message:
        "The attempt already committed its effect; a second one never runs.",
    }),
  ]);
  expect(junction.inbox.get()).toEqual([]);
});

test("an outcome returned after a commit changes nothing: the commit already handled the intent", async () => {
  const { junction } = createJunction();

  junction.start();
  junction.subscribe("showAnnouncement", (_payload, { commit, reject }) => {
    commit(() => {});

    return reject("changed-my-mind");
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await tick();

  expect(junction.inbox.get()).toEqual([]);
});

test("an invalidated handler that never settles keeps the slot blocked, and nothing else runs beside it", async () => {
  vi.useFakeTimers();

  const { junction } = createJunction({ timeout: { execution: 1_000 } });
  const second = vi.fn();
  const events: string[] = [];

  junction.diagnostics.events.subscribe(({ type }) => events.push(type));
  junction.start();
  junction.subscribe("openDocument", () => new Promise(() => {}));
  junction.subscribe("showAnnouncement", second);
  await junction.dispatch("openDocument", {
    workspaceId: "w",
    documentId: "d",
  });
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(1_000);

  expect(events).toContain("execution blocked");
  expect(second).not.toHaveBeenCalled();
  expect(junction.diagnostics.get().running).toEqual({
    intent: { id: expect.any(String) },
    attempt: { id: expect.any(String) },
    blocked: true,
  });
  expect(
    junction.inbox.get().map((entry) => {
      if (entry.state === "pending") {
        return entry.waiting.reason;
      }

      return entry.state;
    }),
  ).toEqual(["leased", "capacity"]);
});

test("a retry after zero waits for a later turn, and the attempt count stops the loop", async () => {
  const { junction } = createJunction();
  const attempts: number[] = [];

  junction.start();
  junction.subscribe("showAnnouncement", (_payload, { attempt, retry }) => {
    attempts.push(attempt.number);

    return retry({ after: 0 });
  });

  const admission = junction.dispatch("showAnnouncement", {
    announcementId: "a-1",
  });

  expect(attempts).toEqual([]);
  await expect(admission).resolves.toMatchObject({ status: "accepted" });

  for (let turn = 0; turn < 6; turn += 1) {
    await tick();
  }

  expect(attempts).toEqual([1, 2, 3]);
  expect(getStates(junction)).toEqual(["failed: ATTEMPTS_EXHAUSTED"]);
});

test("a failed intent cannot be retried while its handler is still running, and can once it settled", async () => {
  const { junction } = createJunction();
  const held = createDeferred();

  junction.start();
  junction.subscribe("showAnnouncement", async () => {
    await held.promise;

    throw new Error("the API is down");
  });

  const admission = await junction.dispatch("showAnnouncement", {
    announcementId: "a-1",
  });

  const id = admission.status === "accepted" ? admission.intent.id : "";

  await tick();
  await expect(junction.retry(id)).resolves.toEqual({
    status: "refused",
    reason: "running",
  });

  held.resolve();
  await tick();

  expect(getStates(junction)).toEqual(["failed: HANDLER_FAILED"]);
  await expect(junction.retry(id)).resolves.toEqual({ status: "applied" });
});

test("the execution names its intent, its attempt, its deadline and where it came from", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);

  const { junction } = createJunction();
  const executions: IntentExecution<string, boolean>[] = [];

  junction.start();
  junction.subscribe("showAnnouncement", (_payload, execution) => {
    executions.push(execution);
  });

  const admission = await junction.dispatch("showAnnouncement", {
    announcementId: "a-1",
  });

  await vi.advanceTimersByTimeAsync(0);

  expect(executions).toEqual([
    {
      intent: {
        id: admission.status === "accepted" ? admission.intent.id : "",
        name: "showAnnouncement",
      },
      attempt: { id: expect.any(String), number: 1 },
      account: null,
      expires: { at: 1_600_000 },
      provenance: { kind: "dispatch" },
      signal: expect.any(AbortSignal),
      assertCurrent: expect.any(Function),
      commit: expect.any(Function),
      reject: expect.any(Function),
      retry: expect.any(Function),
    },
  ]);
  expect(Object.isFrozen(executions[0])).toBe(true);
});

test("each failed intent carries an error of its own", async () => {
  const { junction } = createJunction();

  junction.start();
  junction.subscribe(
    "showAnnouncement",
    // @ts-expect-error A handler written in JavaScript can answer anything.
    () => ({ status: 200 }),
  );
  await junction.dispatch("showAnnouncement", { announcementId: "a-1" });
  await junction.dispatch("showAnnouncement", { announcementId: "a-2" });
  await tick();
  await tick();

  const [first, second] = junction.inbox.get();

  expect(getStates(junction)).toEqual([
    "failed: INVALID_HANDLER_RESULT",
    "failed: INVALID_HANDLER_RESULT",
  ]);
  expect(first?.state === "failed" ? first.error : null).not.toBe(
    second?.state === "failed" ? second.error : null,
  );
});

test("what a handler does after its commit latched is ignored, and its acknowledgement records what was", async () => {
  const { junction } = createJunction();
  const acknowledged: unknown[] = [];

  junction.diagnostics.events.subscribe((event) => {
    if (event.type === "intent acknowledged") {
      acknowledged.push(event.context);
    }
  });
  junction.start();
  junction.subscribe(
    "showAnnouncement",
    ({ announcementId }, { commit, reject }) => {
      const handled = commit(() => {});

      if (announcementId === "threw") {
        throw new Error("The analytics call failed.");
      }

      if (announcementId === "answered") {
        return reject("too-late");
      }

      return handled;
    },
  );
  await junction.dispatch("showAnnouncement", { announcementId: "threw" });
  await junction.dispatch("showAnnouncement", { announcementId: "answered" });
  await junction.dispatch("showAnnouncement", { announcementId: "handled" });
  await tick();

  expect(acknowledged).toEqual([
    { ignored: "threw" },
    { ignored: "answered" },
    { ignored: null },
  ]);
  expect(junction.inbox.get()).toEqual([]);
});

test("an effect that throws is the uncertain intent's cause, even when its handler catches the rethrow or throws something else", async () => {
  const { junction } = createJunction();

  junction.start();
  junction.subscribe("showAnnouncement", ({ announcementId }, { commit }) => {
    try {
      commit(() => {
        throw new TypeError("navigation is not mounted");
      });
    } catch {
      if (announcementId === "rethrows-another") {
        throw new Error("The handler's own error.");
      }
    }
  });
  await junction.dispatch("showAnnouncement", { announcementId: "catches" });
  await junction.dispatch("showAnnouncement", {
    announcementId: "rethrows-another",
  });
  await tick();

  expect(junction.inbox.get()).toMatchObject([
    {
      state: "interrupted",
      error: {
        code: "EFFECT_UNCERTAIN",
        cause: new TypeError("navigation is not mounted"),
      },
    },
    {
      state: "interrupted",
      error: {
        code: "EFFECT_UNCERTAIN",
        cause: new TypeError("navigation is not mounted"),
      },
    },
  ]);
});

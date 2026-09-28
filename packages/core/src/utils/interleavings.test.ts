import fc from "fast-check";
import { expect, test } from "vitest";
import { z } from "zod";

import { createMockStorage } from "src/mock/createMockStorage";
import type { Admission } from "src/types/Admission";
import type { IntentExecution } from "src/types/IntentExecution";
import type { JunctionIdentity } from "src/types/JunctionIdentity";
import { createDeferred } from "src/utils/common/createDeferred";
import { intent } from "src/utils/intent";
import { Junction } from "src/utils/Junction";
import {
  authenticated,
  createIdentity,
  intents,
  tick,
} from "src/utils/junction.fixture";

const OpenDocument = z
  .object({
    workspaceId: z.string().min(1),
    documentId: z.string().min(1),
    accountId: z.string().optional(),
  })
  .strict();

const Announcement = z.object({ announcementId: z.string().min(1) }).strict();

const persistentIntents = {
  openDocument: intent(OpenDocument, {
    account: ({ accountId }) => accountId,
    persist: { schema: OpenDocument },
  }),
  showAnnouncement: intent(Announcement, { persist: { schema: Announcement } }),
};

const StoredLeases = z
  .object({
    intents: z.array(
      z
        .object({
          id: z.string(),
          attempts: z.number(),
          state: z.object({ state: z.string() }).passthrough(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

type Behavior = "return" | "reject" | "retry" | "throw" | "hold" | "commit";

type Consumer = {
  intent: "openDocument" | "showAnnouncement";
  matches: boolean;
  ready: boolean;
  fallback: boolean;
  scope: number;
  disposed: boolean;
  registration: { update: () => void; dispose: () => void } | null;
};

type Command =
  | {
      kind: "dispatch";
      intent: "openDocument" | "showAnnouncement";
      account: string | null;
    }
  | {
      kind: "subscribe";
      intent: "openDocument" | "showAnnouncement";
      matches: boolean;
      ready: boolean;
      fallback: boolean;
      behavior: Behavior;
    }
  | { kind: "ready"; consumer: number; ready: boolean }
  | { kind: "scope"; consumer: number }
  | { kind: "dispose"; consumer: number }
  | { kind: "identity"; identity: JunctionIdentity }
  | { kind: "settle"; index: number; outcome: "resolve" | "reject" }
  | { kind: "cancel"; index: number }
  | { kind: "retry"; index: number }
  | { kind: "tick" }
  | { kind: "write"; outcome: "commit" | "fail-before" | "fail-after" }
  | { kind: "flush" };

const intentName = fc.constantFrom<"openDocument" | "showAnnouncement">(
  "openDocument",
  "showAnnouncement",
);

const commands: fc.WeightedArbitrary<Command>[] = [
  {
    arbitrary: fc.record({
      kind: fc.constant<"dispatch">("dispatch"),
      intent: intentName,
      account: fc.constantFrom(null, "account-3", "account-4"),
    }),
    weight: 4,
  },
  {
    arbitrary: fc.record({
      kind: fc.constant<"subscribe">("subscribe"),
      intent: intentName,
      // Weighted towards owners that can run, so interleavings with a running handler are common.
      matches: fc.constantFrom(true, true, true, false),
      ready: fc.constantFrom(true, true, true, false),
      fallback: fc.constantFrom(false, false, false, true),
      behavior: fc.constantFrom<Behavior>(
        "hold",
        "hold",
        "return",
        "reject",
        "retry",
        "throw",
        "commit",
      ),
    }),
    weight: 2,
  },
  {
    arbitrary: fc.record({
      kind: fc.constant<"ready">("ready"),
      consumer: fc.nat(8),
      ready: fc.boolean(),
    }),
    weight: 1,
  },
  {
    arbitrary: fc.record({
      kind: fc.constant<"scope">("scope"),
      consumer: fc.nat(8),
    }),
    weight: 1,
  },
  {
    arbitrary: fc.record({
      kind: fc.constant<"dispose">("dispose"),
      consumer: fc.nat(8),
    }),
    weight: 1,
  },
  {
    arbitrary: fc.record({
      kind: fc.constant<"identity">("identity"),
      identity: fc.constantFrom<JunctionIdentity>(
        { status: "restoring" },
        { status: "anonymous" },
        authenticated("account-3"),
        authenticated("account-4"),
      ),
    }),
    weight: 1,
  },
  {
    arbitrary: fc.record({
      kind: fc.constant<"settle">("settle"),
      index: fc.nat(8),
      outcome: fc.constantFrom<"resolve" | "reject">("resolve", "reject"),
    }),
    weight: 1,
  },
  {
    arbitrary: fc.record({
      kind: fc.constant<"cancel">("cancel"),
      index: fc.nat(8),
    }),
    weight: 1,
  },
  {
    arbitrary: fc.record({
      kind: fc.constant<"retry">("retry"),
      index: fc.nat(8),
    }),
    weight: 1,
  },
  { arbitrary: fc.record({ kind: fc.constant<"tick">("tick") }), weight: 3 },
];

const storageCommands: fc.WeightedArbitrary<Command>[] = [
  {
    arbitrary: fc.record({
      kind: fc.constant<"write">("write"),
      // Weighted towards commits, so most runs get far enough to lease and settle.
      outcome: fc.constantFrom<"commit" | "fail-before" | "fail-after">(
        "commit",
        "commit",
        "commit",
        "fail-before",
        "fail-after",
      ),
    }),
    weight: 4,
  },
  { arbitrary: fc.record({ kind: fc.constant<"flush">("flush") }), weight: 1 },
];

const run = async (steps: Command[], mode: "memory" | "persistent") => {
  const identity = createIdentity({ status: "anonymous" });
  const storage = createMockStorage();

  const junction = new Junction({
    intents: mode === "memory" ? intents : persistentIntents,
    identity: identity.identity,
    ...(mode === "memory" ? {} : { storage: storage.storage }),
  });

  storage.control.hold();

  const consumers: Consumer[] = [];
  const held: ReturnType<typeof createDeferred<void>>[] = [];
  const violations: string[] = [];
  const ended = new Set<string>();
  const invoked = new Set<string>();
  const accepted: string[] = [];

  let current: JunctionIdentity = { status: "anonymous" };
  let scopes = 0;
  let running = 0;

  const check = (
    consumer: Consumer,
    intentId: string,
    attempt: number,
    account: string | null,
  ) => {
    const key = `${intentId}:${attempt}`;

    if (running > 1) {
      violations.push("two handlers ran at once");
    }

    if (invoked.has(key)) {
      violations.push(`attempt ${key} ran twice`);
    }

    if (ended.has(intentId)) {
      violations.push(`ended intent ${intentId} ran again`);
    }

    if (consumer.disposed || !consumer.ready || !consumer.matches) {
      violations.push("a disposed, unready or unmatched consumer ran");
    }

    const rivals = consumers.filter(
      (other) =>
        other.intent === consumer.intent &&
        !other.disposed &&
        other.matches &&
        other.fallback === consumer.fallback,
    );

    const primaries = consumers.filter(
      (other) =>
        other.intent === consumer.intent &&
        !other.disposed &&
        other.matches &&
        !other.fallback,
    );

    if (rivals.length > 1 || (consumer.fallback && primaries.length > 0)) {
      violations.push("an ambiguous or outranked consumer ran");
    }

    if (
      consumer.intent === "openDocument" &&
      (current.status !== "authenticated" || current.account.id !== account)
    ) {
      violations.push("an account-bound intent ran for another account");
    }

    if (mode === "persistent") {
      const stored = StoredLeases.safeParse(storage.control.stored());

      const lease = stored.success
        ? stored.data.intents.find(({ id }) => id === intentId)
        : undefined;

      if (lease?.state.state !== "leased" || lease.attempts !== attempt) {
        violations.push("a persistent handler ran before its lease was stored");
      }
    }

    invoked.add(key);
  };

  junction.inbox.subscribe(() => {
    const present = new Set(junction.inbox.get().map(({ id }) => id));

    for (const id of accepted) {
      if (!present.has(id)) {
        ended.add(id);
      }
    }
  });
  junction.start();

  const record = (admission: Admission) => {
    if (admission.status === "accepted" || admission.status === "unconfirmed") {
      accepted.push(admission.intent.id);
    }
  };

  for (const step of steps) {
    if (step.kind === "dispatch") {
      const admission = junction.dispatch(
        step.intent,
        step.intent === "openDocument"
          ? {
              workspaceId: "w",
              documentId: "d",
              ...(step.account === null ? {} : { accountId: step.account }),
            }
          : { announcementId: "a" },
      );

      // A held storage answers a persistent admission only once its write settles, which a later command decides.
      if (mode === "memory") {
        record(await admission);
      } else {
        admission.then(record);
      }
    }

    if (step.kind === "write") {
      const pending = storage.control.writes.find(
        ({ state }) => state === "pending",
      );

      if (step.outcome === "commit") {
        pending?.commit();
      } else {
        pending?.fail({ committed: step.outcome === "fail-after" });
      }
    }

    if (step.kind === "flush") {
      junction.storage.flush();
    }

    if (step.kind === "subscribe") {
      const consumer: Consumer = {
        intent: step.intent,
        matches: step.matches,
        ready: step.ready,
        fallback: step.fallback,
        scope: 0,
        disposed: false,
        registration: null,
      };

      consumers.push(consumer);

      const handleIntent = (
        _payload: unknown,
        execution: IntentExecution<string, boolean>,
      ) => {
        running += 1;
        check(
          consumer,
          execution.intent.id,
          execution.attempt.number,
          execution.account?.id ?? null,
        );

        const settle = <TValue>(value: TValue) => {
          running -= 1;

          return value;
        };

        if (step.behavior === "hold") {
          const deferred = createDeferred<void>();

          held.push(deferred);

          return deferred.promise.then(settle, (error: unknown) => {
            running -= 1;

            throw error;
          });
        }

        if (step.behavior === "throw") {
          running -= 1;

          throw new Error("the handler failed");
        }

        if (step.behavior === "reject") {
          return settle(execution.reject("refused"));
        }

        if (step.behavior === "retry") {
          return settle(execution.retry({ after: 0 }));
        }

        if (step.behavior === "commit") {
          return settle(execution.commit(() => {}));
        }

        return settle(undefined);
      };

      const getOptions = () => ({
        match: () => consumer.matches,
        ready: () => consumer.ready,
        fallback: consumer.fallback,
        scope: consumer.scope,
      });

      const registration = junction.subscribe(
        step.intent,
        handleIntent,
        getOptions(),
      );

      consumer.registration = {
        update: () => registration.update(handleIntent, getOptions()),
        dispose: registration.dispose,
      };
    }

    const consumer = "consumer" in step ? consumers[step.consumer] : undefined;

    if (step.kind === "ready" && consumer !== undefined && !consumer.disposed) {
      consumer.ready = step.ready;
      consumer.registration?.update();
    }

    if (step.kind === "scope" && consumer !== undefined && !consumer.disposed) {
      scopes += 1;
      consumer.scope = scopes;
      consumer.registration?.update();
    }

    if (step.kind === "dispose" && consumer !== undefined) {
      consumer.disposed = true;
      consumer.registration?.dispose();
    }

    if (step.kind === "identity") {
      current = step.identity;
      identity.set(step.identity);
    }

    if (step.kind === "settle") {
      const deferred = held[step.index];

      if (step.outcome === "resolve") {
        deferred?.resolve();
      } else {
        deferred?.reject(new Error("held failure"));
      }
    }

    if (step.kind === "cancel" || step.kind === "retry") {
      const id = accepted[step.index];

      if (id !== undefined) {
        if (step.kind === "cancel") {
          await junction.cancel(id);
        } else {
          await junction.retry(id);
        }
      }
    }

    if (step.kind === "tick") {
      await tick();
    }
  }

  await tick();
  junction.dispose();

  return violations;
};

test("no interleaving of observations, consumers, readiness, identity, outcomes and recovery breaks the delivery invariants", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.oneof(...commands), { minLength: 10, maxLength: 60 }),
      async (steps) => {
        expect(await run(steps, "memory")).toEqual([]);
      },
    ),
    { seed: 20_260_925, numRuns: 300 },
  );
});

test("no interleaving with storage writes that commit, fail or commit and then fail breaks them, and no persistent handler runs before its lease is stored", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.oneof(...commands, ...storageCommands), {
        minLength: 10,
        maxLength: 80,
      }),
      async (steps) => {
        expect(await run(steps, "persistent")).toEqual([]);
      },
    ),
    { seed: 20_260_925, numRuns: 300 },
  );
});

import { describe, expect, test } from "vitest";

import type { InboxStorageConformanceOptions } from "src/testing/types/InboxStorageConformanceOptions";
import type { InboxStorage } from "src/types/InboxStorage";
import type { StandardSchema } from "src/types/StandardSchema";
import { isPlainObject } from "src/utils/common/isPlainObject";
import { intent } from "src/utils/intent";
import { Junction } from "src/utils/Junction";

// A payload of one reference, validated by hand: the suite runs without a schema library.
const reference: StandardSchema<unknown, { reference: string }> = {
  "~standard": {
    version: 1,
    vendor: "junction",
    validate: (value) => {
      if (
        !isPlainObject(value) ||
        typeof value.reference !== "string" ||
        Object.keys(value).length !== 1
      ) {
        return { issues: [{ message: "Expected { reference: string }." }] };
      }

      return { value: { reference: value.reference } };
    },
  },
};

const intents = {
  kept: intent(reference, { persist: { schema: reference } }),
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const createKeptJunction = (storage: InboxStorage) =>
  new Junction({ intents, storage });

/**
 * Registers one `describe` block that holds a storage to the contract through
 * real Junctions and restarts over the same backend: an empty start, an
 * accepted intent surviving, an acknowledged one staying gone, an interrupted
 * lease, and writes that never overlap.
 *
 * @example
 * ```ts
 * testInboxStorage({ name: "mmkv", createFixture: () => ({ storage: mmkvStorage(), reopen: () => mmkvStorage() }) });
 * ```
 */
export const testInboxStorage = ({
  name,
  createFixture,
}: InboxStorageConformanceOptions) => {
  describe(`${name} storage conformance`, () => {
    test("a fresh storage restores an empty inbox, and the Junction starts ready", async () => {
      const { storage } = await createFixture();
      const junction = createKeptJunction(storage);

      await expect(junction.start()).resolves.toMatchObject({
        storage: "ready",
      });
      expect(junction.inbox.get()).toEqual([]);
      junction.dispose();
    });

    test("an accepted intent survives a restart with its id, payload and deadline", async () => {
      const { storage, reopen } = await createFixture();
      const junction = createKeptJunction(storage);

      await junction.start();

      const admission = await junction.dispatch("kept", {
        reference: "reference-1",
      });

      const [entry] = junction.inbox.get();

      junction.dispose();

      const restarted = createKeptJunction(await reopen());

      await restarted.start();

      expect(admission).toMatchObject({
        status: "accepted",
        durability: "committed",
      });
      expect(restarted.inbox.get()).toMatchObject([
        {
          id: entry?.id,
          payload: { reference: "reference-1" },
          expires: entry?.expires,
          state: "pending",
        },
      ]);
      restarted.dispose();
    });

    test("an acknowledged intent is gone after a restart, and a replay of its occurrence is a duplicate", async () => {
      const { storage, reopen } = await createFixture();
      const junction = createKeptJunction(storage);

      await junction.start();
      junction.subscribe("kept", () => {});

      const admission = await junction.dispatch(
        "kept",
        { reference: "reference-1" },
        { interaction: { key: "occurrence-1" } },
      );

      await tick();
      await expect(junction.storage.flush()).resolves.toEqual({
        state: "ready",
        durability: "committed",
      });
      junction.dispose();

      const restarted = createKeptJunction(await reopen());

      await restarted.start();

      expect(restarted.inbox.get()).toEqual([]);
      await expect(
        restarted.dispatch(
          "kept",
          { reference: "reference-1" },
          { interaction: { key: "occurrence-1" } },
        ),
      ).resolves.toMatchObject({
        status: "duplicate",
        intent: admission.status === "accepted" ? admission.intent : {},
      });
      restarted.dispose();
    });

    test("an intent whose handler held the lease when the process ended comes back interrupted", async () => {
      const { storage, reopen } = await createFixture();
      const junction = createKeptJunction(storage);

      await junction.start();
      junction.subscribe("kept", () => new Promise(() => {}));
      await junction.dispatch("kept", { reference: "reference-1" });
      await tick();
      await junction.storage.flush();
      junction.dispose();

      const restarted = createKeptJunction(await reopen());

      await restarted.start();

      expect(restarted.inbox.get()).toMatchObject([
        { state: "interrupted", error: { code: "PROCESS_RESTARTED" } },
      ]);
      restarted.dispose();
    });

    test("replace is never called while another replace is on its way", async () => {
      const { storage } = await createFixture();
      const calls = { running: 0, overlapped: false };

      const junction = createKeptJunction({
        read: () => storage.read(),
        replace: (snapshot, operation) => {
          calls.overlapped = calls.overlapped || calls.running > 0;
          calls.running += 1;

          return Promise.resolve(storage.replace(snapshot, operation)).finally(
            () => {
              calls.running -= 1;
            },
          );
        },
      });

      await junction.start();
      junction.subscribe("kept", () => {});
      await Promise.all(
        ["a", "b", "c"].map((key) =>
          junction.dispatch("kept", { reference: key }),
        ),
      );
      await tick();
      await junction.storage.flush();

      expect(calls.overlapped).toBe(false);
      junction.dispose();
    });
  });
};

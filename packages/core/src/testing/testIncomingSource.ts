import { describe, expect, test } from "vitest";

import type { IncomingSourceConformanceOptions } from "src/testing/types/IncomingSourceConformanceOptions";
import type { IncomingSourceFixture } from "src/testing/types/IncomingSourceFixture";
import type { StandardSchema } from "src/types/StandardSchema";
import { intent } from "src/utils/intent";
import { Junction } from "src/utils/Junction";

// Any input becomes the same empty payload: the suite checks delivery, not mapping.
const observed: StandardSchema<unknown, Record<string, never>> = {
  "~standard": {
    version: 1,
    vendor: "junction",
    validate: () => ({ value: {} }),
  },
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const createObservedJunction = <TInput, TNative>(
  fixture: IncomingSourceFixture<TInput, TNative>,
) =>
  new Junction({
    intents: { observed: intent(observed) },
    sources: { tested: fixture.source },
    routes: ({ from }) => ({
      everything: from.tested.event({
        intent: "observed",
        payload: () => ({}),
      }),
    }),
  });

/**
 * Registers one `describe` block that holds a source to the contract through
 * a real Junction: coldness, `native`, synchronous attachment, one intent per
 * actionable entry point, the launch read, no intent from a miss, and the
 * listeners removed by dispose.
 *
 * @example
 * ```ts
 * testIncomingSource({ name: "react-native-linking", createFixture: () => createLinkingFixture() });
 * ```
 */
export const testIncomingSource = <TInput, TNative>({
  name,
  createFixture,
}: IncomingSourceConformanceOptions<TInput, TNative>) => {
  describe(`${name} source conformance`, () => {
    test("the source names itself, and creating it installs nothing on the provider", async () => {
      const fixture = await createFixture();

      expect(typeof fixture.source.name).toBe("string");
      expect(fixture.source.name).not.toBe("");
      expect(fixture.listeners()).toBe(0);
    });

    test("native is the SDK the fixture gave the source, before and after start", async () => {
      const fixture = await createFixture();
      const junction = createObservedJunction(fixture);

      expect(junction.source("tested").native).toBe(fixture.native);

      junction.start();

      expect(junction.source("tested").native).toBe(fixture.native);
      junction.dispose();
    });

    test("start installs the provider listener synchronously, and a second start installs no other", async () => {
      const fixture = await createFixture();
      const junction = createObservedJunction(fixture);

      junction.start();

      const listeners = fixture.listeners();

      expect(listeners).toBeGreaterThan(0);

      junction.start();

      expect(fixture.listeners()).toBe(listeners);
      junction.dispose();
    });

    test("one actionable entry point becomes exactly one accepted intent", async () => {
      const fixture = await createFixture();
      const junction = createObservedJunction(fixture);

      await junction.start();
      await fixture.open();
      await tick();

      expect(junction.inbox.get()).toHaveLength(1);
      expect(junction.inbox.get()[0]?.provenance).toMatchObject({
        kind: "source",
        source: { name: "tested" },
      });
      junction.dispose();
    });

    test("a launch entry point is admitted as initial, and without one the launch read reports no intent", async () => {
      const fixture = await createFixture();

      if (fixture.launch === undefined) {
        const junction = createObservedJunction(fixture);
        const report = await junction.start();

        await tick();

        expect(["empty", "none"]).toContain(report.sources[0]?.initial);
        expect(junction.inbox.get()).toEqual([]);
        junction.dispose();

        return;
      }

      await fixture.launch();

      const junction = createObservedJunction(fixture);
      const report = await junction.start();

      await tick();

      expect(report.sources).toEqual([{ name: "tested", initial: "received" }]);
      expect(junction.inbox.get()).toMatchObject([
        { provenance: { kind: "source", initial: true } },
      ]);
      junction.dispose();
    });

    test("a result the provider does not report as actionable produces no intent", async (context) => {
      const fixture = await createFixture();

      if (fixture.miss === undefined) {
        context.skip("The fixture's provider has no result to miss.");

        return;
      }

      const junction = createObservedJunction(fixture);

      await junction.start();
      await fixture.miss();
      await tick();

      expect(junction.inbox.get()).toEqual([]);
      junction.dispose();
    });

    test("dispose removes every listener the source installed, and where its provider offers no removal, a callback after it is harmless", async () => {
      const fixture = await createFixture();
      const junction = createObservedJunction(fixture);

      await junction.start();
      junction.dispose();
      await tick();

      if (fixture.detaches === false) {
        await expect(
          Promise.resolve().then(fixture.open),
        ).resolves.toBeUndefined();

        return;
      }

      expect(fixture.listeners()).toBe(0);
    });
  });
};

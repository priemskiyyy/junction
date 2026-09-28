import type { InboxStorageFixture } from "src/testing/types/InboxStorageFixture";

/**
 * What `testInboxStorage` needs: a name for the suite and a factory for a
 * fresh fixture, over an empty backend, per test.
 *
 * @example
 * ```ts
 * testInboxStorage({ name: "silo", createFixture });
 * ```
 */
export type InboxStorageConformanceOptions = {
  name: string;
  createFixture: () => InboxStorageFixture | Promise<InboxStorageFixture>;
};

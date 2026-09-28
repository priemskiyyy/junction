import type { InboxStorage } from "src/types/InboxStorage";

/**
 * One fresh storage over an empty backend, and a way to open the same backend
 * again, as the application does after a restart.
 *
 * @example
 * ```ts
 * const createFixture = (): InboxStorageFixture => ({
 *   storage: mmkvStorage({ key: "junction.test" }),
 *   reopen: () => mmkvStorage({ key: "junction.test" }),
 * });
 * ```
 */
export type InboxStorageFixture = {
  storage: InboxStorage;
  /** Another storage over the same backend, as a restarted application opens it. */
  reopen: () => InboxStorage | Promise<InboxStorage>;
};

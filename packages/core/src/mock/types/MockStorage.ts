import type { MockWrite } from "src/mock/types/MockWrite";
import type { InboxStorage } from "src/types/InboxStorage";

/**
 * A mock storage and its controls: what a restart would read, every write in
 * order, held reads and writes, and failures before or after a commit.
 *
 * @example
 * ```ts
 * const { storage, control } = createMockStorage();
 *
 * control.failNext({ committed: false });
 * ```
 */
export type MockStorage = {
  storage: InboxStorage;
  control: {
    /** What a restarted application would read: the last committed snapshot, or what the storage started with. */
    stored: () => unknown;
    writes: MockWrite[];
    read: { settle: () => void; fail: (error: unknown) => void };
    /** From now on, each write waits until the test commits or fails it. */
    hold: () => void;
    /** Stops holding: every pending write commits, and later ones commit at once. */
    release: () => void;
    /** The next write fails, after committing its snapshot or not. */
    failNext: (options: { committed: boolean }) => void;
    /** How many times `dispose` was called. */
    disposals: () => number;
  };
};

import type { MockStorage } from "src/mock/types/MockStorage";
import type { MockStorageOptions } from "src/mock/types/MockStorageOptions";
import type { MockWrite } from "src/mock/types/MockWrite";
import type { InboxSnapshot } from "src/types/InboxSnapshot";
import { createDeferred } from "src/utils/common/createDeferred";

/**
 * A storage for tests that keeps one snapshot in memory and settles every
 * write the way the test says: at once by default, or held, or failed before
 * or after it committed. A restart reads what it committed.
 *
 * @example
 * ```ts
 * const { storage, control } = createMockStorage();
 * const junction = new Junction({ intents, storage });
 *
 * const restarted = new Junction({ intents, storage: createMockStorage({ stored: control.stored() }).storage });
 * ```
 */
export const createMockStorage = (
  options: MockStorageOptions = {},
): MockStorage => {
  const state: {
    stored: unknown;
    held: boolean;
    failure: { committed: boolean } | null;
    disposals: number;
  } = { stored: options.stored, held: false, failure: null, disposals: 0 };

  const writes: MockWrite[] = [];
  const read = createDeferred<void>();

  if (options.read !== "hold") {
    read.resolve();
  }

  const replace = (snapshot: InboxSnapshot, operation: { id: string }) => {
    const settled = createDeferred<void>();

    const write: MockWrite = {
      snapshot,
      operation,
      state: "pending",
      commit: () => {
        if (write.state !== "pending") {
          return;
        }

        write.state = "committed";
        state.stored = snapshot;
        settled.resolve();
      },
      fail: ({ committed }) => {
        if (write.state !== "pending") {
          return;
        }

        write.state = "failed";

        if (committed) {
          state.stored = snapshot;
        }

        settled.reject(new Error("The mock storage failed the write."));
      },
    };

    writes.push(write);

    const failure = state.failure;

    state.failure = null;

    if (failure !== null) {
      write.fail(failure);

      return settled.promise;
    }

    if (!state.held) {
      write.commit();
    }

    return settled.promise;
  };

  return {
    storage: {
      read: () => read.promise.then(() => state.stored),
      replace,
      dispose: () => {
        state.disposals += 1;
      },
    },
    control: {
      stored: () => state.stored,
      writes,
      read: {
        settle: () => read.resolve(),
        fail: (error) => read.reject(error),
      },
      hold: () => {
        state.held = true;
      },
      release: () => {
        state.held = false;

        for (const write of writes) {
          write.commit();
        }
      },
      failNext: (failure) => {
        state.failure = failure;
      },
      disposals: () => state.disposals,
    },
  };
};

import type { InboxStorage } from "@priemskiyyy/junction";

import {
  CORRUPT_SNAPSHOT,
  STORAGE_LATENCY,
  WRITES_LENGTH,
} from "example-shared/storage/constants/storage";
import type { LabStorageState } from "example-shared/storage/types/LabStorageState";
import type { StorageWrite } from "example-shared/storage/types/StorageWrite";
import { createValueStore } from "example-shared/utils/createValueStore";
import { wait } from "example-shared/utils/wait";

const EMPTY_STATE: LabStorageState = {
  snapshot: null,
  writes: [],
  failing: false,
  corrupt: false,
  epoch: 0,
};

/**
 * An `InboxStorage` over the device's storage, which outlives every launch:
 * each snapshot replaces the last whole, a failing disk rejects writes, and
 * a corrupt saved inbox is what the next launch reads.
 */
export const createLabStorage = ({
  getNextId,
  now,
}: {
  getNextId: () => number;
  now: () => number;
}) => {
  const state = createValueStore<LabStorageState>(EMPTY_STATE);

  const update = (changes: Partial<LabStorageState>) => {
    state.set({ ...state.get(), ...changes });
  };

  const storage: InboxStorage = {
    read: async () => {
      await wait(STORAGE_LATENCY);

      const { snapshot, corrupt } = state.get();

      if (corrupt) {
        return CORRUPT_SNAPSHOT;
      }

      return snapshot ?? undefined;
    },
    replace: async (snapshot) => {
      const { epoch } = state.get();

      await wait(STORAGE_LATENCY);

      const current = state.get();

      // A write that was on its way when the lab scrambled or cleared the storage lands on nothing.
      if (current.epoch !== epoch) {
        return;
      }

      const write: StorageWrite = {
        id: getNextId(),
        timestamp: now(),
        revision: snapshot.revision,
        intents: snapshot.intents.length,
        status: current.failing ? "failed" : "committed",
      };

      const writes = [write, ...current.writes].slice(0, WRITES_LENGTH);

      if (current.failing) {
        update({ writes });

        throw new Error("The device's storage is full.");
      }

      update({ snapshot, corrupt: false, writes });
    },
  };

  return {
    storage,
    state: { get: state.get, subscribe: state.subscribe },
    setFailing: (failing: boolean) => {
      update({ failing });
    },
    corrupt: () => {
      update({ corrupt: true, epoch: state.get().epoch + 1 });
    },
    clear: () => {
      state.set({ ...EMPTY_STATE, epoch: state.get().epoch + 1 });
    },
  };
};

import type { InboxSnapshot, InboxStorage } from "@priemskiyyy/junction";

import type { SiloStorageOptions } from "src/types/SiloStorageOptions";

/**
 * A Junction storage over one Silo value: `read` waits for its hydration and
 * answers what it holds, and `replace` sets the whole snapshot and waits for
 * Silo's `flush()`. The application's Silo keeps owning the value; the
 * storage never removes or disposes it.
 *
 * @example
 * ```ts
 * const store = new Silo({
 *   storages: { default: { adapters: [mmkv({ storage: new MMKV({ id: "junction" }) })], schema: { junctionInbox: value<InboxSnapshot>() } } },
 * });
 *
 * const junction = new Junction({ intents, storage: silo({ value: store.value("junctionInbox") }) });
 * ```
 */
export const silo = ({ value }: SiloStorageOptions): InboxStorage => ({
  read: async () => {
    await value.hydrated();

    const status = value.status.get();

    // Silo settles hydration even when it failed, leaving the fallback in place: that is a failed read, never an empty inbox.
    if (status.state === "error") {
      throw status.error;
    }

    return value.get() ?? undefined;
  },
  replace: (snapshot: InboxSnapshot) => {
    value.set(snapshot);

    return value.flush();
  },
});

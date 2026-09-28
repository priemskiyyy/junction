import type { InboxSnapshot, InboxStorage } from "@priemskiyyy/junction";
import { expectTypeOf } from "vitest";

import type { createFakeSiloValue } from "src/fakeSiloValue.fixture";
import { silo } from "src/silo";
import type { SiloValueLike } from "src/types/SiloValueLike";

// Silo 0.1.0's handle for a value<InboxSnapshot>() declaration, copied from its source because the package is not published.
type SiloValue = {
  get: () => InboxSnapshot | undefined;
  subscribe: (listener: () => void) => () => void;
  set: (value: InboxSnapshot | undefined) => void;
  remove: () => void;
  status: {
    get: () =>
      | { state: "hydrating" }
      | { state: "ready" }
      | {
          state: "error";
          error: {
            phase: "migrate" | "hydrate" | "read" | "write";
            cause: unknown;
          } & { phase: "hydrate" | "read" | "write" };
        };
    subscribe: (listener: () => void) => () => void;
  };
  hydrated: () => Promise<void>;
  reload: () => Promise<void>;
  flush: () => Promise<void>;
};

declare const handle: SiloValue;

declare const theme: Omit<SiloValue, "set"> & {
  set: (value: "light" | "dark") => void;
};

expectTypeOf(handle).toExtend<SiloValueLike>();
expectTypeOf(silo({ value: handle })).toEqualTypeOf<InboxStorage>();
expectTypeOf<keyof ReturnType<typeof createFakeSiloValue>["value"]>().toExtend<
  keyof SiloValue
>();

// @ts-expect-error A value of another type cannot hold the inbox.
export const wrongValue = silo({ value: theme });

export const withoutFlush = silo({
  // @ts-expect-error A handle without flush cannot say when a write is durable.
  value: {
    get: handle.get,
    set: handle.set,
    status: handle.status,
    hydrated: handle.hydrated,
  },
});

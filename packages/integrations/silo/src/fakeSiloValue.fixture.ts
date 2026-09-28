import type { InboxSnapshot } from "@priemskiyyy/junction";

type Status =
  | { state: "hydrating" }
  | { state: "ready" }
  | { state: "error"; error: unknown };

type Barrier = {
  target: number;
  resolve: () => void;
  reject: (error: unknown) => void;
};

export type FakeSiloBackend = {
  stored: unknown;
  refusal: unknown;
  corrupt: boolean;
};

export const createFakeSiloBackend = (): FakeSiloBackend => ({
  stored: undefined,
  refusal: null,
  corrupt: false,
});

// Modelled on Silo 0.1.0's value record over an asynchronous adapter: hydration reads the adapter once and settles hydrated() even when it failed, leaving the fallback and an error status; set updates the snapshot at once and keeps only the newest pending write; flush() settles once the newest accepted write is durable, and keeps rejecting after a refused one until a newer write is accepted.
export const createFakeSiloValue = ({
  backend,
  fallback,
  hydration = "immediate",
}: {
  backend: FakeSiloBackend;
  fallback?: null;
  hydration?: "immediate" | "hold";
}) => {
  const state: { value: unknown; status: Status } = {
    value: fallback,
    status: { state: "hydrating" },
  };

  const queue: {
    accepted: number;
    durable: number;
    pending: { value: InboxSnapshot; generation: number } | null;
    inflight: boolean;
    failure: { error: unknown } | null;
    barriers: Barrier[];
  } = {
    accepted: 0,
    durable: 0,
    pending: null,
    inflight: false,
    failure: null,
    barriers: [],
  };

  const sets: InboxSnapshot[] = [];

  let finishHydration = () => {};

  const hydrated = new Promise<void>((resolve) => {
    finishHydration = resolve;
  });

  const release = (bound: number, settle: (barrier: Barrier) => void) => {
    const waiting: Barrier[] = [];

    for (const barrier of queue.barriers) {
      if (barrier.target > bound) {
        waiting.push(barrier);

        continue;
      }

      settle(barrier);
    }

    queue.barriers = waiting;
  };

  const drain = () => {
    const operation = queue.pending;

    if (
      queue.inflight ||
      operation === null ||
      state.status.state === "hydrating"
    ) {
      return;
    }

    queue.pending = null;
    queue.inflight = true;

    queueMicrotask(() => {
      queue.inflight = false;

      const { refusal } = backend;

      if (refusal !== null) {
        release(operation.generation, (barrier) => barrier.reject(refusal));

        if (queue.accepted === operation.generation) {
          queue.failure = { error: refusal };
        }
      } else {
        backend.stored = operation.value;
        queue.durable = Math.max(queue.durable, operation.generation);
        release(queue.durable, (barrier) => barrier.resolve());
      }

      drain();
    });
  };

  const hydrate = () => {
    if (backend.corrupt) {
      state.status = {
        state: "error",
        error: new Error("Silo could not decode the stored value."),
      };
    } else {
      state.value = backend.stored ?? fallback;
      state.status = { state: "ready" };
    }

    finishHydration();
    drain();
  };

  if (hydration === "immediate") {
    queueMicrotask(hydrate);
  }

  return {
    value: {
      get: () => state.value,
      set: (value: InboxSnapshot) => {
        state.value = value;
        queue.accepted += 1;
        queue.failure = null;
        queue.pending = { value, generation: queue.accepted };
        sets.push(value);
        drain();
      },
      status: { get: () => state.status },
      hydrated: () => hydrated,
      flush: () => {
        if (queue.accepted <= queue.durable) {
          return Promise.resolve();
        }

        if (queue.failure !== null) {
          return Promise.reject(queue.failure.error);
        }

        return new Promise<void>((resolve, reject) => {
          queue.barriers.push({ target: queue.accepted, resolve, reject });
        });
      },
    },
    sets,
    hydrate,
  };
};

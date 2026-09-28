import type { InboxStorage } from "src/types/InboxStorage";
import { createDeferred } from "src/utils/common/createDeferred";
import { unrefTimer } from "src/utils/internal/runtime/unrefTimer";

type ReadAnswer =
  | { kind: "READ"; value: unknown }
  | { kind: "FAILED"; cause: unknown }
  | { kind: "TIMED_OUT" }
  | { kind: "DISPOSED" };

export class StorageRead {
  #answer = createDeferred<ReadAnswer>();
  #timer: ReturnType<typeof setTimeout>;
  #inflight: Promise<void> | null;

  constructor({
    storage,
    timeout,
  }: {
    storage: InboxStorage;
    timeout: number;
  }) {
    this.#timer = setTimeout(
      () => this.#settle({ kind: "TIMED_OUT" }),
      timeout,
    );
    unrefTimer(this.#timer);

    const read = new Promise<unknown>((resolve) => {
      resolve(storage.read());
    });

    read.then(
      (value) => this.#settle({ kind: "READ", value }),
      (cause: unknown) => this.#settle({ kind: "FAILED", cause }),
    );

    const land = () => {
      this.#inflight = null;
    };

    this.#inflight = read.then(land, land);
  }

  answer = () => this.#answer.promise;

  dispose = () => this.#settle({ kind: "DISPOSED" });

  // A read in flight settles before the storage is disposed, as a write in flight does.
  whenLanded = (callback: () => void) => {
    const inflight = this.#inflight;

    if (inflight === null) {
      callback();

      return;
    }

    inflight.then(callback);
  };

  #settle(answer: ReadAnswer) {
    clearTimeout(this.#timer);
    this.#answer.resolve(answer);
  }
}

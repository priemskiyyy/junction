import type { JunctionIdentity } from "src/types/JunctionIdentity";
import type { ObservableValue } from "src/types/ObservableValue";
import { callContained } from "src/utils/common/callContained";
import {
  ANONYMOUS_IDENTITY,
  RESTORING_IDENTITY,
} from "src/utils/constants/states";
import { isSameIdentity } from "src/utils/internal/identity/isSameIdentity";

export class IdentityBinding {
  #store: ObservableValue<JunctionIdentity> | null;
  #current: JunctionIdentity;
  #release: () => void = () => {};

  constructor(store: ObservableValue<JunctionIdentity> | undefined) {
    this.#store = store ?? null;
    this.#current =
      store === undefined ? ANONYMOUS_IDENTITY : RESTORING_IDENTITY;
  }

  current = () => this.#current;

  // Subscribing before the first read means no change can fall between the two.
  start = (onChange: (previous: JunctionIdentity) => void) => {
    const store = this.#store;

    if (store === null) {
      return;
    }

    try {
      this.#release = store.subscribe(() => {
        const previous = this.#current;

        if (this.#read(store)) {
          onChange(previous);
        }
      });
    } catch {
      return;
    }

    this.#read(store);
  };

  dispose = () => {
    const release = this.#release;

    this.#release = () => {};

    callContained(release, () => {});
  };

  #read(store: ObservableValue<JunctionIdentity>) {
    let next: JunctionIdentity;

    try {
      next = store.get();

      // An id that is not a string would be stored where no restore could read it back.
      if (
        next.status === "authenticated" &&
        typeof next.account.id !== "string"
      ) {
        next = RESTORING_IDENTITY;
      }
    } catch {
      next = RESTORING_IDENTITY;
    }

    if (isSameIdentity(this.#current, next)) {
      return false;
    }

    this.#current = next;

    return true;
  }
}

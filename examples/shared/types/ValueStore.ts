import type { ObservableValue } from "@priemskiyyy/junction";

/** A value every framework reads through `get` and `subscribe`, and the lab changes with `set`. */
export type ValueStore<T> = ObservableValue<T> & { set: (next: T) => void };

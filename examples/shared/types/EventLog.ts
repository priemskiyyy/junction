import type { ObservableValue } from "@priemskiyyy/junction";

/** A bounded, newest-first list every framework reads, which the page can clear. */
export type EventLog<T> = ObservableValue<T[]> & { clear: () => void };

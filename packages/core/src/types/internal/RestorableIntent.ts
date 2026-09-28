import type { StoredIntent } from "src/types/internal/StoredIntent";

export type RestorableIntent = Omit<StoredIntent, "payload"> & {
  payload: unknown;
};

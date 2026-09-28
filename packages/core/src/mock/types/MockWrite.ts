import type { InboxSnapshot } from "src/types/InboxSnapshot";

/**
 * One `replace` call a mock storage received: its snapshot and operation, how
 * it settled, and, while held, the controls that settle it.
 *
 * @example
 * ```ts
 * control.writes[0]?.fail({ committed: true });
 * ```
 */
export type MockWrite = {
  snapshot: InboxSnapshot;
  operation: { id: string };
  state: "pending" | "committed" | "failed";
  /** Commits the snapshot and resolves the write. */
  commit: () => void;
  /** Rejects the write, after committing the snapshot or not. */
  fail: (options: { committed: boolean }) => void;
};

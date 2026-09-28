import type { InboxEntry } from "src/types/InboxEntry";
import type { JunctionIdentity } from "src/types/JunctionIdentity";
import type { SourceStatus } from "src/types/SourceStatus";
import type { StorageStatus } from "src/types/StorageStatus";
import type { WaitingReason } from "src/types/WaitingReason";

/**
 * What a devtools panel shows: the lifecycle, the identity's and the
 * storage's status, every source, consumer and intent without its payload,
 * and the attempt holding the execution slot.
 *
 * @example
 * ```ts
 * const { intents, running } = junction.diagnostics.get();
 * ```
 */
export type JunctionSnapshot = {
  state: "idle" | "started" | "disposed";
  identity: { status: JunctionIdentity["status"] };
  storage: StorageStatus;
  sources: { name: string; adapter: { name: string }; status: SourceStatus }[];
  consumers: {
    id: string;
    name: string | null;
    intent: { name: string };
    fallback: boolean;
  }[];
  intents: {
    id: string;
    name: string;
    state: InboxEntry<string, unknown>["state"];
    attempts: number;
    waiting: WaitingReason | null;
  }[];
  /** The attempt holding the execution slot; `blocked` once it outlived its timeout. */
  running: {
    intent: { id: string };
    attempt: { id: string };
    blocked: boolean;
  } | null;
};

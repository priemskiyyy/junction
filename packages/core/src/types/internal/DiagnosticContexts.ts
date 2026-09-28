import type { Admission } from "src/types/Admission";
import type { FailureCode } from "src/types/internal/FailureCode";
import type { InterruptionCode } from "src/types/internal/InterruptionCode";
import type { JunctionIdentity } from "src/types/JunctionIdentity";
import type { RejectionReason } from "src/types/RejectionReason";
import type { StorageStatus } from "src/types/StorageStatus";
import type { WaitingReason } from "src/types/WaitingReason";

export type DiagnosticContexts = {
  "junction started": null;
  "junction disposed": null;
  "identity changed": { status: JunctionIdentity["status"] };
  "source attached": null;
  "source failed": null;
  "source error": null;
  "source dispose failed": null;
  "initial read settled": {
    initial: "received" | "empty" | "failed" | "timed-out";
    late: boolean;
  };
  "callback ignored": null;
  "observation ignored": {
    reason: Extract<Admission, { status: "ignored" }>["reason"];
  };
  "observation rejected": { reason: RejectionReason };
  "intent accepted": null;
  "intent duplicate": null;
  "intent waiting": { reason: WaitingReason; consumers: number };
  "attempt started": {
    attempt: { id: string; number: number };
    consumer: { id: string };
  };
  "attempt invalidated":
    | { reason: "interrupted"; code: InterruptionCode }
    | { reason: "expired" | "cancelled"; code: null };
  "effect committed": null;
  "execution blocked": null;
  "intent acknowledged": { ignored: "threw" | "answered" | null };
  "intent rejected": { reason: string };
  "intent failed": { code: FailureCode };
  "intent interrupted": { code: InterruptionCode };
  "retry scheduled": { after: number };
  "intent expired": { running: boolean };
  "intent cancelled": { running: boolean };
  "intent quarantined": {
    reason:
      | "unknown-intent"
      | "not-persistent"
      | "unsupported-version"
      | "binding-mismatch"
      | "invalid-payload";
  };
  "storage hydrated": { restored: number; quarantined: number };
  "storage blocked": {
    code: Extract<StorageStatus, { state: "blocked" }>["error"]["code"];
  };
  "storage write failed": null;
  "storage reset": null;
  "storage dispose failed": null;
};

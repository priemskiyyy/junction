import type { Inspection } from "src/types/Inspection";
import type { IntentPayload } from "src/types/IntentPayload";

/**
 * What `inspect` explains, typed by a registry: a matched inspection's
 * `intent` is a union discriminated by `name`, so narrowing it types `payload`.
 *
 * @example
 * ```ts
 * const inspection: InspectionOf<typeof intents> = junction.inspect("links", { url });
 *
 * if (inspection.status === "matched" && inspection.intent.name === "openDocument") {
 *   console.log(inspection.intent.payload.documentId);
 * }
 * ```
 */
export type InspectionOf<TIntents> =
  | {
      status: "matched";
      route: { id: string };
      intent: {
        [TName in keyof TIntents & string]: {
          name: TName;
          payload: IntentPayload<TIntents[TName]>;
        };
      }[keyof TIntents & string];
    }
  | Exclude<Inspection, { status: "matched" }>;

import type { JsonValue } from "src/types/JsonValue";

/**
 * A JSON object: what an intent schema must produce, so a payload can grow a
 * field without breaking and is always safe to copy, compare and persist.
 *
 * @example
 * ```ts
 * const payload: JsonObject = { workspaceId: "workspace-7", documentId: "document-42" };
 * ```
 */
export type JsonObject = { [key: string]: JsonValue | undefined };

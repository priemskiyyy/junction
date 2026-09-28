/**
 * A value JSON can carry, which is what an intent payload is made of: an
 * optional field is an absent key, so an object's values may be `undefined`.
 *
 * @example
 * ```ts
 * const payload: JsonValue = { documentId: "document-42", tags: ["urgent"] };
 * ```
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

/**
 * One reason a value was refused: `path` is dotted, such as `workspace.id`,
 * or empty for the value as a whole.
 *
 * @example
 * ```ts
 * const issue: Issue = { path: "documentId", message: "Expected a string." };
 * ```
 */
export type Issue = { path: string; message: string };

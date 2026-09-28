import type { Issue } from "src/types/Issue";

/**
 * What a definition's `parse` or `restore` answers: the value it accepts, or
 * the issues that refuse it.
 *
 * @example
 * ```ts
 * const result: ValidationResult<{ id: string }> = { status: "valid", value: { id: "a" } };
 * ```
 */
export type ValidationResult<TValue> =
  { status: "valid"; value: TValue } | { status: "invalid"; issues: Issue[] };

/**
 * How a mock storage starts: what it already holds, as a restarted
 * application would find it, and whether its read waits for the test.
 *
 * @example
 * ```ts
 * const restarted = createMockStorage({ stored: previous.control.stored() });
 * ```
 */
export type MockStorageOptions = {
  /** The stored value `read` answers: nothing by default, or any value, a corrupt one included. */
  stored?: unknown;
  /** `hold` keeps the read pending until `control.read.settle()` or `control.read.fail()`. */
  read?: "hold" | undefined;
};

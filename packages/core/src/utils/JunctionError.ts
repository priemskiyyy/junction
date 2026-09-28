import type { JunctionErrorCode } from "src/types/JunctionErrorCode";

/**
 * An error Junction created, with a `code` to branch on. What a handler or a
 * provider SDK threw is its `cause`, and never reaches diagnostics.
 *
 * @example
 * ```ts
 * const entry = junction.inbox.get()[0];
 *
 * if (entry?.state === "failed" && entry.error.code === "HANDLER_FAILED") {
 *   console.warn(entry.error.cause);
 * }
 * ```
 */
export class JunctionError<
  TCode extends JunctionErrorCode = JunctionErrorCode,
> extends Error {
  code: TCode;

  constructor({
    code,
    message,
    cause,
  }: {
    code: TCode;
    message: string;
    cause?: unknown;
  }) {
    // `{ cause: undefined }` would still give the error a `cause` of its own.
    super(message, cause === undefined ? undefined : { cause });
    this.name = "JunctionError";
    this.code = code;
  }
}

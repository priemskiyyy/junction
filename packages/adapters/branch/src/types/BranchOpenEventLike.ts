/**
 * What Branch reports when it finished opening a session: its params and
 * URI on success, or an error message. Native code sends a missing URI as
 * `null`, where Branch's declarations say `undefined`.
 *
 * @example
 * ```ts
 * const event: BranchOpenEventLike = { params: { "+clicked_branch_link": true }, error: null, uri: "https://example.app.link/abc" };
 * ```
 */
export type BranchOpenEventLike =
  | {
      params: Record<string, unknown>;
      error: null | undefined;
      uri: string | null | undefined;
    }
  | {
      params: Record<string, unknown> | undefined;
      error: string;
      uri: string | null | undefined;
    };

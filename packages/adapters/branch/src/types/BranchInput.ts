/**
 * What the source pushes for every Branch link: the link's params under
 * Branch's own names, and the URI the app was opened with, `null` when
 * Branch reports none.
 *
 * @example
 * ```ts
 * const input: BranchInput = { params: { "+clicked_branch_link": true, documentId: "42" }, uri: null };
 * ```
 */
export type BranchInput = {
  params: Record<string, unknown>;
  uri: string | null;
};

import type { BranchOpenEventLike } from "src/types/BranchOpenEventLike";

/**
 * The part of react-native-branch's `branch` the source calls. Pass the
 * module's default export; the source never opens a URL, reads referring
 * params, sets an identity or changes tracking with it.
 *
 * @example
 * ```ts
 * const sdk: BranchLike = Branch;
 * ```
 */
export type BranchLike = {
  subscribe: (options: {
    onOpenComplete: (event: BranchOpenEventLike) => void;
  }) => () => void;
};

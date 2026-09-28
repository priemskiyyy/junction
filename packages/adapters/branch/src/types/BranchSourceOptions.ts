import type { BranchLike } from "src/types/BranchLike";

/**
 * The options of `branch()`: the react-native-branch module the application
 * already has.
 *
 * @example
 * ```ts
 * const options: BranchSourceOptions<typeof Branch> = { sdk: Branch };
 * ```
 */
export type BranchSourceOptions<TSdk extends BranchLike> = {
  /** react-native-branch's default export. */
  sdk: TSdk;
};

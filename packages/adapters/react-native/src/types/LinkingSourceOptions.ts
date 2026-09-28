import type { LinkingLike } from "src/types/LinkingLike";

/**
 * The options of `linking()`: the Linking module the application already has.
 *
 * @example
 * ```ts
 * const options: LinkingSourceOptions<typeof Linking> = { sdk: Linking };
 * ```
 */
export type LinkingSourceOptions<TSdk extends LinkingLike> = {
  /** React Native's `Linking`, or the `expo-linking` module: `import * as Linking from "expo-linking"`. */
  sdk: TSdk;
};

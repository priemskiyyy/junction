import type { DetourLike } from "src/types/DetourLike";

/**
 * The options of `detour()`: the SDK's `Detour` facade.
 *
 * @example
 * ```ts
 * const options: DetourSourceOptions<typeof Detour> = { sdk: Detour };
 * ```
 */
export type DetourSourceOptions<TSdk extends DetourLike> = {
  /** The `Detour` facade of `@swmansion/react-native-detour`. */
  sdk: TSdk;
};

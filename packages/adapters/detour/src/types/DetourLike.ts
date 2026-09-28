/**
 * The parts of `@swmansion/react-native-detour`'s `Detour` facade the source
 * calls: its listener and its launch read, which report the links the
 * mounted `DetourProvider` resolves.
 *
 * @example
 * ```ts
 * const sdk: DetourLike = Detour;
 * ```
 */
export type DetourLike = {
  /** Settles once the mounted `DetourProvider` finished its launch processing, handing the launch URL to the calls waiting by then or to the first call after. */
  getInitialURL: () => Promise<string | undefined>;
  addEventListener: (
    event: "url",
    listener: (event: { url: string }) => void,
  ) => { remove: () => void };
};

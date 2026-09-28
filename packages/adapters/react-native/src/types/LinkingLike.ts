/**
 * The parts of React Native's `Linking` the source calls, which the
 * `expo-linking` module has too. Pass either; the source never opens a URL,
 * and never reads or clears Expo's cached linking URL.
 *
 * @example
 * ```ts
 * const sdk: LinkingLike = Linking;
 * ```
 */
export type LinkingLike = {
  addEventListener: (
    type: "url",
    listener: (event: { url: string }) => void,
  ) => { remove: () => void };
  /** Resolves the URL that launched the app, and `null` or `undefined` when no link did. */
  getInitialURL: () => Promise<string | null | undefined>;
};

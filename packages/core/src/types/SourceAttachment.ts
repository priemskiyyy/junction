import type { SourceObservation } from "src/types/SourceObservation";

/**
 * What `attach` returns: the launch read, when the provider has one, and the
 * removal of every listener `attach` installed.
 *
 * @example
 * ```ts
 * const attachment: SourceAttachment<{ url: string }> = {
 *   initial: async () => {
 *     const url = await sdk.getInitialURL();
 *
 *     if (url === null) {
 *       return null;
 *     }
 *
 *     return { input: { url } };
 *   },
 *   dispose: () => subscription.remove(),
 * };
 * ```
 */
export type SourceAttachment<TInput> = {
  /** The launch snapshot, as an observation that may claim deferral or an occurrence: `null` for an empty launch; a throw is a failed read. */
  initial?:
    | (() =>
        | SourceObservation<TInput>
        | null
        | Promise<SourceObservation<TInput> | null>)
    | undefined;
  dispose?: (() => void | Promise<void>) | undefined;
};

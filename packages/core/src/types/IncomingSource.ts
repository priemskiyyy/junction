import type { SourceAttachment } from "src/types/SourceAttachment";
import type { SourceSink } from "src/types/SourceSink";

/**
 * One provider's entry points translated onto Junction: a plain object over
 * the SDK the application set up. `attach` installs the listener
 * synchronously and never initializes the SDK.
 *
 * @example
 * ```ts
 * const links: IncomingSource<{ url: string }, typeof Linking> = {
 *   name: "react-native-linking",
 *   native: Linking,
 *   resource: "linking",
 *   attach: (sink) => {
 *     const subscription = Linking.addEventListener("url", ({ url }) => sink.push({ input: { url } }));
 *
 *     return {
 *       initial: async () => {
 *         const url = await Linking.getInitialURL();
 *
 *         if (url === null) {
 *           return null;
 *         }
 *
 *         return { input: { url } };
 *       },
 *       dispose: () => subscription.remove(),
 *     };
 *   },
 * };
 * ```
 */
export type IncomingSource<TInput, TNative> = {
  name: string;
  native: TNative;
  /** The exclusive native feed it listens to, such as `"linking"`; two sources of one Junction may not share one. */
  resource: string | null;
  attach: (sink: SourceSink<TInput>) => SourceAttachment<TInput>;
};

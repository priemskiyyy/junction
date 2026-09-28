import type { PropsWithChildren } from "react";

import { JunctionContext } from "src/context/JunctionContext";
import type { RegisteredJunction } from "src/types/Register";

/**
 * The props of `JunctionProvider`: the Junction it publishes and the tree
 * that reads it.
 *
 * @example
 * ```tsx
 * const props: JunctionProviderProps = { junction, children: <Application /> };
 * ```
 */
export type JunctionProviderProps = PropsWithChildren<{
  junction: RegisteredJunction;
}>;

/**
 * Publishes one Junction to the tree below and does nothing else: whoever
 * constructed it starts and disposes it, so mounting attaches no source and
 * unmounting disposes nothing. Augment `Register` first, or TypeScript refuses
 * a Junction typed by its own intents.
 *
 * @example
 * ```tsx
 * export const junction = new Junction({ intents, sources: { links: linking({ sdk: Linking }) }, routes });
 *
 * declare module "@priemskiyyy/junction-react" {
 *   interface Register {
 *     junction: typeof junction;
 *   }
 * }
 *
 * junction.start();
 *
 * <JunctionProvider junction={junction}>
 *   <Application />
 * </JunctionProvider>
 * ```
 */
export const JunctionProvider = ({
  junction,
  children,
}: JunctionProviderProps) => (
  <JunctionContext.Provider value={junction}>
    {children}
  </JunctionContext.Provider>
);

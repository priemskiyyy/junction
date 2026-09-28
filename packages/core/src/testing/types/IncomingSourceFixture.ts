import type { IncomingSource } from "src/types/IncomingSource";

/**
 * One fresh source over a fake of its provider, and the controls that make
 * the fake behave like the provider: a user opening a link, a launch, a
 * result the source must not push.
 *
 * @example
 * ```ts
 * const createFixture = (): IncomingSourceFixture<{ url: string }, FakeLinking> => {
 *   const sdk = createFakeLinking();
 *
 *   return { source: linking({ sdk }), native: sdk, open: () => sdk.emitUrl("myapp://open"), listeners: () => sdk.listenerCount() };
 * };
 * ```
 */
export type IncomingSourceFixture<TInput, TNative> = {
  source: IncomingSource<TInput, TNative>;
  native: TNative;
  /** Makes the provider deliver one actionable entry point while the source is attached. */
  open: () => void | Promise<void>;
  /** Makes the provider report a launch entry point before the source attaches; left out when it has none. */
  launch?: () => void | Promise<void>;
  /** Makes the provider deliver a result the source must not push: an error, a no-match, a progress callback. */
  miss?: () => void | Promise<void>;
  /** How many listeners the source has installed on the provider. */
  listeners: () => number;
  /** `false` for a provider that offers no way to remove a listener: the suite then checks only that a callback after dispose is harmless. */
  detaches?: boolean;
};

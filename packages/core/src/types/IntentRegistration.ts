import type { ConsumerOptions } from "src/types/ConsumerOptions";
import type { IntentHandler } from "src/types/IntentHandler";

/**
 * One consumer of one intent. `update` takes what `subscribe` took and
 * replaces the handler and every option at once, so an option it leaves out
 * returns to its default, and `dispose` ends it. When what `match` or `ready`
 * reads changes, `junction.refresh()` evaluates them again.
 *
 * @example
 * ```ts
 * const registration = junction.subscribe("openDocument", handleOpenDocument, { ready: false });
 *
 * registration.update(handleOpenDocument, { ready: true });
 * registration.dispose();
 * ```
 */
export type IntentRegistration<TPayload, TExecution> = {
  id: string;
  update: (
    handler: IntentHandler<TPayload, TExecution>,
    options?: ConsumerOptions<TPayload>,
  ) => void;
  dispose: () => void;
};

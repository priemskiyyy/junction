import type { ConsumerOptions } from "src/types/ConsumerOptions";
import type { Registration } from "src/types/internal/Registration";
import { resolveDuration } from "src/utils/internal/options/resolveDuration";

const alwaysMatch = () => true;

export const getRegistrationOptions = <TPayload, TExecution>(
  handler: (payload: TPayload, execution: TExecution) => unknown,
  options: ConsumerOptions<TPayload>,
  timeout: number,
): Registration["options"] => ({
  name: options.name ?? null,
  handler,
  match: options.match ?? alwaysMatch,
  ready: options.ready ?? true,
  fallback: options.fallback ?? false,
  scope: options.scope ?? null,
  timeout: resolveDuration("timeout", options.timeout, { fallback: timeout }),
});

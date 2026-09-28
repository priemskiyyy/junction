export type RouteCandidate<TInput> = TInput extends object
  ? { [TKey in keyof TInput]: unknown }
  : unknown;

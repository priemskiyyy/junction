export type SynchronousEffect<TEffect extends () => unknown> = TEffect &
  (Extract<ReturnType<TEffect>, PromiseLike<unknown>> extends never
    ? unknown
    : never);

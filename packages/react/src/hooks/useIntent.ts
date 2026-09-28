import type { ConsumerOptions, IntentHandler } from "@priemskiyyy/junction";
import { useEffectEvent, useLayoutEffect } from "react";

import { useJunction } from "src/hooks/useJunction";
import type {
  RegisteredExecution,
  RegisteredIntentName,
  RegisteredPayload,
} from "src/types/Register";

/**
 * Consumes one intent while the component is mounted. The handler, `match`
 * and `ready` are read from the latest commit whenever Junction needs them,
 * so an inline handler needs no `useCallback` and a render React abandons
 * never runs. `scope`, `fallback`, `timeout` and `name` identify the
 * consumer: changing one registers it anew, which interrupts its running
 * attempt, as a new `key` would. Nothing runs during render or on the server,
 * and unmounting interrupts a running attempt.
 *
 * @example
 * ```tsx
 * useIntent(
 *   "openDocument",
 *   async ({ documentId }, { account, signal, reject, commit }) => {
 *     const access = await api.checkAccess({ documentId, account: account.id, signal });
 *
 *     if (!access.allowed) {
 *       return reject("not-authorized");
 *     }
 *
 *     return commit(() => navigation.navigate("Document", { documentId }));
 *   },
 *   { match: ({ workspaceId }) => workspaceId === currentWorkspaceId, ready: navigationReady },
 * );
 * ```
 */
export const useIntent = <TName extends RegisteredIntentName>(
  name: TName,
  handler: IntentHandler<RegisteredPayload<TName>, RegisteredExecution<TName>>,
  options: ConsumerOptions<RegisteredPayload<TName>> = {},
): void => {
  const junction = useJunction();

  const {
    match,
    ready = true,
    scope,
    fallback = false,
    timeout,
    name: label,
  } = options;

  const handleIntent = useEffectEvent(handler);

  const matchIntent = useEffectEvent(
    (payload: RegisteredPayload<TName>) =>
      match === undefined || match(payload),
  );

  const isReady = useEffectEvent(() => {
    if (typeof ready === "function") {
      return ready();
    }

    return ready;
  });

  useLayoutEffect(() => {
    const registration = junction.subscribe(
      name,
      (payload, execution) => handleIntent(payload, execution),
      {
        match: (payload) => matchIntent(payload),
        ready: () => isReady(),
        fallback,
        scope,
        timeout,
        name: label,
      },
    );

    return registration.dispose;
  }, [junction, name, scope, fallback, timeout, label]);

  // What match and ready read may have changed with this commit.
  useLayoutEffect(() => {
    junction.refresh();
  });
};

import { useObservableValue } from "src/hooks/internal/useObservableValue";
import { useJunction } from "src/hooks/useJunction";
import type { RegisteredInboxEntry } from "src/types/Register";

// Interned so the server snapshot is one reference per render.
const EMPTY_INBOX: RegisteredInboxEntry[] = [];

Object.freeze(EMPTY_INBOX);

const getServerInbox = () => EMPTY_INBOX;

const selectInbox = (inbox: RegisteredInboxEntry[]) => inbox;

/**
 * Observes the inbox, or one selection of it: the component renders again
 * only when the selection changes by `Object.is`. It only observes, so it
 * claims and runs nothing, and it reads an empty inbox on the server and
 * during hydration.
 *
 * @example
 * ```tsx
 * const failed = useInbox((inbox) => inbox.filter(({ state }) => state === "failed").length);
 *
 * if (failed === 0) {
 *   return null;
 * }
 *
 * return <RetryBanner count={failed} />;
 * ```
 */
export function useInbox(): RegisteredInboxEntry[];

export function useInbox<TSelection>(
  selector: (inbox: RegisteredInboxEntry[]) => TSelection,
): TSelection;

// An overload pair resolves the return type from whether a selector is given, as Anchor's useSession does.
export function useInbox(
  selector?: (inbox: RegisteredInboxEntry[]) => unknown,
): unknown {
  const junction = useJunction();

  return useObservableValue(
    junction.inbox,
    getServerInbox,
    selector ?? selectInbox,
  );
}

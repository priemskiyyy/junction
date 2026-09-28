/**
 * Who is signed in, as the application's identity store says: still
 * restoring, nobody, or one account. Every change of status or account
 * interrupts the running attempt, and a sign-out followed by a sign-in passes
 * through `anonymous`, so it does too.
 *
 * @example
 * ```ts
 * const identity: ObservableValue<JunctionIdentity> = {
 *   get: () => {
 *     if (user === null) {
 *       return { status: "anonymous" };
 *     }
 *
 *     return { status: "authenticated", account: { id: user.id } };
 *   },
 *   subscribe: store.subscribe,
 * };
 * ```
 */
export type JunctionIdentity =
  | { status: "restoring" }
  | { status: "anonymous" }
  | { status: "authenticated"; account: { id: string } };

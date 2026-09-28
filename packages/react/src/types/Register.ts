import type {
  InboxEntryOf,
  IntentExecutionOf,
  IntentPayload,
  Intents,
  Junction,
  Sources,
} from "@priemskiyyy/junction";

/**
 * Declaration-merging target that types every export of this package with the
 * application's Junction. Augment it once, next to the Junction:
 *
 * @example
 * ```ts
 * declare module "@priemskiyyy/junction-react" {
 *   interface Register {
 *     junction: typeof junction;
 *   }
 * }
 * ```
 */
export interface Register {}

type Registration = Register extends {
  junction: Junction<
    infer TIntents extends Intents,
    infer TSources extends Sources
  >;
}
  ? { intents: TIntents; sources: TSources }
  : { intents: Intents; sources: Sources };

type RegisteredIntents = Registration["intents"];

/**
 * The names of the registered Junction's intents, or any string when nothing
 * is registered.
 *
 * @example
 * ```ts
 * const name: RegisteredIntentName = "openDocument";
 * ```
 */
export type RegisteredIntentName = keyof RegisteredIntents & string;

/**
 * The names of the registered Junction's sources, or any string when nothing
 * is registered.
 *
 * @example
 * ```ts
 * const name: RegisteredSourceName = "links";
 * ```
 */
export type RegisteredSourceName = keyof Registration["sources"] & string;

/**
 * The payload one registered intent's consumers receive.
 *
 * @example
 * ```ts
 * type OpenDocument = RegisteredPayload<"openDocument">;
 * ```
 */
export type RegisteredPayload<TName extends RegisteredIntentName> =
  IntentPayload<RegisteredIntents[TName]>;

/**
 * The execution one registered intent's handlers receive, with its account
 * narrowed for an account-bound intent.
 *
 * @example
 * ```ts
 * type OpenDocumentExecution = RegisteredExecution<"openDocument">;
 * ```
 */
export type RegisteredExecution<TName extends RegisteredIntentName> =
  IntentExecutionOf<RegisteredIntents, TName>;

/**
 * One entry of the registered Junction's inbox, a union discriminated by
 * `name`.
 *
 * @example
 * ```ts
 * const entry: RegisteredInboxEntry | undefined = useInbox()[0];
 * ```
 */
export type RegisteredInboxEntry = InboxEntryOf<RegisteredIntents>;

/**
 * The registered Junction. Unregistered, it is the untyped Junction, which a
 * Junction typed by its own intents cannot be assigned to, so registration
 * cannot be forgotten.
 *
 * @example
 * ```ts
 * const junction: RegisteredJunction = useJunction();
 * ```
 */
export type RegisteredJunction = Junction<
  RegisteredIntents,
  Registration["sources"]
>;

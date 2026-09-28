// Inlined rather than depended on, even as types: the core ships zero dependencies.
type StandardSchemaResult<TOutput> =
  | { value: TOutput; issues?: undefined }
  | {
      issues: Iterable<{
        message: string;
        path?: Iterable<PropertyKey | { key: PropertyKey }> | undefined;
      }>;
    };

/**
 * The part of the Standard Schema v1 contract Junction reads: a validator that
 * answers with the value or with issues, which Zod, Valibot and ArkType
 * implement. It must answer synchronously, because admission is synchronous.
 *
 * @example
 * ```ts
 * const intents = { showAnnouncement: intent(z.object({ announcementId: z.string() })) };
 * ```
 */
export type StandardSchema<TInput = unknown, TOutput = TInput> = {
  "~standard": {
    version: 1;
    vendor: string;
    /** Input is what a route or a dispatch passes; output is what consumers receive. */
    types?: { input: TInput; output: TOutput } | undefined;
    validate: (
      value: unknown,
    ) => StandardSchemaResult<TOutput> | Promise<StandardSchemaResult<TOutput>>;
  };
};

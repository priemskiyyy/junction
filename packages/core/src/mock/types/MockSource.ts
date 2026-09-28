import type { MockAttachment } from "src/mock/types/MockAttachment";
import type { Admission } from "src/types/Admission";
import type { IncomingSource } from "src/types/IncomingSource";
import type { SourceObservation } from "src/types/SourceObservation";

/**
 * A mock source and its controls: emit observations, fail the provider,
 * settle a held launch read, and read what was attached and disposed. It
 * never deduplicates what it emits.
 *
 * @example
 * ```ts
 * const { source, control } = createMockSource<{ url: string }>();
 *
 * await control.emit({ input: { url: "https://app.example.com/documents/42" } });
 * ```
 */
export type MockSource<TInput, TNative> = {
  source: IncomingSource<TInput, TNative>;
  control: {
    /** Pushes through the latest attachment's sink, attached or not. */
    emit: (observation: SourceObservation<TInput>) => Promise<Admission>;
    fail: (error: unknown) => void;
    initial: {
      settle: (observation: SourceObservation<TInput> | null) => void;
      fail: (error: unknown) => void;
    };
    attachments: MockAttachment<TInput>[];
    /** How many attachments are installed and not disposed. */
    listeners: () => number;
  };
};

import type { SourceSink } from "src/types/SourceSink";

/**
 * One `attach` call a mock source received: the sink it was given, which a
 * test may call even after disposal, and how often it was disposed.
 *
 * @example
 * ```ts
 * await control.attachments[0]?.sink.push({ input: { url } });
 * ```
 */
export type MockAttachment<TInput> = {
  sink: SourceSink<TInput>;
  disposals: number;
};

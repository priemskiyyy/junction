import type { MockAttachment } from "src/mock/types/MockAttachment";
import type { MockSource } from "src/mock/types/MockSource";
import type { MockSourceOptions } from "src/mock/types/MockSourceOptions";
import type { SourceAttachment } from "src/types/SourceAttachment";
import type { SourceObservation } from "src/types/SourceObservation";
import { createDeferred } from "src/utils/common/createDeferred";

/**
 * A source for tests that emits what the test says, when it says it. It is a
 * correct source by default and can misbehave on purpose: push while
 * attaching, throw on attach, hold or fail its launch read, fail its cleanup.
 *
 * @example
 * ```ts
 * const { source, control } = createMockSource<{ url: string }>({ initial: "hold" });
 * const junction = new Junction({ intents, sources: { links: source }, routes });
 *
 * junction.start();
 * control.initial.settle({ input: { url: "https://app.example.com/documents/42" } });
 * ```
 */
export const createMockSource = <TInput, TNative = null>(
  options: MockSourceOptions<TInput, TNative> = {},
): MockSource<TInput, TNative | null> => {
  const attachments: MockAttachment<TInput>[] = [];
  const read = createDeferred<SourceObservation<TInput> | null>();

  const getLatest = () => {
    const latest = attachments.at(-1);

    if (latest === undefined) {
      throw new Error("The mock source was never attached.");
    }

    return latest;
  };

  return {
    source: {
      name: options.name ?? "mock",
      native: options.native ?? null,
      resource: options.resource ?? null,
      attach: (sink) => {
        const attachment: MockAttachment<TInput> = { sink, disposals: 0 };

        attachments.push(attachment);
        options.onAttach?.(sink);

        const { initial } = options;

        const answer: SourceAttachment<TInput> = {
          dispose: () => {
            attachment.disposals += 1;

            return options.onDispose?.();
          },
        };

        if (initial === undefined) {
          return answer;
        }

        return {
          ...answer,
          initial: () => {
            if (initial === "hold") {
              return read.promise;
            }

            return initial;
          },
        };
      },
    },
    control: {
      emit: (observation) => getLatest().sink.push(observation),
      fail: (error) => getLatest().sink.fail(error),
      initial: { settle: read.resolve, fail: read.reject },
      attachments,
      listeners: () =>
        attachments.filter(({ disposals }) => disposals === 0).length,
    },
  };
};

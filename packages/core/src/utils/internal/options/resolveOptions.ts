import type { InboxStorage } from "src/types/InboxStorage";
import type { IncomingSource } from "src/types/IncomingSource";
import type { IntentDefinition } from "src/types/IntentDefinition";
import {
  DEFAULT_EXECUTION_TIMEOUT,
  DEFAULT_INITIAL_TIMEOUT,
  DEFAULT_STORAGE_TIMEOUT,
} from "src/utils/constants/defaults";
import { resolveDuration } from "src/utils/internal/options/resolveDuration";
import { JunctionError } from "src/utils/JunctionError";

export const resolveOptions = ({
  intents,
  sources = {},
  timeout = {},
  storage,
}: {
  intents: Record<string, IntentDefinition<never, unknown, boolean>>;
  sources?: Record<string, IncomingSource<unknown, unknown>> | undefined;
  timeout?:
    | {
        initial?: number | undefined;
        execution?: number | undefined;
        storage?: number | undefined;
      }
    | undefined;
  storage?: InboxStorage | undefined;
}) => {
  for (const [name, definition] of Object.entries(intents)) {
    if (definition.persistent && storage === undefined) {
      throw new JunctionError({
        code: "INVALID_CONFIGURATION",
        message: `intents.${name} persists, so the Junction needs storage.`,
      });
    }
  }

  const resources = new Map<string, string>();

  for (const [name, { resource }] of Object.entries(sources)) {
    const owner = resource === null ? undefined : resources.get(resource);

    if (owner !== undefined) {
      throw new JunctionError({
        code: "INVALID_CONFIGURATION",
        message: `sources.${name} and sources.${owner} both listen to "${resource}"; one native feed has one owner.`,
      });
    }

    if (resource !== null) {
      resources.set(resource, name);
    }
  }

  return {
    definitions: new Map<string, IntentDefinition<unknown, unknown, boolean>>(
      Object.entries(intents),
    ),
    sources: new Map(Object.entries(sources)),
    timeout: {
      initial: resolveDuration("timeout.initial", timeout.initial, {
        fallback: DEFAULT_INITIAL_TIMEOUT,
      }),
      execution: resolveDuration("timeout.execution", timeout.execution, {
        fallback: DEFAULT_EXECUTION_TIMEOUT,
      }),
      storage: resolveDuration("timeout.storage", timeout.storage, {
        fallback: DEFAULT_STORAGE_TIMEOUT,
      }),
    },
  };
};

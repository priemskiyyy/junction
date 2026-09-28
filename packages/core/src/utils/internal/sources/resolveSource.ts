import type { SourceHandle } from "src/types/SourceHandle";
import type { SourceNative } from "src/types/SourceNative";
import { JunctionError } from "src/utils/JunctionError";

// The overload restores the name-to-native relation that a lookup by name erases, as Trace's resolveDestination does.
export function resolveSource<TSources, TName extends keyof TSources & string>(
  handles: Map<string, SourceHandle<unknown>>,
  name: TName,
): SourceHandle<SourceNative<TSources[TName]>>;

export function resolveSource(
  handles: Map<string, SourceHandle<unknown>>,
  name: string,
): SourceHandle<unknown> {
  const handle = handles.get(name);

  if (handle === undefined) {
    const known = Array.from(handles.keys(), (key) => JSON.stringify(key));

    throw new JunctionError({
      code: "INVALID_CONFIGURATION",
      message: `The Junction has no source named ${JSON.stringify(name)}. ${
        known.length === 0
          ? "It was constructed with no sources."
          : `Its sources are ${known.join(", ")}.`
      }`,
    });
  }

  return handle;
}

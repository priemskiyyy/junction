import type { Issue } from "src/types/Issue";
import type { JsonValue } from "src/types/JsonValue";
import { isPlainObject } from "src/utils/common/isPlainObject";
import { MAX_DEPTH } from "src/utils/constants/limits";
import { getUtf8Size } from "src/utils/internal/payload/getUtf8Size";

type Walk = { used: number; limit: number };

type Copy =
  | { kind: "COPIED"; value: JsonValue; text: string }
  | { kind: "REFUSED"; issue: Issue };

const refuse = (path: string[], message: string): Copy => ({
  kind: "REFUSED",
  issue: { path: path.join("."), message },
});

// Every UTF-16 unit is at least one UTF-8 byte, so counting units can only refuse what is too large anyway.
const spend = (walk: Walk, path: string[], units: number) => {
  walk.used += units;

  if (walk.used <= walk.limit) {
    return null;
  }

  return refuse(path, `The value is larger than ${walk.limit} bytes.`);
};

const copyArray = (
  value: unknown[],
  path: string[],
  depth: number,
  walk: Walk,
): Copy => {
  const items: JsonValue[] = [];
  const texts: string[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const itemPath = [...path, String(index)];
    const separator = spend(walk, itemPath, index === 0 ? 2 : 1);

    if (separator !== null) {
      return separator;
    }

    const item = copyValue(value[index], itemPath, depth + 1, walk);

    if (item.kind === "REFUSED") {
      return item;
    }

    items.push(item.value);
    texts.push(item.text);
  }

  Object.freeze(items);

  return { kind: "COPIED", value: items, text: `[${texts.join(",")}]` };
};

const copyObject = (
  value: Record<string, unknown>,
  path: string[],
  depth: number,
  walk: Walk,
): Copy => {
  const entries: [string, JsonValue][] = [];
  const texts: [string, string][] = [];

  for (const [key, nested] of Object.entries(value)) {
    if (nested === undefined) {
      continue;
    }

    const name = JSON.stringify(key);
    const entryPath = [...path, key];

    const label = spend(
      walk,
      entryPath,
      name.length + (entries.length === 0 ? 3 : 2),
    );

    if (label !== null) {
      return label;
    }

    const entry = copyValue(nested, entryPath, depth + 1, walk);

    if (entry.kind === "REFUSED") {
      return entry;
    }

    entries.push([key, entry.value]);
    texts.push([name, entry.text]);
  }

  const text = texts
    // Own keys are unique, so no two compare equal.
    .sort(([left], [right]) => {
      if (left < right) {
        return -1;
      }

      return 1;
    })
    .map(([name, entry]) => `${name}:${entry}`)
    .join(",");

  const copy = Object.fromEntries(entries);

  Object.freeze(copy);

  return { kind: "COPIED", value: copy, text: `{${text}}` };
};

const copyValue = (
  value: unknown,
  path: string[],
  depth: number,
  walk: Walk,
): Copy => {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    const text = JSON.stringify(value);

    // JSON has no negative zero.
    const copied = value === 0 ? 0 : value;

    return (
      spend(walk, path, text.length) ?? { kind: "COPIED", value: copied, text }
    );
  }

  if (!Array.isArray(value) && !isPlainObject(value)) {
    return refuse(path, "Only JSON values can be kept.");
  }

  // A cycle nests without end, so the depth bound refuses it too.
  if (depth >= MAX_DEPTH) {
    return refuse(path, `The value nests deeper than ${MAX_DEPTH}.`);
  }

  if (Array.isArray(value)) {
    return copyArray(value, path, depth, walk);
  }

  return copyObject(value, path, depth, walk);
};

export const getCanonicalValue = (
  value: unknown,
  limit: number,
):
  | { status: "valid"; value: JsonValue; text: string; size: number }
  | { status: "invalid"; issues: Issue[] } => {
  try {
    const copy = copyValue(value, [], 0, { used: 0, limit });

    if (copy.kind === "REFUSED") {
      return { status: "invalid", issues: [copy.issue] };
    }

    const size = getUtf8Size(copy.text);

    if (size > limit) {
      return {
        status: "invalid",
        issues: [
          {
            path: "",
            message: `The value is larger than ${limit} bytes.`,
          },
        ],
      };
    }

    return { status: "valid", value: copy.value, text: copy.text, size };
  } catch {
    // A getter or a proxy trap can throw from any read.
    return {
      status: "invalid",
      issues: [{ path: "", message: "The value could not be read." }],
    };
  }
};

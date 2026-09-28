import type { ParsedUrl } from "src/types/internal/ParsedUrl";
import type { UrlPattern } from "src/types/internal/UrlPattern";

export const matchPattern = (pattern: UrlPattern, url: ParsedUrl) => {
  if (
    pattern.scheme !== url.scheme ||
    pattern.host !== url.host ||
    pattern.port !== url.port ||
    pattern.segments.length !== url.segments.length
  ) {
    return null;
  }

  const params: [string, string][] = [];

  for (const [index, segment] of pattern.segments.entries()) {
    const value = url.segments[index];

    if (value === undefined) {
      return null;
    }

    if (segment.kind === "LITERAL") {
      if (segment.value !== value) {
        return null;
      }

      continue;
    }

    if (value === "") {
      return null;
    }

    params.push([segment.name, value]);
  }

  return Object.freeze(Object.fromEntries(params));
};

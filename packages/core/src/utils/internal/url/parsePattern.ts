import type { UrlPattern } from "src/types/internal/UrlPattern";
import { getOrigin } from "src/utils/internal/url/getOrigin";
import { parseUrl } from "src/utils/internal/url/parseUrl";
import { JunctionError } from "src/utils/JunctionError";

const PARAMETER = /^:([A-Za-z_][A-Za-z0-9_]*)$/;

const createInvalid = (route: string, message: string) =>
  new JunctionError({
    code: "INVALID_CONFIGURATION",
    message: `routes.${route}: ${message}`,
  });

export const parsePattern = (route: string, pattern: string): UrlPattern => {
  if (/[?#]/.test(pattern)) {
    throw createInvalid(route, "a URL pattern has no query or fragment.");
  }

  const parsed = parseUrl(pattern);

  if (parsed.kind === "REFUSED") {
    throw createInvalid(route, parsed.message);
  }

  const { scheme, host, port, segments } = parsed.url;
  const names = new Set<string>();

  return Object.freeze({
    origin: getOrigin({ scheme, host, port }),
    scheme,
    host,
    port,
    segments: segments.map((segment, index) => {
      // A trailing slash is a different path, so a final empty segment is a literal a URL can match.
      if (segment === "" && index < segments.length - 1) {
        throw createInvalid(route, "a URL pattern has no empty path segment.");
      }

      const name = PARAMETER.exec(segment)?.[1];

      if (name === undefined) {
        if (segment.includes(":")) {
          throw createInvalid(
            route,
            `"${segment}" is not a parameter: a parameter is a whole segment such as ":documentId".`,
          );
        }

        return Object.freeze({ kind: "LITERAL", value: segment });
      }

      if (names.has(name)) {
        throw createInvalid(route, `the parameter ":${name}" repeats.`);
      }

      names.add(name);

      return Object.freeze({ kind: "PARAMETER", name });
    }),
  });
};

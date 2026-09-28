import type { ParsedUrl } from "src/types/internal/ParsedUrl";
import { URL_LENGTH } from "src/utils/constants/limits";
import { HOST, URL_PREFIX } from "src/utils/constants/url";
import { decodeComponent } from "src/utils/internal/url/decodeComponent";
import { hasCharacter } from "src/utils/internal/url/hasCharacter";
import { isSeparatorCharacter } from "src/utils/internal/url/isSeparatorCharacter";
import { isUnroutableCharacter } from "src/utils/internal/url/isUnroutableCharacter";

type Refusal = { kind: "REFUSED"; message: string };

const refuse = (message: string): Refusal => ({ kind: "REFUSED", message });

const parseAuthority = (
  scheme: string,
  authority: string,
): { kind: "LOCATED"; host: string; port: number | null } | Refusal => {
  if (authority.includes("@")) {
    return refuse("The URL carries credentials before its host.");
  }

  const separator = authority.lastIndexOf(":");
  const raw = separator === -1 ? authority : authority.slice(0, separator);

  // Checked before lowercasing, which turns the Kelvin sign into an ASCII k.
  if (!HOST.test(raw)) {
    return refuse("The URL's host holds characters a host cannot.");
  }

  const host = raw.toLowerCase();

  if (separator === -1) {
    return { kind: "LOCATED", host, port: null };
  }

  const digits = authority.slice(separator + 1);
  const port = Number(digits);

  if (!/^\d{1,5}$/.test(digits) || port < 1 || port > 65_535) {
    return refuse("The URL's port is not a port number.");
  }

  // An explicit default port is the same origin as none.
  if (
    (scheme === "https" && port === 443) ||
    (scheme === "http" && port === 80)
  ) {
    return { kind: "LOCATED", host, port: null };
  }

  return { kind: "LOCATED", host, port };
};

const parseSegments = (
  path: string,
): { kind: "SPLIT"; segments: string[] } | Refusal => {
  // The root is the same path with or without its slash.
  if (path === "" || path === "/") {
    return { kind: "SPLIT", segments: [] };
  }

  const segments: string[] = [];

  for (const raw of path.slice(1).split("/")) {
    const segment = decodeComponent(raw);

    if (segment === null) {
      return refuse("The URL's path holds an invalid percent-encoding.");
    }

    if (segment === "." || segment === "..") {
      return refuse("The URL's path holds a dot segment.");
    }

    if (hasCharacter(segment, isSeparatorCharacter)) {
      return refuse(
        "The URL's path encodes a separator or a control character.",
      );
    }

    segments.push(segment);
  }

  return { kind: "SPLIT", segments };
};

const parseQuery = (
  query: string,
): { kind: "SPLIT"; pairs: [string, string][] } | Refusal => {
  const pairs: [string, string][] = [];

  for (const part of query.split("&")) {
    if (part === "") {
      continue;
    }

    const separator = part.indexOf("=");
    const rawKey = separator === -1 ? part : part.slice(0, separator);
    const rawValue = separator === -1 ? "" : part.slice(separator + 1);

    // A query is form-encoded: `+` is a space.
    const key = decodeComponent(rawKey.replaceAll("+", " "));
    const value = decodeComponent(rawValue.replaceAll("+", " "));

    if (key === null || value === null) {
      return refuse("The URL's query holds an invalid percent-encoding.");
    }

    pairs.push([key, value]);
  }

  return { kind: "SPLIT", pairs };
};

export const parseUrl = (
  raw: string,
): { kind: "PARSED"; url: ParsedUrl } | Refusal => {
  if (raw.length > URL_LENGTH) {
    return refuse(`The URL is longer than ${URL_LENGTH} characters.`);
  }

  if (hasCharacter(raw, isUnroutableCharacter)) {
    return refuse("The URL holds a space, a control character or a backslash.");
  }

  const prefix = URL_PREFIX.exec(raw);
  const scheme = prefix?.[1]?.toLowerCase();

  if (prefix === null || scheme === undefined) {
    return refuse("The URL has no scheme followed by //.");
  }

  const rest = raw.slice(prefix[0].length);
  const authorityEnd = rest.search(/[/?#]/);
  const authority = authorityEnd === -1 ? rest : rest.slice(0, authorityEnd);
  const location = parseAuthority(scheme, authority);

  if (location.kind === "REFUSED") {
    return location;
  }

  // The fragment is never routed.
  const [target = ""] = (
    authorityEnd === -1 ? "" : rest.slice(authorityEnd)
  ).split("#");

  const queryStart = target.indexOf("?");
  const path = queryStart === -1 ? target : target.slice(0, queryStart);
  const segments = parseSegments(path);

  if (segments.kind === "REFUSED") {
    return segments;
  }

  const query = parseQuery(
    queryStart === -1 ? "" : target.slice(queryStart + 1),
  );

  if (query.kind === "REFUSED") {
    return query;
  }

  return {
    kind: "PARSED",
    url: {
      scheme,
      host: location.host,
      port: location.port,
      segments: segments.segments,
      query: query.pairs,
    },
  };
};

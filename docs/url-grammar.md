---
description: "Junction parses URLs with its own strict grammar, the same on Hermes, JavaScriptCore and browsers: what a pattern may say, how a URL is normalized, and what refuses it."
---

# The URL grammar

Junction parses URLs itself instead of using the platform's `URL`, which differs between React Native, Hermes and browsers and silently normalizes what an attacker controls. The grammar is small and strict, and a pattern follows the same rules as the URLs it matches.

## Shape

A URL is `scheme://authority path ?query #fragment`:

1. The scheme is compared case-insensitively. A URL without `//` after its scheme is refused.
2. The authority is `host` or `host:port`. The host is lowercased and may hold only letters, digits, `.`, `-` and `_`. User information (`user:secret@host`) refuses the URL, since it is how a link disguises where it goes.
3. An explicit default port (`:443` for `https`, `:80` for `http`) equals no port. Any other port must be the pattern's.
4. The path is split on `/`. Each segment is percent-decoded once, strictly.
5. The query is split on `&`, each pair at its first `=`, with `+` read as a space, then decoded as the path is. Keys may repeat, in order.
6. The fragment is never routed.

Custom schemes are written as they arrive: `myapp://documents/:id` (host `documents`) and `myapp:///documents/:id` (no host) are different patterns, and you declare the one your links use.

## What refuses a URL

| The URL holds                                                  | Refused as                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| more than 8 192 characters                                     | too long, before any parsing                                 |
| a space, a control character or a backslash                    | unroutable, before any parsing                               |
| no `scheme://`                                                 | no scheme                                                    |
| `@` in its authority                                           | credentials before its host                                  |
| a host character outside letters, digits, `.`, `-`, `_`        | an invalid host                                              |
| a port that is not 1 to 65 535                                 | an invalid port                                              |
| an invalid percent-escape or malformed UTF-8                   | an invalid encoding                                          |
| a segment that decodes to `.` or `..`                          | a dot segment, so `%2e%2e` cannot climb a path               |
| a segment that decodes to hold `/`, `\` or a control character | an encoded separator, so `%2F` cannot create another segment |

A refused URL is `rejected` with `invalid-url` when its source has URL routes, and the issue names the rule it broke.

## Matching

- Literal segments compare case-sensitively, after decoding.
- A `:name` segment captures one nonempty segment. A parameter is always a whole segment: `doc-:id` is misconfiguration.
- The number of segments must be equal, so a trailing slash is a different path: `/documents/42/` matches `/documents/:id/`, never `/documents/:id`.
- The root path is the same with or without its slash.

## Patterns

A pattern is parsed when the Junction is constructed, and anything the grammar refuses throws `INVALID_CONFIGURATION` naming the route: a query or a fragment in a pattern, an empty segment other than a trailing slash, a parameter that repeats, or a parameter that is not a whole segment.

```ts
import { intent, Junction } from "@priemskiyyy/junction";
import { linking } from "@priemskiyyy/junction-react-native";
import { Linking } from "react-native";
import { z } from "zod";

export const app = new Junction({
  intents: { openComment: intent(z.object({ commentId: z.string() })) },
  sources: { links: linking({ sdk: Linking }) },
  routes: ({ from }) => ({
    comment: from.links.url({
      url: "myapp://comments/:commentId",
      intent: "openComment",
      payload: ({ params, query }) => ({
        commentId: params.commentId,
        highlight: query.single("highlight"),
      }),
    }),
  }),
});
```

A strict schema refuses the `highlight` key above at runtime, since TypeScript checks no excess keys in a generic call: declare it in the schema when a route passes it.

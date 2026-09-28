import type { IntentDefinition } from "src/types/IntentDefinition";
import type { Resolution } from "src/types/internal/Resolution";
import type { UrlPattern } from "src/types/internal/UrlPattern";
import type { Route } from "src/types/Route";
import { isPlainObject } from "src/utils/common/isPlainObject";
import { INPUT_SIZE } from "src/utils/constants/limits";
import { getCanonicalValue } from "src/utils/internal/payload/getCanonicalValue";
import { prepareIntent } from "src/utils/internal/routes/prepareIntent";
import { createQueryReader } from "src/utils/internal/url/createQueryReader";
import { getOrigin } from "src/utils/internal/url/getOrigin";
import { matchPattern } from "src/utils/internal/url/matchPattern";
import { parsePattern } from "src/utils/internal/url/parsePattern";
import { parseUrl } from "src/utils/internal/url/parseUrl";
import { JunctionError } from "src/utils/JunctionError";

type Definition = IntentDefinition<unknown, unknown, boolean>;

type CompiledRoute =
  | {
      kind: "URL";
      id: string;
      intent: string;
      definition: Definition;
      pattern: UrlPattern;
      route: Extract<Route, { kind: "url" }>;
    }
  | {
      kind: "EVENT";
      id: string;
      intent: string;
      definition: Definition;
      route: Extract<Route, { kind: "event" }>;
    };

type Candidate =
  | { kind: "CANDIDATE"; route: CompiledRoute; payload: () => unknown }
  | { kind: "FAILED"; message: string };

const getThrownMessage = (error: unknown, fallback: string) => {
  if (error instanceof JunctionError) {
    return error.message;
  }

  return fallback;
};

const reject = (
  reason: Extract<Resolution, { kind: "REJECTED" }>["reason"],
  message: string,
): Resolution => ({
  kind: "REJECTED",
  reason,
  issues: [{ path: "", message }],
});

export class RouteTable {
  #routes = new Map<string, CompiledRoute[]>();
  #owners = new Map<string, string>();

  constructor({
    definitions,
    routes,
  }: {
    definitions: Map<string, Definition>;
    routes: Record<string, Route>;
  }) {
    for (const [id, route] of Object.entries(routes)) {
      const definition = definitions.get(route.intent.name);

      if (definition === undefined) {
        throw new JunctionError({
          code: "INVALID_CONFIGURATION",
          message: `routes.${id} names the intent "${route.intent.name}", which is not declared.`,
        });
      }

      const compiled = this.#compile(id, route, definition);
      const source = route.source.name;

      this.#routes.set(source, [...(this.#routes.get(source) ?? []), compiled]);
    }
  }

  resolve = (source: string, input: unknown): Resolution => {
    const canonical = getCanonicalValue(input, INPUT_SIZE);

    if (canonical.status === "invalid") {
      return {
        kind: "REJECTED",
        reason: "invalid-input",
        issues: canonical.issues,
      };
    }

    const url =
      isPlainObject(canonical.value) && typeof canonical.value.url === "string"
        ? parseUrl(canonical.value.url)
        : null;

    const owner =
      url?.kind === "PARSED" ? this.#owners.get(getOrigin(url.url)) : undefined;

    if (owner !== undefined && owner !== source) {
      return { kind: "IGNORED", reason: "owned-by-other-source" };
    }

    const candidates: Candidate[] = (this.#routes.get(source) ?? []).flatMap(
      (route) => this.#getCandidates(route, canonical.value, url),
    );

    const failure = candidates.find((candidate) => candidate.kind === "FAILED");

    if (failure?.kind === "FAILED") {
      return reject("route-failed", failure.message);
    }

    const matched = candidates.flatMap((candidate) => {
      if (candidate.kind !== "CANDIDATE") {
        return [];
      }

      return [candidate];
    });

    const [first, ...others] = matched;

    if (first === undefined) {
      if (url?.kind === "REFUSED" && this.#hasUrlRoutes(source)) {
        return reject("invalid-url", url.message);
      }

      return { kind: "IGNORED", reason: "no-route" };
    }

    if (others.length > 0) {
      return reject(
        "ambiguous-route",
        `The routes ${matched.map(({ route }) => JSON.stringify(route.id)).join(", ")} all match.`,
      );
    }

    let candidate: unknown;

    try {
      candidate = first.payload();
    } catch (error) {
      return reject(
        "route-failed",
        getThrownMessage(
          error,
          `The route "${first.route.id}" threw while building its payload.`,
        ),
      );
    }

    const prepared = prepareIntent(first.route.definition, candidate);

    if (prepared.kind === "REJECTED") {
      return prepared;
    }

    return {
      kind: "MATCHED",
      route: first.route.id,
      name: first.route.intent,
      prepared,
    };
  };

  #compile(id: string, route: Route, definition: Definition): CompiledRoute {
    if (route.kind === "event") {
      return {
        kind: "EVENT",
        id,
        intent: route.intent.name,
        definition,
        route,
      };
    }

    const pattern = parsePattern(id, route.url);
    const owner = this.#owners.get(pattern.origin);

    if (owner !== undefined && owner !== route.source.name) {
      throw new JunctionError({
        code: "INVALID_CONFIGURATION",
        message: `routes.${id} routes ${pattern.origin} from "${route.source.name}", which "${owner}" already routes; one origin belongs to one source.`,
      });
    }

    this.#owners.set(pattern.origin, route.source.name);

    return {
      kind: "URL",
      id,
      intent: route.intent.name,
      definition,
      pattern,
      route,
    };
  }

  #hasUrlRoutes(source: string) {
    return (this.#routes.get(source) ?? []).some(({ kind }) => kind === "URL");
  }

  #getCandidates(
    compiled: CompiledRoute,
    input: unknown,
    url: ReturnType<typeof parseUrl> | null,
  ): Candidate[] {
    if (compiled.kind === "URL") {
      if (url?.kind !== "PARSED") {
        return [];
      }

      const params = matchPattern(compiled.pattern, url.url);

      if (params === null) {
        return [];
      }

      const query = createQueryReader(url.url.query);

      return [
        {
          kind: "CANDIDATE",
          route: compiled,
          payload: () => compiled.route.payload({ params, query, input }),
        },
      ];
    }

    try {
      if (compiled.route.match(input) !== true) {
        return [];
      }
    } catch (error) {
      return [
        {
          kind: "FAILED",
          message: getThrownMessage(
            error,
            `The route "${compiled.id}" threw while matching.`,
          ),
        },
      ];
    }

    return [
      {
        kind: "CANDIDATE",
        route: compiled,
        payload: () => compiled.route.payload(input),
      },
    ];
  }
}

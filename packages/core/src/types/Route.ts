import type { QueryReader } from "src/types/QueryReader";

/**
 * One declared route, as a route builder returns it. The routes a Junction is
 * given are keyed by id, so no two share one.
 *
 * @example
 * ```ts
 * const route: Route = from.links.url({ url: "myapp://announcements/:id", intent: "showAnnouncement", payload: ({ params }) => ({ announcementId: params.id }) });
 * ```
 */
export type Route =
  | {
      kind: "url";
      source: { name: string };
      intent: { name: string };
      url: string;
      // A method, so that the typed options of every route fit one table.
      payload(match: {
        params: Record<string, string>;
        query: QueryReader;
        input: unknown;
      }): unknown;
    }
  | {
      kind: "event";
      source: { name: string };
      intent: { name: string };
      // A method, for the same reason.
      match(input: unknown): boolean;
      // A method, for the same reason.
      payload(input: unknown): unknown;
    };

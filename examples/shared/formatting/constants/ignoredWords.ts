import type { Inspection } from "@priemskiyyy/junction";

/** Why Junction left an entry point alone, in the lab's words. */
export const IGNORED_WORDS = {
  "no-route": "no route takes it",
  "owned-by-other-source": "another source owns that link",
} satisfies Record<
  Extract<Inspection, { status: "ignored" }>["reason"],
  string
>;

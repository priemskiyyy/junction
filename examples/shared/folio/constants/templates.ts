import type { DocumentTemplate } from "example-shared/folio/types/DocumentTemplate";

/** The title and summary a new document starts with, for each template. */
export const TEMPLATES: Record<
  DocumentTemplate,
  { title: string; summary: string }
> = {
  blank: { title: "Untitled document", summary: "A blank page." },
  "meeting-notes": {
    title: "Meeting notes",
    summary: "Attendees, decisions and next steps.",
  },
};

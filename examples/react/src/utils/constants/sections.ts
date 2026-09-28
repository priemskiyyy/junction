import type { Section } from "src/types/Section";
import type { SectionId } from "src/types/SectionId";

export const SECTIONS: Record<SectionId, Section> = {
  device: { number: 1, title: "Open Folio from outside", label: "Try it" },
  inbox: { number: 2, title: "Who takes it, and why it waits", label: "Inbox" },
  door: { number: 3, title: "Checked at the door", label: "Links" },
  occurrences: {
    number: 4,
    title: "One occurrence, one intent",
    label: "Duplicates",
  },
  lab: { number: 5, title: "Break it, and watch", label: "Lab" },
};

export const SECTION_IDS: SectionId[] = [
  "device",
  "inbox",
  "door",
  "occurrences",
  "lab",
];

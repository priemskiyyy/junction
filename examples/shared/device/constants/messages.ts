import type { MessageLink } from "example-shared/device/types/MessageLink";

/** Grace's message with the Brand brief link, the one the tour starts from. */
export const BRAND_BRIEF_MESSAGE: MessageLink = {
  id: "brand-brief",
  from: { id: "grace" },
  text: "The brief for Monday's review",
  url: "https://folio.example/workspaces/design/documents/brand-brief",
};

/** The messages on the device, each with a link to a document. */
export const MESSAGES: MessageLink[] = [
  BRAND_BRIEF_MESSAGE,
  {
    id: "launch-plan",
    from: { id: "ada" },
    text: "Launch plan, with the new dates",
    url: "https://folio.example/workspaces/design/documents/launch-plan",
  },
  {
    id: "q3-budget",
    from: { id: "grace" },
    text: "Q3 numbers are in",
    url: "https://folio.example/workspaces/finance/documents/q3-budget",
  },
  {
    id: "invoice-run",
    from: { id: "grace" },
    text: "Invoices, straight in the app",
    url: "folio://open/finance/invoice-run",
  },
];

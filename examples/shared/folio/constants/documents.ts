import type { FolioDocument } from "example-shared/folio/types/FolioDocument";

/** The documents Folio starts with, two in each workspace. */
export const DOCUMENTS: FolioDocument[] = [
  {
    id: "brand-brief",
    workspace: { id: "design" },
    title: "Brand brief",
    summary: "Voice, colour and type for the autumn launch.",
    author: { id: "ada" },
    comments: [
      {
        id: "keep-wordmark",
        author: { id: "grace" },
        body: "Can we keep the old wordmark for print?",
      },
    ],
  },
  {
    id: "launch-plan",
    workspace: { id: "design" },
    title: "Launch plan",
    summary: "Channels, dates and owners for launch week.",
    author: { id: "ada" },
    comments: [],
  },
  {
    id: "q3-budget",
    workspace: { id: "finance" },
    title: "Q3 budget",
    summary: "Spend by team against the plan.",
    author: { id: "grace" },
    comments: [
      {
        id: "design-over",
        author: { id: "grace" },
        body: "Ada, the design line is 4% over. Can we talk?",
      },
    ],
  },
  {
    id: "invoice-run",
    workspace: { id: "finance" },
    title: "Invoice run",
    summary: "September's invoices, ready to send.",
    author: { id: "grace" },
    comments: [
      {
        id: "northwind-sent",
        author: { id: "ada" },
        body: "Grace, Northwind's invoice went out. Can you check the total?",
      },
    ],
  },
];

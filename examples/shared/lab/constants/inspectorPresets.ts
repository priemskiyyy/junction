/** The link the inspector starts with: a good document link. */
export const INSPECTED_URL =
  "https://folio.example/workspaces/design/documents/brand-brief";

/** Links to try in the inspector, each named for what it is, not for what Junction answers. */
export const INSPECTOR_PRESETS: { label: string; url: string }[] = [
  { label: "A document link", url: INSPECTED_URL },
  { label: "Folio's own scheme", url: "folio://open/finance/q3-budget" },
  {
    label: "A lookalike host",
    url: "https://folio.example.evil.test/workspaces/design/documents/brand-brief",
  },
  {
    label: "A workspace Folio lacks",
    url: "https://folio.example/workspaces/marketing/documents/brand-brief",
  },
  {
    label: "An id with a space",
    url: "https://folio.example/workspaces/design/documents/Brand%20brief",
  },
  {
    label: "A link with a password",
    url: "https://ada:secret@folio.example/workspaces/design/documents/brand-brief",
  },
  {
    label: "Plain http",
    url: "http://folio.example/workspaces/design/documents/brand-brief",
  },
];

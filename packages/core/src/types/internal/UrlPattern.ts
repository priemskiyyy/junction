export type UrlPattern = {
  origin: string;
  scheme: string;
  host: string;
  port: number | null;
  segments: (
    { kind: "LITERAL"; value: string } | { kind: "PARAMETER"; name: string }
  )[];
};

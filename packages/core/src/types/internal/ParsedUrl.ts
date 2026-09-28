export type ParsedUrl = {
  scheme: string;
  host: string;
  port: number | null;
  segments: string[];
  query: [string, string][];
};

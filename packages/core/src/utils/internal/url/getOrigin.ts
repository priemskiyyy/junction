export const getOrigin = ({
  scheme,
  host,
  port,
}: {
  scheme: string;
  host: string;
  port: number | null;
}) => `${scheme}://${host}${port === null ? "" : `:${port}`}`;

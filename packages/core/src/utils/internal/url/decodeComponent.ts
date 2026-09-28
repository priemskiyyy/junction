export const decodeComponent = (raw: string) => {
  // decodeURIComponent throws on an escape that is not two hex digits and on malformed UTF-8.
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
};

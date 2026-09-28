// A slash, a backslash, a C0 control character or DEL, which a decoded path segment may not hold.
export const isSeparatorCharacter = (code: number) =>
  code === 0x2f || code === 0x5c || code <= 0x1f || code === 0x7f;

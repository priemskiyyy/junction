// A space, a C0 or C1 control character, DEL or a backslash: none belongs raw in a routable URL.
export const isUnroutableCharacter = (code: number) =>
  code <= 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x5c;

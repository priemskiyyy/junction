export const getUtf8Size = (text: string) => {
  let size = 0;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    if (code < 0x80) {
      size += 1;

      continue;
    }

    if (code < 0x800) {
      size += 2;

      continue;
    }

    const next = text.charCodeAt(index + 1);

    if (code >= 0xd800 && code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
      size += 4;
      index += 1;

      continue;
    }

    size += 3;
  }

  return size;
};

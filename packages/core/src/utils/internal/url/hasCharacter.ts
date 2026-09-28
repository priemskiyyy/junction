export const hasCharacter = (
  text: string,
  isMatch: (code: number) => boolean,
) => {
  for (let index = 0; index < text.length; index += 1) {
    if (isMatch(text.charCodeAt(index))) {
      return true;
    }
  }

  return false;
};

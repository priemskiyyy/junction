/** A count with its noun, singular for one: `1 intent`, `3 intents`. */
export const formatCount = (count: number, noun: string) => {
  if (count === 1) {
    return `1 ${noun}`;
  }

  return `${count} ${noun}s`;
};

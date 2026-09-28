/** A timeline line with the intent it is about in front, when it is about one. */
export const describeLabeledLine = (line: string, label: string | null) => {
  if (label === null) {
    return line;
  }

  return `${label}: ${line}`;
};

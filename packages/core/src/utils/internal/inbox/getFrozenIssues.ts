import type { Issue } from "src/types/Issue";

export const getFrozenIssues = (issues: Issue[]) => {
  const frozen = issues.map((issue) => Object.freeze({ ...issue }));

  Object.freeze(frozen);

  return frozen;
};

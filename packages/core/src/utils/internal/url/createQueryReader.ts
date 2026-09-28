import type { QueryReader } from "src/types/QueryReader";
import { JunctionError } from "src/utils/JunctionError";

export const createQueryReader = (pairs: [string, string][]): QueryReader => {
  const all = (key: string) =>
    pairs.flatMap(([name, value]) => {
      if (name !== key) {
        return [];
      }

      return [value];
    });

  return Object.freeze({
    single: (key: string) => {
      const values = all(key);

      if (values.length > 1) {
        throw new JunctionError({
          code: "AMBIGUOUS_QUERY",
          message: `The query repeats ${JSON.stringify(key)}, which is read as a single value.`,
        });
      }

      return values[0];
    },
    all,
    has: (key: string) => pairs.some(([name]) => name === key),
  });
};

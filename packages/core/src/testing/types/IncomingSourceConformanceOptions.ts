import type { IncomingSourceFixture } from "src/testing/types/IncomingSourceFixture";

/**
 * What `testIncomingSource` needs: a name for the suite and a factory for a
 * fresh fixture per test.
 *
 * @example
 * ```ts
 * testIncomingSource({ name: "react-native-linking", createFixture });
 * ```
 */
export type IncomingSourceConformanceOptions<TInput, TNative> = {
  name: string;
  createFixture: () =>
    | IncomingSourceFixture<TInput, TNative>
    | Promise<IncomingSourceFixture<TInput, TNative>>;
};

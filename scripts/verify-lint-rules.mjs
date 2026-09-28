import assert from "node:assert/strict";
import { ESLint } from "eslint";

const eslint = new ESLint();

const relativeImports = [
  ['import { value } from "./value";', "no-restricted-syntax"],
  ['import type { Value } from "../types";', "no-restricted-syntax"],
  ['const value = import("./value");', "no-restricted-syntax"],
  ['type Value = import("../value").Value;', "no-restricted-syntax"],
];

const syntax = [
  [
    "const value = 1 as number;",
    "@typescript-eslint/consistent-type-assertions",
  ],
  ["const value = [1] as const;", "no-restricted-syntax"],
  [
    "// eslint-disable-next-line no-restricted-syntax\nconst value = [1] as const;",
    "no-restricted-syntax",
  ],
  ["/* eslint-disable */\nconst value = [1] as const;", "no-restricted-syntax"],
  ["const value = <number>1;", "no-restricted-syntax"],
  ["const value: string | null = null; value!;", "no-restricted-syntax"],
  ["enum State { Ready }", "no-restricted-syntax"],
  ["switch (1) { default: break; }", "no-restricted-syntax"],
  ["void Promise.resolve();", "no-restricted-syntax"],
  ["let value; value ??= 1;", "no-restricted-syntax"],
  ["let value = 0; value ||= 1;", "no-restricted-syntax"],
  ["let value = 0; value &&= 1;", "no-restricted-syntax"],
  ["type Value = { readonly key: string };", "no-restricted-syntax"],
  ["type Value = { readonly [key: string]: string };", "no-restricted-syntax"],
  ["class Value { readonly key = 1; }", "no-restricted-syntax"],
  [
    "class Value { constructor(readonly key: string) {} }",
    "no-restricted-syntax",
  ],
  [
    "type Value<T> = { readonly [K in keyof T]: T[K] };",
    "no-restricted-syntax",
  ],
  ["type Value = readonly string[];", "no-restricted-syntax"],
  ["type Value = Readonly<{ key: string }>;", "no-restricted-syntax"],
  ["type Value = ReadonlyArray<string>;", "no-restricted-syntax"],
  ["type Value = ReadonlyMap<string, number>;", "no-restricted-syntax"],
  ["type Value = ReadonlySet<string>;", "no-restricted-syntax"],
  ["type Value = DeepReadonly<{ key: string }>;", "no-restricted-syntax"],
  [
    "const values = [1, 2].filter((value) => value > 1).map((value) => value * 2);",
    "no-restricted-syntax",
  ],
  [
    "const values = [1, 2].map((value) => value * 2).filter((value) => value > 2);",
    "no-restricted-syntax",
  ],
  [
    "function value(flag: boolean) {\n  return flag ? 1 : 2;\n}",
    "no-restricted-syntax",
  ],
  ["const value = (flag: boolean) => (flag ? 1 : 2);", "no-restricted-syntax"],
  ["new AbortController().signal.throwIfAborted();", "no-restricted-syntax"],
  ["const signal = AbortSignal.timeout(1_000);", "no-restricted-syntax"],
  ["const signal = AbortSignal.any([]);", "no-restricted-syntax"],
  ["const signal = AbortSignal.abort();", "no-restricted-syntax"],
  [
    "const read = (signal: AbortSignal) => signal.reason;",
    "no-restricted-syntax",
  ],
  [
    "const read = (context: { signal: AbortSignal }) => context.signal.reason;",
    "no-restricted-syntax",
  ],
  [
    "interface Value { key: string }",
    "@typescript-eslint/consistent-type-definitions",
  ],
  ["const value: any = 1;", "@typescript-eslint/no-explicit-any"],
  [
    'import { Value } from "src/value";\n\ntype Copy = Value;',
    "@typescript-eslint/consistent-type-imports",
  ],
  ["if (true) console.log(1);", "curly"],
  [
    "function value(flag) { if (flag) { return 1; } else { return 2; } }",
    "no-else-return",
  ],
  [
    "function value(flag) {\n  if (flag === 1) {\n    return 1;\n  } else if (flag === 2) {\n    return 2;\n  }\n\n  return 3;\n}",
    "no-else-return",
  ],
  [
    "function value() {\n  console.log(1);\n  const next = 1;\n\n  return next;\n}",
    "padding-line-between-statements",
  ],
  [
    "function value() {\n  const next = 1;\n  console.log(next);\n}",
    "padding-line-between-statements",
  ],
  [
    "function value() {\n  console.log(1);\n  let next = 1;\n\n  next += 1;\n\n  return next;\n}",
    "padding-line-between-statements",
  ],
  [
    "function value() {\n  let next = 1;\n  next += 1;\n\n  return next;\n}",
    "padding-line-between-statements",
  ],
  [
    "function value() {\n  const first = {\n    key: 1,\n  };\n  const second = first;\n\n  return second;\n}",
    "padding-line-between-statements",
  ],
  [
    "function value() {\n  const first = 1;\n  const second = {\n    key: first,\n  };\n\n  return second;\n}",
    "padding-line-between-statements",
  ],
  [
    "function value(flag) {\n  console.log(flag);\n  if (flag) {\n    console.log(1);\n  }\n}",
    "padding-line-between-statements",
  ],
  [
    "function value(flag) {\n  if (flag) {\n    console.log(1);\n  }\n  console.log(flag);\n}",
    "padding-line-between-statements",
  ],
  [
    "function value() {\n  console.log(1);\n  return 1;\n}",
    "padding-line-between-statements",
  ],
];

// TSX reads an angle-bracket assertion as JSX, so that one probe stays out of the sweep.
const tsxProbes = [...relativeImports, ...syntax].flatMap(([code, rule]) => {
  if (code.includes("<number>")) {
    return [];
  }

  return [[code, rule, "examples/react/src/LintProbe.tsx"]];
});

const nonEntryFiles = [
  "packages/core/src/lint-probe.ts",
  "packages/core/src/utils/index.ts",
  "packages/adapters/react-native/src/utils/index.ts",
  "packages/integrations/silo/src/utils/index.ts",
  "packages/react/src/lint-probe.tsx",
];

const reactFiles = [
  "packages/react/src/useValue.ts",
  "packages/react/src/useValue.tsx",
  "examples/react/src/useValue.ts",
  "examples/react/src/useValue.tsx",
  "examples/expo/src/useValue.ts",
  "examples/expo/src/useValue.tsx",
];

const fileProbes = [
  [
    'export { value } from "./value";',
    "no-restricted-syntax",
    "packages/core/src/index.ts",
  ],
  [
    'export * from "src/value";',
    "no-restricted-syntax",
    "packages/core/src/index.ts",
  ],
  ...nonEntryFiles.map((filePath) => [
    'export { value } from "src/value";',
    "no-restricted-syntax",
    filePath,
  ]),
  ...["js", "mjs"].map((extension) => [
    "function value() {\n  console.log(1);\n  return 1;\n}",
    "padding-line-between-statements",
    `scripts/lint-probe.${extension}`,
  ]),
  ...reactFiles.map((filePath) => [
    'import { useState } from "react";\n\nexport const useValue = (flag: boolean) => {\n  if (flag) {\n    useState(0);\n  }\n};',
    "react-hooks/rules-of-hooks",
    filePath,
  ]),
  [
    "interface Value { key: string }",
    "@typescript-eslint/consistent-type-definitions",
    "packages/react/src/types/Value.ts",
  ],
  [
    "export type Value = {};",
    "@typescript-eslint/no-empty-object-type",
    "packages/react/src/types/Value.ts",
  ],
];

const clockProbes = [
  "export const time = Date.now();",
  "export const time = new Date();",
  "export const time = Date();",
  "export const time = performance.now();",
].flatMap((code) =>
  [
    "packages/core/src/utils/lint-probe.ts",
    "packages/react/src/hooks/lint-probe.ts",
    "packages/adapters/react-native/src/utils/lint-probe.ts",
  ].map((filePath) => [code, "no-restricted-syntax", filePath]),
);

const probes = [
  ...relativeImports,
  ...syntax,
  ...tsxProbes,
  ...fileProbes,
  ...clockProbes,
];

const reexportingEntries = [
  "packages/core/src/index.ts",
  "packages/core/src/mock.ts",
  "packages/core/src/testing.ts",
  "packages/react/src/index.ts",
  "packages/adapters/react-native/src/index.ts",
  "packages/integrations/silo/src/index.ts",
];

const allowed = [
  [
    'import { value } from "src/value";\n\nexport const copy = value;',
    "packages/core/src/lint-probe.ts",
  ],
  ...reexportingEntries.map((filePath) => [
    'export { value } from "src/value";',
    filePath,
  ]),
  [
    "export const value = { key: 1 } satisfies Record<string, number>;",
    "packages/core/src/lint-probe.ts",
  ],
  [
    "const first = 1;\nconst second = first + 1;\n\nexport { second };",
    "packages/core/src/lint-probe.ts",
  ],
  [
    "export const isAborted = (signal: AbortSignal) => signal.aborted;",
    "packages/core/src/lint-probe.ts",
  ],
  [
    "export const values = [1, 2].flatMap((value) => {\n  if (value < 2) {\n    return [];\n  }\n\n  return [value * 2];\n});",
    "packages/core/src/lint-probe.ts",
  ],
  [
    "export const value = (flag: boolean) => {\n  if (flag) {\n    return 1;\n  }\n\n  return 2;\n};",
    "packages/core/src/lint-probe.ts",
  ],
  [
    'export const value = (flag: boolean) => ({ state: flag ? "on" : "off" });',
    "packages/core/src/lint-probe.ts",
  ],
  [
    "export const values = [1, 2].filter((value) => value > 1);",
    "packages/core/src/lint-probe.ts",
  ],
  [
    "export const values = [1, 2].map((value) => value * 2).join(', ');",
    "packages/core/src/lint-probe.ts",
  ],
  [
    "export const time = Date.now();",
    "packages/core/src/utils/internal/runtime/Clock.ts",
  ],
  [
    "export const time = Date.now();",
    "packages/core/src/utils/lint-probe.test.ts",
  ],
  ["export const date = new Date(0);", "packages/core/src/utils/lint-probe.ts"],
  ["export interface Register {}", "packages/react/src/types/Register.ts"],
  [
    'declare module "@priemskiyyy/junction-react" {\n  interface Register {\n    junction: unknown;\n  }\n}\n\nexport {};',
    "examples/react/src/types/Register.d.ts",
  ],
];

const getRuleIds = async (code, filePath) => {
  const [result] = await eslint.lintText(code, { filePath });

  return result.messages.map(
    (message) => message.ruleId ?? `parse error: ${message.message}`,
  );
};

for (const [
  code,
  rule,
  filePath = "packages/core/src/lint-probe.ts",
] of probes) {
  const ruleIds = await getRuleIds(code, filePath);

  assert(
    ruleIds.includes(rule),
    `Missing lint rejection: ${rule} in ${filePath}: ${code}`,
  );
}

for (const [code, filePath] of allowed) {
  const ruleIds = await getRuleIds(code, filePath);

  assert.deepEqual(
    ruleIds,
    [],
    `Unexpected lint report ${ruleIds.join(", ")} in ${filePath}: ${code}`,
  );
}

console.log(
  `Verified ${probes.length} syntax restrictions and ${allowed.length} allowed forms.`,
);

import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const toRestrictions = (entries) =>
  entries.map(([selector, message]) => ({ selector, message }));

const relativeImports = toRestrictions([
  [
    "ImportDeclaration[source.value=/^[.]/]",
    "Use src/... imports or public package imports.",
  ],
  [
    "ExportNamedDeclaration[source.value=/^[.]/]",
    "Use src/... imports for public exports.",
  ],
  [
    "ImportExpression[source.value=/^[.]/]",
    "Use src/... imports for dynamic imports.",
  ],
  [
    "TSImportType[source.value=/^[.]/]",
    "Use src/... imports for imported types.",
  ],
]);

const bannedSyntax = toRestrictions([
  [
    "TSAsExpression",
    "Do not use type assertions, including as const. Narrow the value, annotate the type, or use satisfies.",
  ],
  [
    "TSTypeAssertion",
    "Do not use type assertions. Narrow the value, annotate the type, or use satisfies.",
  ],
  ["TSNonNullExpression", "Narrow nullable values before using them."],
  ["TSEnumDeclaration", "Use a string union instead of an enum."],
  ["SwitchStatement", "Use explicit conditional dispatch."],
  [
    "UnaryExpression[operator='void']",
    "Handle promise completion and failures explicitly.",
  ],
  ["AssignmentExpression[operator='??=']", "Use explicit assignment."],
  ["AssignmentExpression[operator='||=']", "Use explicit assignment."],
  ["AssignmentExpression[operator='&&=']", "Use explicit assignment."],
  ["TSPropertySignature[readonly=true]", "Use mutable public property types."],
  ["TSIndexSignature[readonly=true]", "Use mutable index signatures."],
  ["PropertyDefinition[readonly=true]", "Use mutable property types."],
  ["TSParameterProperty[readonly=true]", "Use mutable property types."],
  [
    "TSMappedType[readonly]",
    "Do not add readonly mapped modifiers. Use the mutable type; published data is frozen at runtime.",
  ],
  ["TSTypeOperator[operator='readonly']", "Use mutable array types."],
  [
    "TSTypeReference[typeName.name=/^(Readonly|ReadonlyArray|ReadonlyMap|ReadonlySet|DeepReadonly)$/]",
    "Do not use readonly utility types. Use the mutable type; published data is frozen at runtime.",
  ],
  ["ExportAllDeclaration", "List public exports explicitly."],
  [
    "CallExpression[callee.property.name='map'][callee.object.callee.property.name='filter']",
    "Use one .flatMap() with early returns: return [] to skip, return [value] to keep.",
  ],
  [
    "CallExpression[callee.property.name='filter'][callee.object.callee.property.name='map']",
    "Use one .flatMap() with early returns: return [] to skip, return [value] to keep.",
  ],
  [
    "ReturnStatement > ConditionalExpression",
    "Return early from an if instead of returning a ternary.",
  ],
  [
    "ArrowFunctionExpression > ConditionalExpression.body",
    "Give the arrow a block that returns early from an if instead of a ternary body.",
  ],
  [
    "MemberExpression[property.name='throwIfAborted']",
    "React Native's AbortSignal has no throwIfAborted(): check signal.aborted.",
  ],
  [
    "MemberExpression[object.name='AbortSignal'][property.name=/^(abort|any|timeout)$/]",
    "React Native's AbortSignal has no static abort(), any() or timeout(): use an AbortController.",
  ],
  [
    "MemberExpression[property.name='reason'][object.property.name='signal']",
    "React Native's AbortSignal has no reason: reject with an error of your own.",
  ],
  [
    "MemberExpression[object.name='signal'][property.name='reason']",
    "React Native's AbortSignal has no reason: reject with an error of your own.",
  ],
]);

const clockReads = toRestrictions([
  [
    "MemberExpression[object.name='Date'][property.name='now']",
    "Read the time through the now option: new Junction({ ..., now }).",
  ],
  [
    "NewExpression[callee.name='Date'][arguments.length=0]",
    "Read the time through the now option: new Junction({ ..., now }).",
  ],
  [
    "CallExpression[callee.name='Date']",
    "Read the time through the now option: new Junction({ ..., now }).",
  ],
  [
    "MemberExpression[object.name='performance'][property.name='now']",
    "Read the time through the now option: new Junction({ ..., now }).",
  ],
]);

const reexports = toRestrictions([
  [
    "ExportNamedDeclaration[source]",
    "Keep explicit re-exports at public package entry points only.",
  ],
]);

const testFiles = [
  "packages/**/src/**/*.test.{ts,tsx}",
  "packages/**/src/**/*.fixture.{ts,tsx}",
  "packages/**/src/**/*.contracts.ts",
];

// The clock is the one place that may read the system time, as the default of the now option.
const clockDefault = "packages/core/src/utils/internal/runtime/Clock.ts";

const entryPoints = [
  "packages/*/src/index.ts",
  "packages/adapters/*/src/index.ts",
  "packages/integrations/*/src/index.ts",
  "packages/core/src/mock.ts",
  "packages/core/src/testing.ts",
];

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.expo/**",
      ".artifacts/**",
      "docs/.vitepress/cache/**",
      "docs/.vitepress/dist/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  {
    // No inline comment can switch a rule off; an exception is a file-scoped block here.
    linterOptions: { noInlineConfig: true },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    rules: {
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: ["const", "let"] },
        { blankLine: "always", prev: ["const", "let"], next: "*" },
        {
          blankLine: "any",
          prev: ["singleline-const", "singleline-let"],
          next: ["singleline-const", "singleline-let"],
        },
        { blankLine: "always", prev: "*", next: "block-like" },
        { blankLine: "always", prev: "block-like", next: "*" },
        { blankLine: "always", prev: "*", next: "return" },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      curly: ["error", "all"],
      "no-else-return": ["error", { allowElseIf: false }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-syntax": ["error", ...relativeImports, ...bannedSyntax],
    },
  },
  {
    // Declaration merging needs an interface, so the binding's Register is
    // one, and so is every augmentation of it: the binding's own tests', the
    // consumer type tests' and every example's.
    files: [
      "packages/react/src/types/Register.ts",
      "packages/react/src/types/Register.fixture.ts",
      "tests/types/react-api.ts",
      "examples/*/src/types/Register.d.ts",
    ],
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["packages/**/src/**/*.{ts,tsx}"],
    ignores: entryPoints,
    rules: {
      "no-restricted-syntax": [
        "error",
        ...relativeImports,
        ...bannedSyntax,
        ...reexports,
      ],
    },
  },
  {
    files: ["packages/**/src/**/*.{ts,tsx}"],
    ignores: [...entryPoints, ...testFiles, clockDefault],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...relativeImports,
        ...bannedSyntax,
        ...reexports,
        ...clockReads,
      ],
    },
  },
  {
    files: [
      "packages/react/**/*.{ts,tsx}",
      "examples/react/**/*.{ts,tsx}",
      "examples/expo/**/*.{ts,tsx}",
    ],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        Buffer: "readonly",
      },
    },
  },
);

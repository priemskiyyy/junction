// Checks every package the way a consumer receives it: the tarball pnpm packs,
// linted by publint, installed into a throwaway consumer beside the peers the
// workspace pins, typechecked through every entry point under Bundler and
// NodeNext, its conformance suites run under Vitest from the published
// testing entry, and an intent carried end to end under plain Node. Every
// problem is reported before it fails, and the release artifacts are staged
// only when there is none.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publint } from "publint";
import { formatMessage } from "publint/utils";
import ts from "typescript";

const workspace = fileURLToPath(new URL("..", import.meta.url));
const release = path.join(workspace, ".artifacts", "release");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const rootManifest = readJson(path.join(workspace, "package.json"));

const CORE = "@priemskiyyy/junction";
const PACKED = ["README.md", "LICENSE", "package.json"];

const packages = ["packages", "packages/adapters", "packages/integrations"]
  .flatMap((group) =>
    readdirSync(path.join(workspace, group)).map((directory) => ({
      group,
      directory,
      root: path.join(workspace, group, directory),
    })),
  )
  .flatMap((entry) => {
    const file = path.join(entry.root, "package.json");

    if (!existsSync(file)) {
      return [];
    }

    const manifest = readJson(file);

    if (manifest.private === true) {
      return [];
    }

    return [{ ...entry, manifest }];
  });

const getSpecifier = (name, subpath) => {
  if (subpath === ".") {
    return name;
  }

  return `${name}/${subpath.slice("./".length)}`;
};

const toProblems = (name, checks) =>
  checks.flatMap(([failed, message]) => {
    if (!failed) {
      return [];
    }

    return [`${name} ${message}`];
  });

const run = (command, args, cwd) =>
  spawnSync(command, args, { cwd, encoding: "utf8" });

const runOrThrow = (command, args, cwd) => {
  const result = run(command, args, cwd);

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${cwd}:\n${result.stdout}${result.stderr}`,
    );
  }

  return result.stdout;
};

// Every entry is types, then import, then default, with import and default on
// the same ESM file, because React Native consumers run Jest.
const getExportsProblems = ({ manifest }) =>
  Object.entries(manifest.exports ?? {}).flatMap(([subpath, target]) =>
    toProblems(manifest.name, [
      [
        Object.keys(target).join(",") !== "types,import,default",
        `exports ${subpath} as ${Object.keys(target).join(", ")}, not types, import, default`,
      ],
      [
        target.import !== target.default,
        `exports ${subpath} with import and default on different files`,
      ],
      [
        !String(target.import).endsWith(".js") ||
          !String(target.types).endsWith(".d.ts"),
        `exports ${subpath} from ${target.import} and ${target.types}, not an ESM file and its declarations`,
      ],
    ]),
  );

// The runtime names an entry promises: its source's value exports.
const getSurface = (packageRoot, target) => {
  const source = path.join(
    packageRoot,
    String(target.import)
      .replace(/^\.\/dist\//, "src/")
      .replace(/\.js$/, ".ts"),
  );

  return [
    ...readFileSync(source, "utf8").matchAll(/^export \{ ([^}]+) \} from/gm),
  ]
    .flatMap(([, names]) => names.split(",").map((name) => name.trim()))
    .sort();
};

const getTarballProblems = ({ manifest }, files) => {
  const packed = new Set(files);

  const targets = Object.values(manifest.exports ?? {}).flatMap((target) =>
    Object.values(target).map((file) => String(file).replace(/^\.\//, "")),
  );

  return toProblems(manifest.name, [
    ...PACKED.map((file) => [!packed.has(file), `packs no ${file}`]),
    ...targets.map((target) => [
      !packed.has(target),
      `packs no ${target}, which its exports point at`,
    ]),
    ...files.map((file) => [
      !PACKED.includes(file) && !file.startsWith("dist/"),
      `packs ${file}, which is for this repository only`,
    ]),
    ...files.map((file) => [
      /\.(test|fixture|contracts)\./.test(file),
      `packs ${file}, a test file`,
    ]),
  ]);
};

const getPublintProblems = async ({ manifest }, tarball) => {
  const bytes = readFileSync(tarball);

  const { messages, pkg } = await publint({
    pack: {
      tarball: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ),
    },
    strict: true,
  });

  return messages.map(
    (message) =>
      `${manifest.name} fails publint (${message.type}): ${formatMessage(message, pkg, { color: false }) ?? message.code}`,
  );
};

const listFiles = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true }).flatMap(
    (entry) => {
      if (!entry.isFile()) {
        return [];
      }

      return [path.join(entry.parentPath, entry.name)];
    },
  );

// The scanner skips comments, so a JSDoc example that imports an SDK is not an import.
const getImportSpecifiers = (file) => {
  const { importedFiles } = ts.preProcessFile(
    readFileSync(file, "utf8"),
    true,
    true,
  );

  return importedFiles.map(({ fileName }) => fileName);
};

// A published file imports only its own files, the core and the peers it
// declares, and a source never its provider: the application passes the SDK
// as `sdk`, so the optional peer is only the version it was verified against.
const getImportProblems = ({ manifest }, installed) => {
  const providers = new Set(
    Object.entries(manifest.peerDependenciesMeta ?? {}).flatMap(
      ([name, meta]) => {
        if (meta.optional !== true || name === "vitest") {
          return [];
        }

        return [name];
      },
    ),
  );

  const allowed = new Set(Object.keys(manifest.peerDependencies ?? {}));

  return listFiles(path.join(installed, "dist")).flatMap((file) => {
    if (!/\.(js|d\.ts)$/.test(file)) {
      return [];
    }

    const shown = path.relative(installed, file);

    return getImportSpecifiers(file).flatMap((specifier) => {
      if (specifier.startsWith(".")) {
        return [];
      }

      if (specifier.startsWith("src/")) {
        return [
          `${manifest.name} ${shown} imports ${specifier}, an alias of its sources`,
        ];
      }

      const name = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : (specifier.split("/")[0] ?? specifier);

      if (providers.has(name) && file.endsWith(".js")) {
        return [
          `${manifest.name} ${shown} imports its provider ${name} at runtime`,
        ];
      }

      if (name === manifest.name || allowed.has(name)) {
        return [];
      }

      if (specifier.startsWith("node:") || name === "react/jsx-runtime") {
        return [];
      }

      return [
        `${manifest.name} ${shown} imports ${specifier}, which it does not declare`,
      ];
    });
  });
};

const getBundleProblems = ({ manifest }, installed) =>
  Object.entries(manifest.exports ?? {}).flatMap(([subpath, target]) => {
    const code = readFileSync(path.join(installed, target.import), "utf8");

    const declarations = readFileSync(
      path.join(installed, target.types),
      "utf8",
    );

    return toProblems(manifest.name, [
      [
        /export\s+default\b|as\s+default\s*[,}]/.test(code),
        `exports a default from ${subpath}`,
      ],
      [
        !declarations.includes("@example"),
        `declarations for ${subpath} lost their examples`,
      ],
    ]);
  });

// Node's own resolution from a package's directory, as its imports resolve.
const getResolvedCore = (from) =>
  realpathSync(createRequire(path.join(from, "package.json")).resolve(CORE));

const formatDiagnostic = (diagnostic, cwd) => {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

  if (diagnostic.file === undefined || diagnostic.start === undefined) {
    return message;
  }

  const { line } = diagnostic.file.getLineAndCharacterOfPosition(
    diagnostic.start,
  );

  return `${path.relative(cwd, diagnostic.file.fileName)}:${line + 1}: ${message}`;
};

// The consumer's own files and the packages' emitted declarations, at a
// consumer's strictest settings, without reporting the whole of React's.
const getTypecheckProblems = (consumer, rootNames, installed, mode) => {
  const program = ts.createProgram({
    rootNames,
    options: {
      strict: true,
      exactOptionalPropertyTypes: true,
      noUncheckedIndexedAccess: true,
      noEmit: true,
      skipLibCheck: false,
      target: ts.ScriptTarget.ES2022,
      lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
      types: [],
      module:
        mode === "Bundler" ? ts.ModuleKind.ESNext : ts.ModuleKind.NodeNext,
      moduleResolution:
        mode === "Bundler"
          ? ts.ModuleResolutionKind.Bundler
          : ts.ModuleResolutionKind.NodeNext,
    },
  });

  const owned = (file) =>
    rootNames.includes(file.fileName) ||
    installed.some((directory) =>
      realpathSync(file.fileName).startsWith(directory),
    );

  return ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) => diagnostic.file === undefined || owned(diagnostic.file),
    )
    .map(
      (diagnostic) =>
        `A consumer under ${mode} fails to typecheck: ${formatDiagnostic(diagnostic, consumer)}`,
    );
};

const stageRelease = ({ manifest, tarball }) => {
  const directory = path.join(release, manifest.name);
  const filename = path.basename(tarball);

  const checksum = createHash("sha256")
    .update(readFileSync(tarball))
    .digest("hex");

  mkdirSync(directory, { recursive: true });
  copyFileSync(tarball, path.join(directory, filename));
  writeFileSync(
    path.join(directory, "SHA256SUMS"),
    `${checksum}  ${filename}\n`,
  );
};

// A hand-written Standard Schema, so the consumer proves the core needs no
// validation library of its own.
const SCHEMA = `const passthrough = <TValue>() => ({
  "~standard": {
    version: 1 as const,
    vendor: "consumer",
    validate: (value: unknown) => ({ value: value as TValue }),
  },
});`;

const CONTRACTS = `import { intent, Junction, JunctionError } from "@priemskiyyy/junction";
import type { JunctionDiagnosticEvent, JunctionIdentity, ObservableValue } from "@priemskiyyy/junction";
import { createMockSource, createMockStorage } from "@priemskiyyy/junction/mock";
import type { IncomingSourceFixture } from "@priemskiyyy/junction/testing";
import { JunctionProvider, useInbox, useIntent, useJunction, useSourceStatus } from "@priemskiyyy/junction-react";
import { linking } from "@priemskiyyy/junction-react-native";
import type { LinkingLike } from "@priemskiyyy/junction-react-native";
import { branch } from "@priemskiyyy/junction-branch";
import type { BranchLike } from "@priemskiyyy/junction-branch";
import { appsFlyer } from "@priemskiyyy/junction-appsflyer";
import type { AppsFlyerLike } from "@priemskiyyy/junction-appsflyer";
import { appsFlyer as appsFlyer6 } from "@priemskiyyy/junction-appsflyer-v6";
import type { AppsFlyerLike as AppsFlyer6Like } from "@priemskiyyy/junction-appsflyer-v6";
import { adjust } from "@priemskiyyy/junction-adjust";
import type { AdjustConfigLike } from "@priemskiyyy/junction-adjust";
import { detour } from "@priemskiyyy/junction-detour";
import type { DetourLike } from "@priemskiyyy/junction-detour";
import { notifications } from "@priemskiyyy/junction-expo-notifications";
import type { NotificationsLike } from "@priemskiyyy/junction-expo-notifications";
import { quickActions } from "@priemskiyyy/junction-expo-quick-actions";
import type { QuickActionsLike } from "@priemskiyyy/junction-expo-quick-actions";
import { silo } from "@priemskiyyy/junction-silo";
import type { SiloValueLike } from "@priemskiyyy/junction-silo";

${SCHEMA}

declare const identity: ObservableValue<JunctionIdentity>;
declare const Linking: LinkingLike;
declare const Branch: BranchLike;
declare const AppsFlyer: AppsFlyerLike;
declare const AppsFlyer6: AppsFlyer6Like;
declare const config: AdjustConfigLike;
declare const Detour: DetourLike;
declare const Notifications: NotificationsLike;
declare const QuickActions: QuickActionsLike;
declare const inbox: SiloValueLike;

const expectType = <TCheck extends true>(check: TCheck) => check;

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;

export const junction = new Junction({
  intents: {
    openDocument: intent(passthrough<{ documentId: string }>(), { account: true }),
    showAnnouncement: intent(passthrough<{ announcementId: string }>()),
  },
  identity,
  sources: {
    links: linking({ sdk: Linking }),
    referrals: branch({ sdk: Branch }),
    campaigns: appsFlyer({ sdk: AppsFlyer }),
    legacyCampaigns: appsFlyer6({ sdk: AppsFlyer6 }),
    installs: adjust({ sdk: config }),
    detourLinks: detour({ sdk: Detour }),
    presses: notifications({ sdk: Notifications, interaction: "per-notification-action" }),
    shortcuts: quickActions({ sdk: QuickActions }),
  },
  routes: ({ from }) => ({
    document: from.links.url({
      url: "myapp://documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.documentId }),
    }),
  }),
  timeout: { initial: 2_000, execution: 30_000, storage: 10_000 },
});

expectType<Equal<ReturnType<typeof junction.source<"links">>["native"], LinkingLike>>(true);

junction.diagnostics.events.subscribe((event) => {
  if (event.type === "intent waiting") {
    expectType<Equal<typeof event.context.consumers, number>>(true);
  }
});

expectType<Equal<JunctionDiagnosticEvent<"retry scheduled">["context"], { after: number }>>(true);

for (const entry of junction.inbox.get()) {
  if (entry.name === "openDocument") {
    expectType<Equal<typeof entry.payload.documentId, string>>(true);
  }
}

export const persistent = new Junction({
  intents: { kept: intent(passthrough<{ id: string }>(), { persist: { schema: passthrough<{ id: string }>() } }) },
  storage: silo({ value: inbox }),
});

export const mocked = new Junction({
  intents: { kept: intent(passthrough<{ id: string }>(), { persist: { schema: passthrough<{ id: string }>() } }) },
  storage: createMockStorage().storage,
  sources: { links: createMockSource<{ url: string }>().source },
});

export const fixture: IncomingSourceFixture<{ url: string }, null> = {
  source: createMockSource<{ url: string }>().source,
  native: null,
  open: () => {},
  listeners: () => 0,
};

export const error = new JunctionError({ code: "TIMED_OUT", message: "" });

expectType<Equal<typeof error.code, "TIMED_OUT">>(true);

export const hooks = [JunctionProvider, useInbox, useIntent, useJunction, useSourceStatus];
`;

const CONFORMANCE = `import { createMockSource, createMockStorage } from "@priemskiyyy/junction/mock";
import { testInboxStorage, testIncomingSource } from "@priemskiyyy/junction/testing";

testIncomingSource({
  name: "the published mock source",
  createFixture: () => {
    const native = { kind: "mock-sdk" };
    const { source, control } = createMockSource<{ url: string }, typeof native>({ native });

    return {
      source,
      native,
      open: async () => {
        await control.emit({ input: { url: "myapp://open" } });
      },
      listeners: control.listeners,
    };
  },
});

testInboxStorage({
  name: "the published mock storage",
  createFixture: () => {
    const first = createMockStorage();

    return {
      storage: first.storage,
      reopen: () => createMockStorage({ stored: first.control.stored() }).storage,
    };
  },
});
`;

const getSmoke = (surfaces) => `import assert from "node:assert/strict";

// Named exports only, and exactly the ones each entry promises.
for (const [specifier, names] of Object.entries(${JSON.stringify(surfaces, null, 2)})) {
  const entry = await import(specifier);

  assert.deepEqual(Object.keys(entry).sort(), names, \`\${specifier} exports other names than it promises\`);
}

const { intent, Junction } = await import("${CORE}");
const { createMockSource } = await import("${CORE}/mock");

const schema = { "~standard": { version: 1, vendor: "smoke", validate: (value) => ({ value }) } };
const links = createMockSource({ resource: "linking" });

const junction = new Junction({
  intents: { openDocument: intent(schema) },
  sources: { links: links.source },
  routes: ({ from }) => ({
    document: from.links.url({
      url: "myapp://documents/:documentId",
      intent: "openDocument",
      payload: ({ params }) => ({ documentId: params.documentId }),
    }),
  }),
});

assert.deepEqual(links.control.attachments, [], "Constructing a Junction must attach nothing.");

await junction.start();

const handled = [];

junction.subscribe("openDocument", ({ documentId }, { commit }) => commit(() => handled.push(documentId)));

const admission = await links.control.emit({ input: { url: "myapp://documents/42" } });

assert.equal(admission.status, "accepted");
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(handled, ["42"], "The intent must reach its consumer once.");
assert.deepEqual(junction.inbox.get(), [], "A handled intent must leave the inbox.");
junction.dispose();
assert.equal(junction.diagnostics.get().state, "disposed");
console.log("An intent traveled from a source to its consumer under plain Node.");
`;

const problems = packages.flatMap(getExportsProblems);
const temporary = mkdtempSync(path.join(tmpdir(), "junction-packages-"));
const tarballs = path.join(temporary, "tarballs");
const consumer = path.join(temporary, "consumer");

mkdirSync(tarballs);
mkdirSync(consumer);

try {
  process.stdout.write(`Packing ${packages.length} packages...\n`);

  const packed = packages.map((entry) => {
    const output = runOrThrow(
      "pnpm",
      ["pack", "--pack-destination", tarballs, "--json"],
      entry.root,
    );

    const { filename, files } = JSON.parse(output.slice(output.indexOf("{")));

    return {
      ...entry,
      tarball: filename,
      files: files.map((file) => file.path),
    };
  });

  for (const entry of packed) {
    problems.push(
      ...getTarballProblems(entry, entry.files),
      ...(await getPublintProblems(entry, entry.tarball)),
    );
  }

  // Peers resolve only to what the consumer lists, as an application's do.
  // The sources' optional SDKs stay out, so the install proves no source
  // needs its provider installed.
  const pinned = (name) => rootManifest.devDependencies[name];

  writeFileSync(
    path.join(consumer, "package.json"),
    `${JSON.stringify(
      {
        name: "junction-consumer",
        private: true,
        type: "module",
        dependencies: {
          ...Object.fromEntries(
            packed.map(({ manifest, tarball }) => [
              manifest.name,
              `file:${tarball}`,
            ]),
          ),
          react: pinned("react"),
          "@types/react": pinned("@types/react"),
          vitest: pinned("vitest"),
        },
      },
      null,
      2,
    )}\n`,
  );

  process.stdout.write(
    "Installing the packed packages in an isolated consumer...\n",
  );
  runOrThrow(
    "pnpm",
    [
      "install",
      "--prefer-offline",
      "--ignore-workspace",
      "--ignore-scripts",
      "--config.auto-install-peers=false",
    ],
    consumer,
  );

  process.stdout.write("Checking the installed files...\n");

  const installed = new Map(
    packed.map(({ manifest }) => [
      manifest.name,
      realpathSync(path.join(consumer, "node_modules", manifest.name)),
    ]),
  );

  const core = getResolvedCore(consumer);

  for (const entry of packed) {
    const directory = installed.get(entry.manifest.name);

    problems.push(
      ...getImportProblems(entry, directory),
      ...getBundleProblems(entry, directory),
      // Exactly one copy of the core, however many packages build on it.
      ...toProblems(entry.manifest.name, [
        [
          entry.manifest.name !== CORE && getResolvedCore(directory) !== core,
          `resolves ${CORE} to a second copy`,
        ],
      ]),
    );
  }

  writeFileSync(path.join(consumer, "contracts.ts"), CONTRACTS);

  const entries = packed.flatMap(({ manifest }) =>
    Object.keys(manifest.exports ?? {}).map((subpath) =>
      getSpecifier(manifest.name, subpath),
    ),
  );

  writeFileSync(
    path.join(consumer, "entries.ts"),
    `${entries.map((specifier, index) => `import * as entry${index} from ${JSON.stringify(specifier)};`).join("\n")}\n\nexport const entries = [${entries.map((_specifier, index) => `entry${index}`).join(", ")}];\n`,
  );

  process.stdout.write(
    "Typechecking every entry point as a consumer, under Bundler and NodeNext...\n",
  );

  const rootNames = ["contracts.ts", "entries.ts"].map((file) =>
    path.join(consumer, file),
  );

  for (const mode of ["Bundler", "NodeNext"]) {
    problems.push(
      ...getTypecheckProblems(
        consumer,
        rootNames,
        [...installed.values()],
        mode,
      ),
    );
  }

  writeFileSync(path.join(consumer, "conformance.test.ts"), CONFORMANCE);
  writeFileSync(
    path.join(consumer, "vitest.config.mjs"),
    'export default { test: { include: ["conformance.test.ts"], environment: "node" } };\n',
  );

  process.stdout.write(
    "Running the conformance suites from the published testing entry...\n",
  );

  const conformance = run(
    "pnpm",
    ["exec", "vitest", "run", "--config", "vitest.config.mjs"],
    consumer,
  );

  problems.push(
    ...toProblems("The conformance suites", [
      [
        conformance.status !== 0,
        `fail:\n${conformance.stdout}${conformance.stderr}`,
      ],
    ]),
  );

  // The testing entry needs Vitest's runner, so it is typechecked and run under Vitest only.
  const surfaces = Object.fromEntries(
    packed.flatMap(({ manifest, root }) =>
      Object.entries(manifest.exports ?? {}).flatMap(([subpath, target]) => {
        if (subpath === "./testing") {
          return [];
        }

        return [
          [getSpecifier(manifest.name, subpath), getSurface(root, target)],
        ];
      }),
    ),
  );

  writeFileSync(path.join(consumer, "smoke.mjs"), getSmoke(surfaces));
  process.stdout.write("Running the packed packages under plain Node...\n");

  const smoke = run(process.execPath, ["smoke.mjs"], consumer);

  process.stdout.write(smoke.stdout);
  problems.push(
    ...toProblems("The packed packages", [
      [smoke.status !== 0, `fail under Node:\n${smoke.stderr}`],
    ]),
  );

  if (problems.length === 0) {
    rmSync(release, { recursive: true, force: true });
    packed.forEach(stageRelease);
  }
} catch (error) {
  problems.push(error instanceof Error ? error.message : String(error));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

if (problems.length > 0) {
  process.stderr.write(
    `${problems.join("\n")}\n${problems.length} problem(s) in the packed packages.\n`,
  );
  process.exit(1);
}

process.stdout.write(
  `Verified ${packages.length} packages. Release artifacts are in .artifacts/release.\n`,
);

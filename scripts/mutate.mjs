// Mutation checks require a green baseline and restore every changed file.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

// Each mutant is a wrong answer that no crash would reveal: a guard quietly
// removed, a boundary widened. A caught mutant proves a test watches it.
const MUTANTS = [
  {
    file: "packages/core/src/utils/internal/consumers/selectOwner.ts",
    find: "  const candidates = primaries.length > 0 ? primaries : fallbacks;",
    replace: "  const candidates = [...primaries, ...fallbacks];",
    describes: "a fallback competing with the primary that owns an intent",
  },
  {
    file: "packages/core/src/utils/internal/consumers/selectOwner.ts",
    find: "  if (others.length > 0) {",
    replace: "  if (false) {",
    describes: "two owners settled by registration order instead of waiting",
  },
  {
    file: "packages/core/src/utils/internal/inbox/Inbox.ts",
    find: '    if (readiness !== "READY") {',
    replace: "    if (false) {",
    describes: "an owner that is not ready running its intent anyway",
  },
  {
    file: "packages/core/src/utils/internal/inbox/Inbox.ts",
    find: "      record.binding.account.id !== identity.account.id",
    replace: "      false",
    describes: "an account-bound intent running for another account",
  },
  {
    file: "packages/core/src/utils/internal/inbox/Inbox.ts",
    find: '      this.#storage?.durability() === "unconfirmed"',
    replace: "      false",
    describes:
      "a persistent handler running on a lease storage did not confirm",
  },
  {
    file: "packages/core/src/utils/internal/inbox/Inbox.ts",
    find: "      this.#isSelected(attempt) &&\n      this.#invalidateIfStale(attempt) === null",
    replace: "      this.#invalidateIfStale(attempt) === null",
    describes: "an owner made ambiguous during the lease write running anyway",
  },
  {
    file: "packages/core/src/utils/internal/inbox/Inbox.ts",
    find: "      if (record.expiresAt > now) {\n        continue;\n      }",
    replace: "      if (true) {\n        continue;\n      }",
    describes: "an intent past its deadline kept waiting to run",
  },
  {
    file: "packages/core/src/utils/internal/inbox/Inbox.ts",
    find: "    if (known !== undefined) {\n      if (known.fingerprint",
    replace: "    if (false) {\n      if (known.fingerprint",
    describes: "a repeated occurrence admitted as a second intent",
  },
  {
    file: "packages/core/src/utils/internal/inbox/Inbox.ts",
    find: "      if (known.fingerprint !== fingerprint) {",
    replace: "      if (false) {",
    describes:
      "an occurrence reused for another payload taken as its duplicate",
  },
  {
    file: "packages/core/src/utils/internal/execution/Attempt.ts",
    find: "    if (invalidation !== null) {\n      throw getStaleError(invalidation);",
    replace: "    if (false) {\n      throw getStaleError(invalidation);",
    describes: "an invalidated attempt committing its effect",
  },
  {
    file: "packages/core/src/utils/internal/sources/SourceLifetime.ts",
    find: '      if (this.#state !== "ATTACHED") {\n        this.#record(CALLBACK_IGNORED);\n\n        return Promise.resolve(SILENCED);',
    replace:
      "      if (false) {\n        this.#record(CALLBACK_IGNORED);\n\n        return Promise.resolve(SILENCED);",
    describes: "a provider callback after dispose admitted as an intent",
  },
  {
    file: "packages/core/src/utils/internal/url/parseUrl.ts",
    find: '    if (segment === "." || segment === "..") {',
    replace: "    if (false) {",
    describes: "a dot segment moving a route's path",
  },
  {
    file: "packages/core/src/utils/internal/url/parseUrl.ts",
    find: "    if (hasCharacter(segment, isSeparatorCharacter)) {",
    replace: "    if (false) {",
    describes: "an encoded separator smuggled into a route parameter",
  },
  {
    file: "packages/core/src/utils/internal/payload/getCanonicalValue.ts",
    find: "  if (!Array.isArray(value) && !isPlainObject(value)) {",
    replace: "  if (false) {",
    describes: "a class instance accepted as payload data",
  },
  {
    file: "packages/core/src/utils/internal/storage/getRestoredInbox.ts",
    find: '  if (state.state === "leased") {\n    return {',
    replace:
      '  if (state.state === "leased") {\n    return { state: "ADMITTED" };\n    return {',
    describes: "an intent that was running at a restart replayed as unhandled",
  },
  {
    file: "packages/core/src/utils/Junction.ts",
    find: "      timestamp: Math.max(candidate.timestamp, this.#checkpoint),",
    replace: "      timestamp: candidate.timestamp,",
    describes:
      "an observation staged during hydration dated before the stored clock",
  },
  {
    file: "packages/react/src/hooks/useIntent.ts",
    find: "  useLayoutEffect(() => {\n    junction.refresh();\n  });",
    replace: "",
    describes: "a consumer's changed match or ready never evaluated again",
  },
  {
    file: "packages/adapters/react-native/src/linking.ts",
    find: "        const url = (await sdk.getInitialURL()) ?? null;",
    replace: "        const url = await sdk.getInitialURL();",
    describes: "an undefined launch URL read as a link",
  },
  {
    file: "packages/adapters/branch/src/branch.ts",
    find: "      if (event.params[CLICKED_BRANCH_LINK] !== true) {",
    replace: "      if (false) {",
    describes: "an organic open pushed as a clicked Branch link",
  },
  {
    file: "packages/adapters/appsflyer/src/appsFlyer.ts",
    find: '      if (status !== "FOUND") {',
    replace: "      if (false) {",
    describes: "a NOT_FOUND result pushed as a deep link",
  },
  {
    file: "packages/adapters/appsflyer-v6/src/appsFlyer.ts",
    find: '      if (result.deepLinkStatus !== "FOUND") {',
    replace: "      if (false) {",
    describes: "a NOT_FOUND result pushed as a deep link on AppsFlyer 6",
  },
  {
    file: "packages/adapters/expo-notifications/src/utils/getPressObservation.ts",
    find: "  if (!perAction || key.length > INTERACTION_KEY_LENGTH) {",
    replace: "  if (key.length > INTERACTION_KEY_LENGTH) {",
    describes: "every notification press deduplicated without the opt-in",
  },
  {
    file: "packages/adapters/expo-quick-actions/src/quickActions.ts",
    find: "        const action = sdk.initial ?? null;",
    replace: "        const action = sdk.initial;",
    describes: "an undefined launch shortcut read as an action",
  },
  {
    file: "packages/adapters/adjust/src/adjust.ts",
    find: "      sink.push({ input: { url: deeplink }, deferred: true });",
    replace: "      sink.push({ input: { url: deeplink } });",
    describes: "an Adjust deferred link not claimed as deferred",
  },
  {
    file: "packages/adapters/detour/src/utils/constants/detour.ts",
    find: "(deferred|verified|scheme)$/;",
    replace: "(deferred|verified|scheme)/;",
    describes:
      "a link's own linkType parameter taken for the one Detour appends",
  },
  {
    file: "packages/integrations/silo/src/silo.ts",
    find: '    if (status.state === "error") {',
    replace: "    if (false) {",
    describes: "a Silo value that failed to hydrate read as an empty inbox",
  },
];

// The package manager prints its own banner to stdout before the reporter
// does, so the report starts at the first brace rather than at the first byte.
const countFailures = (text) => {
  const start = text.indexOf('{"numTotalTestSuites"');

  if (start === -1) {
    return -1;
  }

  try {
    return JSON.parse(text.slice(start)).numFailedTests ?? -1;
  } catch {
    return -1;
  }
};

const projectOf = (file) => {
  const group = /packages\/(?:adapters|integrations)\/([^/]+)\//.exec(file);

  if (group !== null) {
    return group[1];
  }

  if (file.startsWith("packages/react/")) {
    return "react";
  }

  return "core";
};

// A mutant can turn the scheduler into a loop no test timeout interrupts, so
// each run has a bound of its own. Threads, unlike forked workers, die with
// the runner when the bound kills it.
const RUN_TIMEOUT = 180_000;

// A non-zero exit is the normal case for a caught mutant, so the report on
// stdout decides. Only an unparseable report is a runner failure.
const runTests = (project) => {
  const result = spawnSync(
    "node_modules/.bin/vitest",
    ["run", "--project", project, "--reporter", "json", "--pool", "threads"],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: RUN_TIMEOUT,
      killSignal: "SIGKILL",
    },
  );

  if (result.error?.code === "ETIMEDOUT") {
    return { kind: "hung" };
  }

  return { kind: "report", failures: countFailures(result.stdout ?? "") };
};

// A signal waits for the run in flight, so the mutated file is restored first.
const interruption = { signal: null };

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    interruption.signal = signal;
  });
}

for (const project of new Set(
  MUTANTS.map((mutant) => projectOf(mutant.file)),
)) {
  const run = runTests(project);

  if (run.kind === "hung" || run.failures !== 0) {
    console.error(
      `The ${project} baseline is not green. A mutation run against a red baseline proves nothing. Fix the suite first.`,
    );
    process.exit(1);
  }
}

console.log("Baseline green. Running mutants.\n");

let caught = 0;
let failure = null;
const survivors = [];

for (const mutant of MUTANTS) {
  const path = new URL(mutant.file, `file://${root}`);
  const original = readFileSync(path, "utf8");

  if (!original.includes(mutant.find)) {
    console.error(
      `Mutant is stale, its target text is gone: ${mutant.describes}`,
    );
    process.exit(1);
  }

  try {
    writeFileSync(path, original.replace(mutant.find, mutant.replace));

    const run = runTests(projectOf(mutant.file));

    if (run.kind === "hung") {
      caught += 1;
      console.log(`caught   ${mutant.describes} (the suite hung)`);
      continue;
    }

    const failed = run.failures;

    if (failed > 0) {
      caught += 1;
      console.log(`caught   ${mutant.describes} (${failed} tests went red)`);
      continue;
    }

    // A run that produced no report is a runner failure, never a survivor.
    // It breaks out rather than exiting, since process.exit() skips the
    // finally that restores the file.
    if (failed < 0) {
      failure = `The runner produced no report for: ${mutant.describes}`;
      break;
    }

    survivors.push(mutant.describes);
    console.log(`SURVIVED ${mutant.describes}`);
  } finally {
    writeFileSync(path, original);

    if (interruption.signal !== null) {
      console.error(
        `Stopped by ${interruption.signal}; every file is restored.`,
      );
      process.exit(1);
    }
  }
}

if (failure !== null) {
  console.error(failure);
  process.exit(1);
}

console.log(`\n${caught} of ${MUTANTS.length} mutants caught.`);

if (survivors.length > 0) {
  console.error("\nSurvivors, each either a missing test or dead code:");

  for (const survivor of survivors) {
    console.error(`  ${survivor}`);
  }

  process.exit(1);
}

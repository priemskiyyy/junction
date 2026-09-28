import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import type { TestProjectConfiguration } from "vitest/config";

type ProjectOptions = {
  environment: "node" | "jsdom";
  dedupe: string[];
};

const project = (
  directory: string,
  name: string,
  options: Partial<ProjectOptions> = {},
) =>
  ({
    extends: true,
    resolve: {
      alias: {
        src: fileURLToPath(
          new URL(`./${directory}/${name}/src`, import.meta.url),
        ),
      },
      dedupe: options.dedupe ?? [],
    },
    test: {
      name,
      include: [`${directory}/${name}/src/**/*.test.{ts,tsx}`],
      environment: options.environment ?? "node",
    },
  }) satisfies TestProjectConfiguration;

const exists = (path: string) => existsSync(new URL(path, import.meta.url));

// Every folder with a package.json under these groups is a project without being listed.
const getDiscoveredProjects = (directory: string) => {
  const base = new URL(`./${directory}/`, import.meta.url);

  if (!existsSync(base)) {
    return [];
  }

  return readdirSync(base).flatMap((name) => {
    if (!existsSync(new URL(`${name}/package.json`, base))) {
      return [];
    }

    return [project(directory, name)];
  });
};

const reactProjects: TestProjectConfiguration[] = [
  {
    ...project("packages", "react", {
      environment: "jsdom",
      // A binding must render against the same React instance as the renderer under test.
      dedupe: ["react", "react-dom"],
    }),
    test: {
      name: "react",
      environment: "jsdom",
      include: ["packages/react/src/**/*.test.{ts,tsx}"],
      exclude: ["**/*.server.test.{ts,tsx}"],
    },
  },
  {
    ...project("packages", "react", { dedupe: ["react", "react-dom"] }),
    test: {
      name: "react-ssr",
      environment: "node",
      include: ["packages/react/src/**/*.server.test.{ts,tsx}"],
    },
  },
];

// Every example gets its project here, added only once its directory exists,
// so a later task that adds one never has to edit this file.
const examples: Record<string, TestProjectConfiguration[]> = {
  shared: [
    {
      extends: true,
      test: {
        name: "example-shared",
        include: ["examples/shared/**/*.test.ts"],
      },
    },
  ],
  react: [
    {
      extends: true,
      resolve: {
        alias: {
          src: fileURLToPath(new URL("./examples/react/src", import.meta.url)),
        },
        dedupe: ["react", "react-dom"],
      },
      test: {
        name: "example-react",
        include: ["examples/react/src/**/*.test.{ts,tsx}"],
        environment: "jsdom",
      },
    },
  ],
};

const exampleProjects = Object.entries(examples).flatMap(([name, projects]) => {
  if (!exists(`./examples/${name}/package.json`)) {
    return [];
  }

  return projects;
});

export default defineConfig({
  test: {
    globals: false,
    restoreMocks: true,
    projects: [
      project("packages", "core"),
      ...(exists("./packages/react/package.json") ? reactProjects : []),
      ...getDiscoveredProjects("packages/adapters"),
      ...getDiscoveredProjects("packages/integrations"),
      ...exampleProjects,
    ],
  },
});

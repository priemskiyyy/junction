import { readFileSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const siteUrl = process.env.DOCS_SITE_URL;

const repositoryUrl =
  process.env.DOCS_REPOSITORY_URL ?? "https://github.com/priemskiyyy/junction";

const base =
  process.env.DOCS_BASE_PATH ?? (siteUrl ? new URL(siteUrl).pathname : "/");

const description =
  "Typed application intents from every entry point, for React Native and TypeScript. Links, deferred links, notification presses and quick actions become validated intents, held until the screen that owns them is mounted, ready and signed in to the right account, and run once.";

// llms.txt lists every guide with its description; llms-full.txt inlines them.
const writeLlmsText = async (srcDir: string, outDir: string) => {
  const origin = siteUrl ? siteUrl.replace(/\/$/, "") : base.replace(/\/$/, "");

  const files = (await readdir(srcDir, { recursive: true }))
    .filter((file) => file.endsWith(".md"))
    .filter((file) => !file.startsWith(".vitepress"))
    .filter((file) => file !== "README.md" && file !== "index.md")
    .sort();

  const pages = await Promise.all(
    files.map(async (file) => {
      const path = join(srcDir, file);

      // A source's page includes its package README, so both files carry what it includes.
      const source = (await readFile(path, "utf8")).replace(
        /<!--@include: ([^>]+)-->/g,
        (_, included: string) =>
          readFileSync(resolve(dirname(path), included.trim()), "utf8"),
      );

      const title = source.match(/^# (.+)$/m)?.[1] ?? file;
      const summary = source.match(/^description: "(.+)"$/m)?.[1] ?? "";
      const url = `${origin}/${file.replace(/\.md$/, "")}`;

      return { title, summary, url, source };
    }),
  );

  const index = [
    "# Junction",
    "",
    `> ${description}`,
    "",
    "## Docs",
    "",
    ...pages.map(
      ({ title, summary, url }) => `- [${title}](${url}): ${summary}`,
    ),
    "",
  ].join("\n");

  const full = pages
    .map(({ url, source }) => `<!-- ${url} -->\n${source.trim()}`)
    .join("\n\n---\n\n");

  await writeFile(join(outDir, "llms.txt"), index);
  await writeFile(join(outDir, "llms-full.txt"), `${full}\n`);
};

export default defineConfig({
  base,
  lang: "en-US",
  title: "Junction",
  description,
  head: [
    [
      "link",
      { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` },
    ],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "Junction" }],
    ["meta", { name: "twitter:card", content: "summary" }],
    ["meta", { name: "theme-color", content: "#7c3aed" }],
  ],
  ...(siteUrl ? { sitemap: { hostname: siteUrl } } : {}),
  vite: {
    resolve: {
      alias: { src: fileURLToPath(new URL(".", import.meta.url)) },
    },
  },
  buildEnd: async ({ outDir, srcDir }) => {
    const sitemap = siteUrl
      ? `Sitemap: ${new URL("sitemap.xml", `${siteUrl.replace(/\/$/, "")}/`).href}\n`
      : "";

    await writeFile(
      join(outDir, "robots.txt"),
      `User-agent: *\nAllow: /\n${sitemap}`,
    );
    await writeLlmsText(srcDir, outDir);
  },
  transformHead: ({ pageData }) => {
    const title =
      pageData.title === "Junction"
        ? "Junction"
        : `${pageData.title} | Junction`;

    const head: [string, Record<string, string>][] = [
      ["meta", { property: "og:title", content: title }],
      [
        "meta",
        {
          property: "og:description",
          content: pageData.description || description,
        },
      ],
      ["meta", { name: "twitter:title", content: title }],
      [
        "meta",
        {
          name: "twitter:description",
          content: pageData.description || description,
        },
      ],
    ];

    // Without a site URL the build omits canonical URLs rather than assume a host.
    if (!siteUrl) {
      return head;
    }

    const pagePath = pageData.relativePath
      .replace(/(^|\/)index\.md$/, "$1")
      .replace(/\.md$/, "");

    const url = new URL(pagePath, `${siteUrl.replace(/\/$/, "")}/`).href;

    head.push(
      ["link", { rel: "canonical", href: url }],
      ["meta", { property: "og:url", content: url }],
    );

    return head;
  },
  srcExclude: ["README.md"],
  ignoreDeadLinks: [
    // The Intent Lab is copied into dist/demo after the site builds.
    /^\/demo\//,
  ],
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    socialLinks: repositoryUrl ? [{ icon: "github", link: repositoryUrl }] : [],
    ...(repositoryUrl
      ? {
          editLink: { pattern: `${repositoryUrl}/edit/main/docs/:path` },
        }
      : {}),
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "Sources", link: "/sources" },
      {
        text: "Platforms",
        items: [
          { text: "React", link: "/react" },
          { text: "React Native and Expo", link: "/react-native" },
          { text: "Routers", link: "/routers" },
        ],
      },
      { text: "Intent Lab", link: "/examples" },
      {
        text: "Reference",
        items: [
          { text: "Writing a source", link: "/writing-a-source" },
          { text: "Writing a storage", link: "/writing-a-storage" },
          { text: "Verification matrix", link: "/verification" },
          { text: "Runtime architecture", link: "/internals/architecture" },
        ],
      },
    ],
    sidebar: [
      {
        text: "Start here",
        items: [
          { text: "What Junction is", link: "/" },
          { text: "Getting started", link: "/getting-started" },
          { text: "The model", link: "/mental-model" },
          { text: "The Intent Lab", link: "/examples" },
        ],
      },
      {
        text: "Intents",
        items: [
          { text: "Intents and schemas", link: "/intents" },
          { text: "Sources and routes", link: "/sources-and-routes" },
          { text: "The URL grammar", link: "/url-grammar" },
        ],
      },
      {
        text: "Consumers",
        items: [
          { text: "Local consumers", link: "/consumers" },
          { text: "Ownership and readiness", link: "/ownership-and-readiness" },
          { text: "Execution and outcomes", link: "/execution" },
          { text: "Identity and accounts", link: "/identity" },
          { text: "Delivery and recovery", link: "/delivery-and-recovery" },
          { text: "Persistence", link: "/persistence" },
        ],
      },
      {
        text: "Platforms",
        items: [
          { text: "React", link: "/react" },
          { text: "React Native and Expo", link: "/react-native" },
          { text: "Native configuration", link: "/native-configuration" },
          { text: "Routers", link: "/routers" },
        ],
      },
      {
        text: "Sources",
        items: [
          { text: "Choose a source", link: "/sources" },
          { text: "Linking and Expo Linking", link: "/sources/linking" },
          { text: "Branch", link: "/sources/branch" },
          { text: "AppsFlyer 7", link: "/sources/appsflyer" },
          { text: "AppsFlyer 6", link: "/sources/appsflyer-v6" },
          { text: "Adjust", link: "/sources/adjust" },
          { text: "Detour", link: "/sources/detour" },
          { text: "Expo notifications", link: "/sources/expo-notifications" },
          { text: "Expo quick actions", link: "/sources/expo-quick-actions" },
          { text: "Writing a source", link: "/writing-a-source" },
        ],
      },
      {
        text: "Storage",
        items: [
          { text: "Silo", link: "/storage/silo" },
          { text: "Writing a storage", link: "/writing-a-storage" },
        ],
      },
      {
        text: "Operate",
        items: [
          { text: "Security", link: "/security" },
          { text: "Diagnostics", link: "/diagnostics" },
          { text: "Testing", link: "/testing" },
          { text: "Verification matrix", link: "/verification" },
          { text: "Runtime architecture", link: "/internals/architecture" },
        ],
      },
    ],
    search: { provider: "local" },
    outline: { level: [2, 3] },
    footer: { message: "Released under the MIT License." },
  },
});

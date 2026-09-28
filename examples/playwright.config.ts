import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["lab.spec.ts"],
  outputDir: "../.artifacts/example-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4390",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium" }],
  webServer: {
    command:
      "pnpm --filter example-react --config.verify-deps-before-run=false build && pnpm --filter example-react --config.verify-deps-before-run=false exec vite preview --host 127.0.0.1 --port 4390 --strictPort",
    cwd: "..",
    url: "http://127.0.0.1:4390",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

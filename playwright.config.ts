import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const port = Number(process.env.PORT ?? 3000);
// Sandboxed dev containers ship a pre-installed Chromium; CI installs its own.
const localChromium =
  existsSync("/opt/pw-browsers/chromium") && !process.env.CI
    ? "/opt/pw-browsers/chromium"
    : undefined;

export default defineConfig({
  testDir: "tests",
  // Test accounts are deleted when the run ends (local databases only).
  globalTeardown: "./tests/support/global-teardown.ts",
  // Visual baselines are recorded and compared inside Playwright's Docker image
  // (scripts/visual.sh), because font rasterising differs between machines.
  // SMOKE runs only the after-deploy check against the live site (tests/smoke).
  testMatch: process.env.SMOKE
    ? ["smoke/**/*.spec.ts"]
    : process.env.CI && !process.env.VISUAL
      ? ["e2e/**/*.spec.ts", "a11y/**/*.spec.ts"]
      : ["e2e/**/*.spec.ts", "a11y/**/*.spec.ts", "visual/**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    // BASE_URL runs the suite against a deployed site (e.g. the preview).
    baseURL: process.env.BASE_URL ?? `http://localhost:${port}`,
    trace: "off",
    screenshot: "only-on-failure",
    locale: "en-GB",
    // Fake camera and microphone so voice notes and video can be recorded in tests.
    launchOptions: {
      ...(localChromium ? { executablePath: localChromium } : {}),
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    {
      name: "tablet",
      use: {
        viewport: { width: 834, height: 1194 },
        deviceScaleFactor: 1,
        hasTouch: true,
        browserName: "chromium",
      },
    },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 }, browserName: "chromium" } },
  ],
  webServer:
    process.env.PW_NO_SERVER || process.env.BASE_URL
      ? undefined
      : { command: `pnpm start -p ${port}`, port, reuseExistingServer: true, timeout: 120_000 },
});

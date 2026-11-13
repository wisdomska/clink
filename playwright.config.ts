import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const port = Number(process.env.PORT ?? 3000);
// Sandboxed dev containers ship a pre-installed Chromium; CI installs its own.
const localChromium = existsSync("/opt/pw-browsers/chromium") && !process.env.CI ? "/opt/pw-browsers/chromium" : undefined;

export default defineConfig({
  testDir: "tests",
  testMatch: ["e2e/**/*.spec.ts", "a11y/**/*.spec.ts", "visual/**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "off",
    locale: "en-GB",
    launchOptions: localChromium ? { executablePath: localChromium } : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "tablet", use: { viewport: { width: 834, height: 1194 }, deviceScaleFactor: 1, hasTouch: true, browserName: "chromium" } },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 }, browserName: "chromium" } },
  ],
  webServer: process.env.PW_NO_SERVER
    ? undefined
    : { command: `pnpm start -p ${port}`, port, reuseExistingServer: true, timeout: 120_000 },
});

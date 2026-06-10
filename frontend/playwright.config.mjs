import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "/tmp/ms-playwright";

const isWindows = process.platform === "win32";
const host = process.env.HOST || "127.0.0.1";
const backendPort = process.env.BACKEND_PORT || "8080";
const frontendPort = process.env.FRONTEND_PORT || "4175";
const backendURL = `http://${host}:${backendPort}`;
const frontendURL = process.env.E2E_BASE_URL || `http://${host}:${frontendPort}`;
const apiBaseURL = process.env.API_BASE_URL || `${backendURL}/api`;
const gradleUserHome =
  process.env.GRADLE_USER_HOME ||
  (isWindows ? path.join(os.tmpdir(), "codex-gradle-home") : "/tmp/codex-gradle-home");
const gradleCommand = isWindows
  ? `gradlew.bat --no-daemon bootRun --args=--server.port=${backendPort}`
  : `./gradlew --no-daemon bootRun --args=--server.port=${backendPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: {
    timeout: 10_000
  },
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: frontendURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: gradleCommand,
      cwd: "../backend",
      env: {
        ...process.env,
        GRADLE_USER_HOME: gradleUserHome
      },
      url: `${backendURL}/api/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: "npm run dev",
      env: {
        ...process.env,
        PORT: frontendPort,
        API_BASE_URL: apiBaseURL
      },
      url: frontendURL,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] }
    }
  ]
});

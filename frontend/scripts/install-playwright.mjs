import { spawnSync } from "node:child_process";

process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "/tmp/ms-playwright";

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(executable, ["playwright", "install", "chromium"], {
  env: process.env,
  stdio: "inherit"
});

process.exit(result.status ?? 1);

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");
const isWindows = process.platform === "win32";

const backendPort = process.env.BACKEND_PORT || "8080";
const frontendPort = process.env.FRONTEND_PORT || "4173";
const host = process.env.HOST || "127.0.0.1";
const gradleUserHome =
  process.env.GRADLE_USER_HOME ||
  (isWindows ? path.join(os.tmpdir(), "codex-gradle-home") : "/tmp/codex-gradle-home");

const backendCommand = isWindows ? path.join(backendDir, "gradlew.bat") : path.join(backendDir, "gradlew");
const npmCommand = isWindows ? "npm.cmd" : "npm";

if (!existsSync(backendCommand)) {
  console.error(`Backend launcher not found: ${backendCommand}`);
  process.exit(1);
}

if (!existsSync(path.join(frontendDir, "package.json"))) {
  console.error(`Frontend package.json not found: ${path.join(frontendDir, "package.json")}`);
  process.exit(1);
}

const children = [];
let shuttingDown = false;

function checkPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", (error) => resolve(error));
    server.once("listening", () => {
      server.close(() => resolve(null));
    });
    server.listen(Number(port), host);
  });
}

function prefixOutput(name, stream) {
  let pending = "";
  stream.on("data", (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || "";
    for (const line of lines) {
      if (line.length > 0) {
        console.log(`[${name}] ${line}`);
      }
    }
  });
  stream.on("end", () => {
    if (pending.length > 0) {
      console.log(`[${name}] ${pending}`);
    }
  });
}

function startProcess(name, command, args, cwd, extraEnv) {
  let child;
  try {
    child = spawn(command, args, {
      cwd,
      detached: !isWindows,
      shell: isWindows,
      windowsHide: true,
      env: {
        ...process.env,
        ...extraEnv
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
    return null;
  }

  prefixOutput(name, child.stdout);
  prefixOutput(name, child.stderr);

  child.on("error", (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }
    console.error(`[${name}] exited with code=${code} signal=${signal}`);
    shutdown(code || 1);
  });

  children.push(child);
  return child;
}

function stopChild(child) {
  if (!child.pid || child.killed) {
    return;
  }

  try {
    if (isWindows) {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-child.pid, "SIGTERM");
    }
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      // Process may already be gone.
    }
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    stopChild(child);
  }
  setTimeout(() => process.exit(exitCode), 700).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("exit", () => {
  for (const child of children) {
    stopChild(child);
  }
});

if (backendPort === frontendPort) {
  console.error("BACKEND_PORT and FRONTEND_PORT must be different.");
  process.exit(1);
}

const [backendPortError, frontendPortError] = await Promise.all([checkPort(backendPort), checkPort(frontendPort)]);
const blockedPorts = [
  ["backend", backendPort, backendPortError],
  ["frontend", frontendPort, frontendPortError]
].filter(([, , error]) => error);

if (blockedPorts.length > 0) {
  for (const [name, port, error] of blockedPorts) {
    const reason = error.code === "EADDRINUSE" ? "already in use" : error.message;
    console.error(`${name} port ${host}:${port} is not available: ${reason}`);
  }
  console.error("Use different ports, for example:");
  console.error("  BACKEND_PORT=8081 FRONTEND_PORT=4175 npm run dev");
  process.exit(1);
}

console.log(`Starting backend:  http://${host}:${backendPort}/api`);
console.log(`Starting frontend: http://${host}:${frontendPort}`);
console.log("Press Ctrl+C to stop both servers.");

startProcess(
  "backend",
  backendCommand,
  ["--no-daemon", "bootRun", `--args=--server.port=${backendPort}`],
  backendDir,
  {
    GRADLE_USER_HOME: gradleUserHome
  }
);

startProcess("frontend", npmCommand, ["run", "dev"], frontendDir, {
  PORT: frontendPort,
  API_BASE_URL: `http://${host}:${backendPort}/api`
});

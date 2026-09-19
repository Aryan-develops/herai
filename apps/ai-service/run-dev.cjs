// Cross-platform launcher for `npm run dev:ai` — npm scripts run under cmd.exe
// on Windows, where the previous `[ -d .venv ] || ...` POSIX test silently fails.
const { existsSync } = require("node:fs");
const { execFileSync, spawn } = require("node:child_process");
const path = require("node:path");

const serviceDir = __dirname;
require("dotenv").config({ path: path.resolve(serviceDir, "../../.env") });
const venvDir = path.join(serviceDir, ".venv");
const binDir = process.platform === "win32" ? "Scripts" : "bin";
const pythonExe = process.platform === "win32" ? "python.exe" : "python";
const venvPython = path.join(venvDir, binDir, pythonExe);

if (!existsSync(venvDir)) {
  console.log("[ai-service] creating virtualenv at", venvDir);
  execFileSync("python", ["-m", "venv", venvDir], { stdio: "inherit" });
  execFileSync(venvPython, ["-m", "pip", "install", "-r", path.join(serviceDir, "requirements.txt")], {
    stdio: "inherit",
  });
}

const child = spawn(
  venvPython,
  [
    "-m",
    "uvicorn",
    "app.main:app",
    "--reload",
    "--reload-dir",
    serviceDir,
    "--port",
    process.env.AI_SERVICE_PORT ?? "8000",
    "--app-dir",
    serviceDir,
  ],
  {
    stdio: "inherit",
    // --reload spawns its actual worker via multiprocessing, which on
    // Windows re-execs a fresh interpreter (spawn start method, not fork).
    // Without this, that worker's stdout defaults to block-buffering
    // whenever it isn't attached to a real console (e.g. piped/redirected
    // output for logging) — app-level log.info()/logger.debug() calls can
    // sit in that buffer indefinitely while uvicorn's own access log lines
    // (flushed explicitly by uvicorn itself) still show up, making it look
    // like application logging silently isn't working. PYTHONUNBUFFERED
    // forces unbuffered stdout/stderr for that worker process.
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  }
);
child.on("exit", (code) => process.exit(code ?? 0));

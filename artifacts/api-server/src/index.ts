import app from "./app";
import { logger } from "./lib/logger";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const port = Number(process.env["PORT"]) || 5000;

// The device simulator is a *separate process* that POSTs realistic GPS pings
// over HTTP to this server's ingestion endpoint — the device→network→cloud
// path is exercised for real. It is only auto-started in demo runs; set
// PATHLY_AUTO_SIMULATOR=0 to disable. A single-instance PID lock prevents
// duplicate simulators when the server is restarted rapidly.
function maybeStartDeviceSimulator() {
  if (process.env["PATHLY_AUTO_SIMULATOR"] === "0") return;
  const dataDir = path.resolve(import.meta.dirname ?? process.cwd(), "../data");
  const pidFile = path.join(dataDir, "simulator.pid");
  try {
    const pid = Number(fs.readFileSync(pidFile, "utf8").trim());
    if (Number.isInteger(pid) && pid > 0) {
      try { process.kill(pid, 0); logger.info({ pid }, "Device simulator already running"); return; } catch { /* stale */ }
    }
  } catch { /* no lock */ }
  const script = path.resolve(import.meta.dirname ?? process.cwd(), "../scripts/device-simulator.mjs");
  if (!fs.existsSync(script)) {
    logger.warn("device-simulator.mjs not found — skipping auto-start");
    return;
  }
  logger.info({ script }, "Starting device simulator gateway");
  const child = spawn(process.execPath, [script, "--base", `http://127.0.0.1:${port}`], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  maybeStartDeviceSimulator();
});

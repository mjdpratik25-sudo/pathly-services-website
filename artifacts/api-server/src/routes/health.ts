import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getFieldReportStore } from "../lib/store";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Item 12/14 — component health snapshot (feeds the System Status panel).
router.get("/system/status", (_req, res) => {
  const queueCount = getFieldReportStore().getAll().filter((r) => r.syncStatus !== "synced").length;
  const lastSync = getFieldReportStore()
    .getAll()
    .map((r) => r.serverSyncedAt ?? "")
    .filter(Boolean)
    .sort()
    .pop();
  res.json({
    components: {
      weather: { name: "Weather API", status: "connected" },
      map: { name: "Map API", status: "connected" },
      telemetry: { name: "Telemetry Demo Stream", status: "active" },
      ml: { name: "ML Service", status: "active", version: "model-v1" },
      notifications: { name: "Notification Gateway", status: "sandbox" },
      offlineQueue: { name: "Offline Queue", status: queueCount > 0 ? "pending" : "empty", pending: queueCount },
      lastSync: { name: "Last Sync", status: lastSync ?? "none", timestamp: lastSync ?? null },
    },
    mode: process.env["REQUIRE_AUTH"] === "true" ? "live" : "demo",
  });
});

export default router;

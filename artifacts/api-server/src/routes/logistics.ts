// ============================================================
// NER-SAIL: Master REST API Router for Backend Services
// Live Weather • ML Risk • Route Optimizer • GPS Telemetry • Offline Sync
// ============================================================

import { Router } from "express";
import { fetchLiveNERWeather } from "../services/weatherService";
import { computeDisruptionRiskML } from "../services/mlRiskService";
import { optimizeRouteService } from "../services/routingService";
import { processGPSPing, getAllActiveTelemetry } from "../services/telemetryService";
import { getFieldReportStore } from "../lib/store";
import { getFleetSummary } from "../services/gpsPipeline";
import { alertCountSince, startOfToday } from "../lib/gpsStore";
import { requireAuth, requireRole, type Role } from "../lib/auth";
import { appendAudit } from "../lib/auth";
import { logger } from "../lib/logger";

const logisticsRouter = Router();

// Item 12/13 — all logistics endpoints require authentication.
// In demo mode (REQUIRE_AUTH != 'true'), the middleware synthesizes a
// privileged demo session so the UI continues to function.
logisticsRouter.use(requireAuth);

const CONTROL_ROLES: Role[] = ['admin', 'state_control_room', 'district_officer', 'field_officer'];

// 1. GET /api/logistics/summary
logisticsRouter.get("/logistics/summary", async (_req, res) => {
  try {
    const store = getFieldReportStore();
    const weather = await fetchLiveNERWeather();
    const warnings = weather.filter(w => w.floodWarning || w.landslideWarning).length;
    const liveFleet = getAllActiveTelemetry().length;
    const reports = store.getAll();
    const summary = getFleetSummary();

    res.json({
      success: true,
      platform: "Pathly — Logistics & Route Intelligence Platform",
      version: "1.0.0",
      region: "North Eastern Region (8 States)",
      // Real aggregates from stored telemetry (not hardcoded).
      activeFleet: summary.moving + summary.idle + summary.stopped,
      monitoredDistricts: summary.monitoredDistricts,
      activeWeatherWarnings: warnings,
      reportedIncidents: alertCountSince(startOfToday()),
      offlineVehicles: summary.offline,
      totalDistanceTodayKm: summary.totalDistanceTodayKm,
      sourceBreakdown: summary.sourceBreakdown,
      fleet: summary,
      systemHealth: "Operational",
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /api/logistics/weather/live (Real IMD / Open-Meteo Weather)
logisticsRouter.get("/logistics/weather/live", async (_req, res) => {
  try {
    const data = await fetchLiveNERWeather();
    res.json({
      success: true,
      count: data.length,
      data,
      source: "IMD_OPEN_METEO_GRID",
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/logistics/routes/optimize (Production A* Multi-Corridor Pathfinding)
logisticsRouter.post("/logistics/routes/optimize", requireRole(...CONTROL_ROLES, 'driver'), (req, res) => {
  try {
    const { origin, destination, cargoType, priority, maxWeightTons } = req.body;
    if (!origin || !destination) {
      res.status(400).json({ success: false, error: "Origin and Destination are required" });
      return;
    }

    const routes = optimizeRouteService({
      origin: String(origin),
      destination: String(destination),
      cargoType: String(cargoType || 'medicines'),
      priority: String(priority || 'normal'),
      maxWeightTons: maxWeightTons ? Number(maxWeightTons) : undefined,
    });

    res.json({
      success: true,
      origin,
      destination,
      computedAt: new Date().toISOString(),
      routesCount: routes.length,
      routes
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/logistics/risk/predict (Trained ML Disruption Classifier)
logisticsRouter.post("/logistics/risk/predict", requireRole(...CONTROL_ROLES), (req, res) => {
  try {
    const { districtName, rainfallMm24h, humidity, elevationM, terrainType, roadCondition, bridgeCount } = req.body;

    const prediction = computeDisruptionRiskML({
      districtName: String(districtName || "Guwahati"),
      rainfallMm24h: Number(rainfallMm24h || 40),
      humidity: Number(humidity || 80),
      elevationM: Number(elevationM || 150),
      terrainType: (terrainType as any) || "mountains",
      historicalRiskScore: 40,
      bridgeCount: Number(bridgeCount || 4),
      roadCondition: Number(roadCondition || 80),
    });

    res.json({
      success: true,
      prediction,
      evaluatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST /api/telemetry/ping (Hardware GPS Tracker Ingestion / AIS-140)
logisticsRouter.post("/telemetry/ping", requireRole(...CONTROL_ROLES, 'driver', 'field_officer'), (req, res) => {
  try {
    const payload = req.body;
    const response = processGPSPing(payload);
    res.status(200).json(response);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 6. GET /api/telemetry/live (Live Stream of Tracked Vehicles)
logisticsRouter.get("/telemetry/live", (_req, res) => {
  const telemetry = getAllActiveTelemetry();
  res.json({
    success: true,
    count: telemetry.length,
    data: telemetry,
    timestamp: new Date().toISOString()
  });
});

// 7. POST /api/field-reports/sync (Offline Sync Queue Ingestion & Merge)
// Server-side last-writer-wins conflict resolution: when the same report id
// arrives twice, the version with the later `updatedAt` wins; ties keep the
// stored (already-synced) record and mark the duplicate as rejected.
logisticsRouter.post("/field-reports/sync", requireRole(...CONTROL_ROLES), async (req, res) => {
  try {
    const { reports } = req.body;
    if (!Array.isArray(reports)) {
      res.status(400).json({ success: false, error: "reports array is required" });
      return;
    }

    const store = getFieldReportStore();
    const existing = store.getAll();
    const now = new Date().toISOString();
    const serverMap = new Map<string, any>();
    for (const r of existing) serverMap.set(r.id, r);

    const accepted: string[] = [];
    const conflicts: string[] = [];

    for (const incoming of reports) {
      if (!incoming?.id) continue;
      const stored = serverMap.get(incoming.id);
      const inTime = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
      const exTime = stored?.updatedAt ? new Date(stored.updatedAt).getTime() : 0;

      if (stored && exTime >= inTime) {
        conflicts.push(incoming.id);
        serverMap.set(incoming.id, { ...incoming, ...stored, serverSyncedAt: now, syncStatus: "synced" });
        continue;
      }
      accepted.push(incoming.id);
      serverMap.set(incoming.id, { ...stored, ...incoming, serverSyncedAt: now, syncStatus: "synced" });
    }

    store.upsertAll(Array.from(serverMap.values()));

    appendAudit({
      action: 'field_reports_sync',
      ip: req.ip,
      detail: `${accepted.length} accepted, ${conflicts.length} conflicts`,
    });

    res.json({
      success: true,
      syncedCount: accepted.length,
      conflicts: conflicts.length,
      serverSyncedIds: accepted,
      totalStored: serverMap.size,
      message: conflicts.length
        ? `Offline batch merged (${accepted.length} accepted, ${conflicts.length} duplicate/conflict retained from server).`
        : "Offline batch synchronized and verified successfully."
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GET /api/field-reports (server canonical report history)
logisticsRouter.get("/field-reports", requireRole(...CONTROL_ROLES), (_req, res) => {
  const reports = getFieldReportStore().getAll();
  res.json({
    success: true,
    count: reports.length,
    reports: reports.slice().reverse().slice(0, 200),
    timestamp: new Date().toISOString()
  });
});

// 9. GET /api/field-reports/stats (analytics for the field-capacity dashboard)
logisticsRouter.get("/field-reports/stats", requireRole('admin', 'state_control_room'), (_req, res) => {
  const all = getFieldReportStore().getAll();
  const byCategory: Record<string, number> = {};
  const byState: Record<string, number> = {};
  for (const r of all) {
    const cat = (r.category || "unknown") as string;
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    const st = (r.state || "unknown") as string;
    byState[st] = (byState[st] || 0) + 1;
  }
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const last24h = all.filter((r) => {
    const t = r.updatedAt || r.serverSyncedAt;
    return t && new Date(t).getTime() >= cutoff;
  }).length;
  const resolved = all.filter((r) => r.status === "resolved").length;
  const pending = all.filter((r) => r.syncStatus === "pending").length;

  res.json({
    success: true,
    total: all.length,
    byCategory,
    byState,
    last24h,
    pending,
    resolutionRate: all.length ? Math.round((resolved / all.length) * 100) : 0,
    timestamp: new Date().toISOString()
  });
});

// 10. GET /api/logistics/incidents (corridor incidents surfaced from reports + telemetry)
logisticsRouter.get("/logistics/incidents", (_req, res) => {
  const all = getFieldReportStore().getAll();
  const incidents = all
    .filter((r) => r.status === "submitted" || r.status === "reviewed")
    .map((r) => ({
      id: r.id,
      title: r.title || r.category,
      category: r.category,
      district: r.district,
      state: r.state,
      lat: r.lat,
      lng: r.lng,
      status: r.status,
      reportedAt: r.updatedAt || r.serverSyncedAt,
    }));
  res.json({ success: true, count: incidents.length, incidents, timestamp: new Date().toISOString() });
});

export default logisticsRouter;
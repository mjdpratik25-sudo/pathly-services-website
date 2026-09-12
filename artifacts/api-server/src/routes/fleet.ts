// ============================================================
// fleetRouter — real GPS telemetry + fleet API
// ------------------------------------------------------------
//   POST /api/telemetry/location          → device ingestion endpoint
//   GET  /api/fleet/vehicles              → per-vehicle live state
//   GET  /api/fleet/summary               → aggregate fleet summary
//   GET  /api/fleet/alerts                → generated telemetry alerts
//   GET  /api/vehicles/:id/location       → current position
//   GET  /api/vehicles/:id/history        → route/trip polyline
//   GET  /api/vehicles/:id/trips          → derived trips
//   GET  /api/vehicles/:id/stops          → derived stops
//   GET  /api/vehicles/:id/alerts         → per-vehicle alerts
// ============================================================

import { Router } from "express";
import { requireAuth, requireRole, type Role } from "../lib/auth";
import {
  validateLocationPing,
  ingestLocationPing,
  getFleetVehicles,
  getFleetSummary,
  getFleetAlerts,
  getActiveFleetAlerts,
  getVehicleLiveState,
  getVehicleHistory,
  getVehicleTrips,
  getVehicleStops,
  getVehicleAlerts,
} from "../services/gpsPipeline";

const fleetRouter = Router();
fleetRouter.use(requireAuth);

const CONTROL_ROLES: readonly Role[] = ['admin', 'state_control_room', 'district_officer', 'field_officer'];

// POST /api/telemetry/location — the "device → mobile network → cloud" hop.
fleetRouter.post("/telemetry/location", (req, res) => {
  try {
    const ping = validateLocationPing(req.body);
    const result = ingestLocationPing(ping);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/fleet/vehicles — live state for the existing Fleet Tracking screen.
fleetRouter.get("/fleet/vehicles", (_req, res) => {
  res.json({ success: true, count: getFleetVehicles().length, vehicles: getFleetVehicles(), timestamp: new Date().toISOString() });
});

// GET /api/fleet/summary — real aggregates from stored pings.
fleetRouter.get("/fleet/summary", (_req, res) => {
  res.json({ success: true, ...getFleetSummary() });
});

// GET /api/fleet/alerts — actively generated telemetry alerts (live + recent).
fleetRouter.get("/fleet/alerts", (req, res) => {
  const rawLimit = req.query.limit;
  const limit = Number(Array.isArray(rawLimit) ? rawLimit[0] : rawLimit) || 100;
  const activeOnly = req.query.active === 'true';
  res.json({
    success: true,
    count: activeOnly ? getActiveFleetAlerts(limit).length : getFleetAlerts(limit).length,
    alerts: activeOnly ? getActiveFleetAlerts(limit) : getFleetAlerts(limit),
  });
});

// GET /api/vehicles/:id/location — current position + derived status.
fleetRouter.get("/vehicles/:id/location", (req, res) => {
  const state = getVehicleLiveState(req.params.id);
  if (!state) {
    res.status(404).json({ success: false, error: `Unknown vehicle "${req.params.id}"` });
    return;
  }
  res.json({
    success: true,
    location: { lat: state.currentLat, lng: state.currentLng, speed: state.speed, heading: state.heading },
    telemetryStatus: state.telemetryStatus,
    status: state.status,
    signalAgeMs: state.signalAgeMs,
    source: state.source,
    sourceLabel: state.sourceLabel,
    distanceTodayKm: state.distanceTodayKm,
    currentTrip: state.currentTrip,
  });
});

// GET /api/vehicles/:id/history?from=&to= — route polyline from stored pings.
fleetRouter.get("/vehicles/:id/history", requireRole(...CONTROL_ROLES), (req, res) => {
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;
  const rawLimit = req.query.limit;
  const limit = Number(Array.isArray(rawLimit) ? rawLimit[0] : rawLimit) || 1000;
  const points = getVehicleHistory(String(req.params.id), from, to, limit);
  res.json({ success: true, count: points.length, vehicleId: req.params.id, points });
});

// GET /api/vehicles/:id/trips — derived trips for the vehicle.
fleetRouter.get("/vehicles/:id/trips", requireRole(...CONTROL_ROLES), (req, res) => {
  const trips = getVehicleTrips(String(req.params.id));
  res.json({ success: true, count: trips.length, vehicleId: req.params.id, trips });
});

// GET /api/vehicles/:id/stops — derived stop/idle events.
fleetRouter.get("/vehicles/:id/stops", requireRole(...CONTROL_ROLES), (req, res) => {
  const stops = getVehicleStops(String(req.params.id));
  res.json({ success: true, count: stops.length, vehicleId: req.params.id, stops });
});

// GET /api/vehicles/:id/alerts — telemetry alerts for the vehicle.
fleetRouter.get("/vehicles/:id/alerts", (req, res) => {
  const alerts = getVehicleAlerts(req.params.id);
  res.json({ success: true, count: alerts.length, vehicleId: req.params.id, alerts });
});

export default fleetRouter;
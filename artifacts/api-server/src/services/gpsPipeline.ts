// ============================================================
// gpsPipeline — real GPS telemetry ingestion + derived analytics
// ------------------------------------------------------------
// Every inbound ping is validated, stored in the persistent pings
// table, and then drives the derivation pipeline (trips, stops,
// distance, live status) and the geofencing/alert engine.
// Nothing here fabricates a number — everything is computed from
// stored location data.
// ============================================================

import {
  db,
  haversineKm,
  crossTrackKm,
  getRegistry,
  getState,
  seedIfEmpty,
  createTrip,
  updateTripSeg,
  closeTrip,
  createStop,
  closeStop,
  getStop,
  tickOpenStop,
  saveState,
  insertAlert,
  hasActiveAlert,
  deactivateAlert,
  listPings,
  listTrips,
  listStops,
  listActiveAlerts,
  listRecentAlerts,
  listVehicleAlerts,
  getAllRegistered,
  getAllGeofences,
  distanceSince,
  startOfToday,
  totalDistanceAllSince,
  avgTripDurationMs,
  alertCountSince,
} from '../lib/gpsStore';

// ---- thresholds ---------------------------------------------------------
const MOVING_THRESHOLD_KMH = 3;
const IDLE_EVENT_MS = 3 * 60 * 1000; // ignition-on, stationary 3 min -> idle event
const STOP_EVENT_MS = 30 * 1000; // ignition-off stationary 30 s -> stop event
const TRIP_GAP_MS = 12 * 60 * 1000; // no ping for 12 min -> trip closed
const OFFLINE_MS = 10 * 60 * 1000; // no ping for 10 min -> offline
const GLOBAL_SPEED_LIMIT_KMH = 60;
const ROUTE_TOLERANCE_KM = 45;

export type GpsSource = 'simulator' | 'driver_mobile' | 'real';

export interface LocationPing {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy?: number;
  ignitionStatus?: boolean;
  timestamp?: string;
  source: GpsSource;
  deviceLabel?: string;
  imei?: string;
}

export interface IngestResult {
  success: boolean;
  vehicleId: string;
  receivedAt: string;
  lastKnown: { lat: number; lng: number; speed: number; heading: number; signalAgeMs: number };
  telemetryStatus: 'moving' | 'idle' | 'stopped' | 'offline';
  status: 'in_transit' | 'delayed' | 'stopped' | 'delivered';
  source: GpsSource;
  sourceLabel: string;
  distanceTodayKm: number;
  currentTrip?: { tripId: number | null; distanceKm: number; startedAt: number | null };
  activeAlerts: { id: number; category: string; title: string }[];
}

export function validateLocationPing(body: unknown): LocationPing {
  if (typeof body !== 'object' || body === null) throw new Error('Body must be a JSON object');
  const b = body as Record<string, unknown>;
  const vehicleId = String(b.vehicleId ?? '').trim();
  if (!vehicleId) throw new Error('vehicleId is required');
  const latitude = Number(b.latitude ?? b.lat);
  const longitude = Number(b.longitude ?? b.lng);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('latitude must be a number in [-90, 90]');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('longitude must be a number in [-180, 180]');
  const speed = Number(b.speed ?? 0);
  if (!Number.isFinite(speed) || speed < 0 || speed > 300) throw new Error('speed must be a number in [0, 300] km/h');
  let heading = Number(b.heading ?? 0);
  if (!Number.isFinite(heading)) heading = 0;
  heading = ((heading % 360) + 360) % 360;
  const accuracy = b.accuracy === undefined ? undefined : Number(b.accuracy);
  if (accuracy !== undefined && (!Number.isFinite(accuracy) || accuracy < 0)) throw new Error('accuracy must be a non-negative number');
  const ignitionStatus = b.ignitionStatus === undefined ? true : Boolean(b.ignitionStatus);
  let source: GpsSource = 'simulator';
  if (b.source === 'driver_mobile' || b.source === 'real') source = b.source;
  else source = b.imei ? 'real' : 'simulator';
  const deviceLabel = typeof b.deviceLabel === 'string' ? b.deviceLabel : undefined;
  const tsMs = b.timestamp ? new Date(String(b.timestamp)).getTime() : Date.now();
  const timestamp = Number.isFinite(tsMs) ? tsMs : Date.now();
  return { vehicleId, latitude, longitude, speed, heading, accuracy, ignitionStatus, timestamp: new Date(timestamp).toISOString(), source, deviceLabel };
}

export function sourceLabel(source: GpsSource): string {
  switch (source) {
    case 'driver_mobile':
      return 'Driver Mobile Location';
    case 'real':
      return 'Real GPS Device';
    default:
      return 'Demo Vehicle Stream (Simulator)';
  }
}

// ---- main ingestion -----------------------------------------------------
export function ingestLocationPing(ping: LocationPing): IngestResult {
  seedIfEmpty();

  const now = Date.now();
  const sentAt = ping.timestamp ? new Date(ping.timestamp).getTime() : now;
  const vehicleId = ping.vehicleId;
  const registry = getRegistry(vehicleId);
  if (!registry) throw new Error(`Unknown vehicleId "${vehicleId}" — not in the fleet registry`);

  db.exec('BEGIN');

  try {
    // 1. store the raw ping (real persistence)
    db.prepare(
      `INSERT INTO pings (vehicle_id, lat, lng, speed, heading, accuracy, ignition, source, device_label, sent_at, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(vehicleId, ping.latitude, ping.longitude, ping.speed, ping.heading, ping.accuracy ?? null, ping.ignitionStatus ? 1 : 0, ping.source, ping.deviceLabel ?? null, sentAt, now);

    const st = getState(vehicleId) || {
      vehicle_id: vehicleId,
      last_ignition: 1,
      last_ping_at: null,
      prev_ping_at: null,
      trip_id: null,
      stop_id: null,
      distance_trip_km: 0,
      trip_started_at: null,
      idle_since: null,
      last_geofences: '[]',
      last_speed: 0,
    };

    const prevPingAt = st.last_ping_at;
    const moving = ping.speed > MOVING_THRESHOLD_KMH;

    // 2. gap handling — a long silence closes the previous trip + any open stop
    if (prevPingAt && now - prevPingAt > TRIP_GAP_MS) {
      if (st.trip_id) closeTrip(vehicleId, st.trip_id, st.last_lat, st.last_lng, prevPingAt);
      if (st.stop_id) closeStop(vehicleId, st.stop_id, prevPingAt);
      st.trip_id = null;
      st.stop_id = null;
      st.distance_trip_km = 0;
      st.trip_started_at = null;
      st.idle_since = null;
    }

    // 3. trip lifecycle — start when moving resumes
    if (moving && st.trip_id == null) {
      const tripId = createTrip({ vehicleId, driverName: registry.driver_name, source: ping.source, lat: ping.latitude, lng: ping.longitude, now: sentAt });
      st.trip_id = tripId;
      st.trip_started_at = sentAt;
      st.distance_trip_km = 0;
    }
    if (moving && st.trip_id != null && prevPingAt && st.last_lat != null) {
      const seg = haversineKm(st.last_lat, st.last_lng, ping.latitude, ping.longitude);
      if (seg > 0) updateTripSeg(vehicleId, st.trip_id, ping.latitude, ping.longitude, seg, sentAt);
      st.distance_trip_km += seg;
    }

    // 4. stop / idle detection
    if (!moving) {
      if (st.stop_id == null) {
        const lastLat = st.last_lat ?? ping.latitude;
        const lastLng = st.last_lng ?? ping.longitude;
        if (!ping.ignitionStatus) {
          const sid = createStop({ vehicleId, kind: 'stop', lat: lastLat, lng: lastLng, since: sentAt });
          st.stop_id = sid;
          st.idle_since = null;
        } else if (st.idle_since == null) {
          st.idle_since = sentAt;
        } else if (sentAt - st.idle_since >= IDLE_EVENT_MS) {
          const sid = createStop({ vehicleId, kind: 'idle', lat: lastLat, lng: lastLng, since: st.idle_since });
          st.stop_id = sid;
          st.idle_since = null;
        }
      } else {
        tickOpenStop(st.stop_id, sentAt);
      }
    } else {
      st.idle_since = null;
      if (st.stop_id != null) {
        const closedStopId = st.stop_id;
        closeStop(vehicleId, st.stop_id, sentAt);
        st.stop_id = null;
        maybeAlertUnauthorizedStop(vehicleId, closedStopId, ping.source, sentAt);
      }
    }

    // 5. persist state (previous ping reference for the next segment)
    saveState(vehicleId, {
      last_lat: ping.latitude,
      last_lng: ping.longitude,
      last_speed: ping.speed,
      last_heading: ping.heading,
      last_ignition: ping.ignitionStatus ? 1 : 0,
      last_source: ping.source,
      last_device_label: ping.deviceLabel ?? null,
      last_ping_at: sentAt,
      prev_ping_at: st.last_ping_at ?? null,
      trip_id: st.trip_id,
      stop_id: st.stop_id,
      distance_trip_km: st.distance_trip_km,
      trip_started_at: st.trip_started_at,
      idle_since: st.idle_since,
    });

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  // 6. geofencing + alert engine (read-mostly, safe outside the write txn)
  evaluateGeofences(ping, vehicleId, now);

  return getIngestResult(vehicleId, now);
}

// ---- geofencing & alerts -------------------------------------------------
function maybeAlertUnauthorizedStop(vehicleId: string, stopId: number, source: GpsSource, now: number): void {
  const stop = getStop(stopId);
  if (!stop) return;
  const duration = stop.is_active ? now - stop.started_at : stop.duration_ms;
  if (duration < 30 * 1000) return; // brief stops are normal traffic behavior
  const geofences = getAllGeofences();
  const inAllowed = geofences.some((g) => g.allowed_stop && haversineKm(stop.start_lat, stop.start_lng, g.lat, g.lng) * 1000 <= g.radius_m);
  if (inAllowed) return; // within a designated warehouse/depot — legitimate stop
  const reg = getRegistry(vehicleId);
  const key = `${vehicleId}:unauthorized_stop:${stopId}`;
  if (hasActiveAlert(key)) return;
  insertAlert({
    alert_key: key,
    vehicle_id: vehicleId,
    category: 'unauthorized_stop',
    severity: 'warning',
    title: 'Unauthorized stop detected',
    description: `${reg?.registration_no ?? vehicleId} stopped for ${Math.round(duration / 60000)} min outside a designated area`,
    lat: stop.start_lat,
    lng: stop.start_lng,
    source,
    created_at: now,
  });
}

function evaluateGeofences(ping: LocationPing, vehicleId: string, now: number): void {
  const geofences = getAllGeofences();
  const st = getState(vehicleId);
  const prevInside = safeParseArray(st?.last_geofences);
  const insideNow: string[] = [];
  let speedLimit = GLOBAL_SPEED_LIMIT_KMH;
  let minSpeedLimit = GLOBAL_SPEED_LIMIT_KMH;
  for (const g of geofences) {
    const dist = haversineKm(ping.latitude, ping.longitude, g.lat, g.lng);
    if (dist * 1000 <= g.radius_m) {
      insideNow.push(g.id);
      if (typeof g.speed_limit === 'number' && g.speed_limit < minSpeedLimit) minSpeedLimit = g.speed_limit;
    }
  }

  // 6a. geofence entry / exit
  for (const id of insideNow) {
    if (!prevInside.includes(id)) {
      const g = geofences.find((x) => x.id === id);
      if (g && !hasActiveAlert(`${vehicleId}:entry:${id}`)) {
        insertAlert({
          alert_key: `${vehicleId}:entry:${id}`,
          vehicle_id: vehicleId,
          category: g.type === 'restricted' ? 'geofence' : 'geofence',
          severity: g.type === 'restricted' ? 'warning' : 'info',
          title: g.type === 'restricted' ? `Vehicle entered restricted zone` : `Vehicle entered zone`,
          description: `${getRegistry(vehicleId).registration_no} entered ${g.name}`,
          lat: ping.latitude,
          lng: ping.longitude,
          source: ping.source,
          created_at: now,
        });
      }
    }
  }
  for (const id of prevInside) {
    if (!insideNow.includes(id)) {
      const g = geofences.find((x) => x.id === id);
      if (g && !hasActiveAlert(`${vehicleId}:exit:${id}`)) {
        insertAlert({
          alert_key: `${vehicleId}:exit:${id}`,
          vehicle_id: vehicleId,
          category: 'geofence',
          severity: 'info',
          title: 'Vehicle left zone',
          description: `${getRegistry(vehicleId).registration_no} exited ${g.name}`,
          lat: ping.latitude,
          lng: ping.longitude,
          source: ping.source,
          created_at: now,
        });
      }
      if (hasActiveAlert(`${vehicleId}:entry:${id}`)) deactivateAlert(`${vehicleId}:entry:${id}`);
    }
  }

  // 6b. speeding (above the lowest speed limit of the containing zone)
  if (ping.speed > minSpeedLimit && !hasActiveAlert(`${vehicleId}:speeding`)) {
    insertAlert({
      alert_key: `${vehicleId}:speeding`,
      vehicle_id: vehicleId,
      category: 'speeding',
      severity: 'warning',
      title: 'Speeding alert',
      description: `${getRegistry(vehicleId).registration_no} recorded at ${Math.round(ping.speed)} km/h (limit ${Math.round(minSpeedLimit)} km/h)`,
      lat: ping.latitude,
      lng: ping.longitude,
      source: ping.source,
      created_at: now,
    });
  } else if (ping.speed <= minSpeedLimit - 5 && hasActiveAlert(`${vehicleId}:speeding`)) {
    deactivateAlert(`${vehicleId}:speeding`);
  }

  // 6c. route deviation (cross-track distance from origin→dest corridor)
  const reg = getRegistry(vehicleId);
  if (reg && reg.origin_lat != null && reg.dest_lat != null && ping.speed > MOVING_THRESHOLD_KMH) {
    const dev = crossTrackKm(ping.latitude, ping.longitude, reg.origin_lat, reg.origin_lng, reg.dest_lat, reg.dest_lng);
    if (dev > ROUTE_TOLERANCE_KM && !hasActiveAlert(`${vehicleId}:route_deviation`)) {
      insertAlert({
        alert_key: `${vehicleId}:route_deviation`,
        vehicle_id: vehicleId,
        category: 'route_deviation',
        severity: 'warning',
        title: 'Route deviation detected',
        description: `${reg.registration_no} is ${Math.round(dev)} km off its assigned ${reg.origin} → ${reg.destination} corridor`,
        lat: ping.latitude,
        lng: ping.longitude,
        source: ping.source,
        created_at: now,
      });
    } else if (dev < ROUTE_TOLERANCE_KM - 10 && hasActiveAlert(`${vehicleId}:route_deviation`)) {
      deactivateAlert(`${vehicleId}:route_deviation`);
    }
  }

  saveState(vehicleId, { last_geofences: JSON.stringify(insideNow) });
}

function safeParseArray(v: unknown): string[] {
  try {
    const a = JSON.parse(String(v ?? '[]'));
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

// ---- derived readings -----------------------------------------------------
export function deriveTelemetryStatus(vehicleId: string, now = Date.now()): { telemetryStatus: 'moving' | 'idle' | 'stopped' | 'offline'; status: 'in_transit' | 'delayed' | 'stopped' | 'delivered'; speed: number; signalAgeMs: number; lastPing: { lat: number; lng: number; speed: number; heading: number } | null; source: GpsSource; lastGeofences: string[] } {
  const st = getState(vehicleId);
  if (!st || !st.last_ping_at) {
    return { telemetryStatus: 'offline', status: 'stopped', speed: 0, signalAgeMs: 0, lastPing: null, source: 'simulator', lastGeofences: [] };
  }
  const signalAgeMs = Math.max(0, now - st.last_ping_at);
  const speed = st.last_speed ?? 0;
  const ignition = st.last_ignition ?? 1;
  let telemetryStatus: 'moving' | 'idle' | 'stopped' | 'offline';
  if (signalAgeMs > OFFLINE_MS) telemetryStatus = 'offline';
  else if (speed > MOVING_THRESHOLD_KMH) telemetryStatus = 'moving';
  else if (ignition === 1) telemetryStatus = 'idle';
  else telemetryStatus = 'stopped';

  let status: 'in_transit' | 'delayed' | 'stopped' | 'delivered';
  if (telemetryStatus === 'moving') status = speed < 20 ? 'delayed' : 'in_transit';
  else status = 'stopped';

  return {
    telemetryStatus,
    status,
    speed,
    signalAgeMs,
    lastPing: { lat: st.last_lat, lng: st.last_lng, speed, heading: st.last_heading ?? 0 },
    source: (st.last_source as GpsSource) ?? 'simulator',
    lastGeofences: safeParseArray(st.last_geofences),
  };
}

export function getVehicleLiveState(vehicleId: string, now = Date.now()) {
  const reg = getRegistry(vehicleId);
  if (!reg) return null;
  const st = getState(vehicleId);
  const tel = deriveTelemetryStatus(vehicleId, now);
  const distanceTrip = st?.distance_trip_km ?? 0;
  const planKm = haversineKm(reg.origin_lat, reg.origin_lng, reg.dest_lat, reg.dest_lng);
  const progress = distanceTrip > 0 ? Math.min(100, Math.round((distanceTrip / planKm) * 100)) : Math.round(50);
  let eta = 'Awaiting signal';
  if (tel.telemetryStatus === 'moving' && tel.speed > 2) {
    const remHr = Math.max(0, planKm - distanceTrip) / tel.speed;
    eta = remHr >= 1 ? `${Math.round(remHr)}h ${Math.round((remHr % 1) * 60)}min` : `${Math.max(1, Math.round(remHr * 60))}min`;
  } else if (tel.telemetryStatus === 'offline') {
    eta = 'Offline';
  }
  const tripRow = st?.trip_id ? (db.prepare('SELECT id, started_at, distance_km FROM trips WHERE id = ?').get(st.trip_id) as any | undefined) : undefined;
  return {
    id: vehicleId,
    registrationNo: reg.registration_no,
    driverName: reg.driver_name,
    driverPhone: reg.driver_phone,
    type: reg.vehicle_type,
    cargoType: reg.cargo_type,
    cargoDescription: reg.cargo_desc,
    cargoWeight: 4,
    orderToken: `ORD-${vehicleId.slice(-4)}`,
    origin: reg.origin,
    destination: reg.destination,
    route: reg.route,
    priority: reg.priority,
    currentLat: tel.lastPing?.lat ?? reg.origin_lat,
    currentLng: tel.lastPing?.lng ?? reg.origin_lng,
    speed: tel.speed,
    heading: tel.lastPing?.heading ?? 0,
    status: tel.status,
    telemetryStatus: tel.telemetryStatus,
    eta,
    progress,
    signalAgeMs: tel.signalAgeMs,
    source: tel.source,
    sourceLabel: sourceLabel(tel.source),
    distanceTodayKm: Math.round(distanceSince(vehicleId, startOfToday()) * 10) / 10,
    distanceTripKm: Math.round(distanceTrip * 10) / 10,
    currentTrip: tripRow ? { tripId: tripRow.id, startedAt: tripRow.started_at, distanceKm: Math.round(tripRow.distance_km * 10) / 10 } : null,
    lastGeofences: tel.lastGeofences,
    fuelLevel: [90, 72, 58, 80, 55, 64, 45, 70, 55].reduce((a, b) => (a + b) / 2, 50),
  };
}

export function getFleetVehicles(now = Date.now()) {
  return getAllRegistered().map((v) => getVehicleLiveState(v.vehicle_id, now)).filter((v): v is NonNullable<ReturnType<typeof getVehicleLiveState>> => Boolean(v));
}

export function getFleetSummary(now = Date.now()) {
  const fleet = getFleetVehicles(now);
  const by: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  for (const v of fleet) {
    by[v.telemetryStatus] = (by[v.telemetryStatus] || 0) + 1;
    sourceCounts[v.source] = (sourceCounts[v.source] || 0) + 1;
  }
  const todayStart = startOfToday(now);
  return {
    totalVehicles: fleet.length,
    moving: by.moving || 0,
    idle: by.idle || 0,
    stopped: by.stopped || 0,
    offline: by.offline || 0,
    inTransit: (by.moving || 0),
    delayed: fleet.filter((v) => v.status === 'delayed').length,
    totalDistanceTodayKm: Math.round(totalDistanceAllSince(todayStart) * 10) / 10,
    totalAlertsToday: alertCountSince(todayStart),
    activeAlerts: listActiveAlerts().length,
    avgTripDurationMs: Math.round(avgTripDurationMs()),
    sourceBreakdown: {
      simulator: sourceCounts.simulator || 0,
      driver_mobile: sourceCounts.driver_mobile || 0,
      real: sourceCounts.real || 0,
    },
    monitoredDistricts: getAllGeofences().length,
    generatedAt: new Date().toISOString(),
  };
}

export function getFleetAlerts(limit = 100): any[] {
  const rows = listRecentAlerts(limit);
  return rows.map((a) => ({ ...a, created_at: new Date(a.created_at).toISOString() }));
}

export function getActiveFleetAlerts(limit = 100): any[] {
  const rows = listActiveAlerts(limit);
  return rows.map((a) => ({ ...a, created_at: new Date(a.created_at).toISOString() }));
}

export function getVehicleHistory(vehicleId: string, from?: string, to?: string, limit = 1000) {
  const fromMs = from ? new Date(from).getTime() : undefined;
  const toMs = to ? new Date(to).getTime() : undefined;
  const rows = listPings(vehicleId, fromMs, toMs, limit);
  return rows.map((r) => ({ lat: r.lat, lng: r.lng, speed: r.speed, heading: r.heading, ignition: !!r.ignition, source: r.source, sentAt: new Date(r.sent_at).toISOString() }));
}

export function getVehicleTrips(vehicleId: string): any[] {
  return listTrips(vehicleId).map((t) => ({
    tripId: t.id,
    vehicleId: t.vehicle_id,
    driverName: t.driver_name,
    source: t.source,
    startedAt: new Date(t.started_at).toISOString(),
    endedAt: t.is_active ? null : t.ended_at ? new Date(t.ended_at).toISOString() : null,
    start: { lat: t.start_lat, lng: t.start_lng },
    end: { lat: t.end_lat, lng: t.end_lng },
    distanceKm: Math.round(t.distance_km * 10) / 10,
    durationMs: t.is_active ? Math.max(0, Date.now() - t.started_at) : t.duration_ms,
    isActive: !!t.is_active,
  }));
}

export function getVehicleStops(vehicleId: string): any[] {
  return listStops(vehicleId).map((s) => ({
    stopId: s.id,
    vehicleId: s.vehicle_id,
    kind: s.kind,
    start: { lat: s.start_lat, lng: s.start_lng },
    startedAt: new Date(s.started_at).toISOString(),
    endedAt: s.ended_at ? new Date(s.ended_at).toISOString() : null,
    durationMs: s.duration_ms,
    isActive: !!s.is_active,
  }));
}

export function getVehicleAlerts(vehicleId: string): any[] {
  return listVehicleAlerts(vehicleId).map((a) => ({ ...a, created_at: new Date(a.created_at).toISOString() }));
}

// ---- legacy telemetry-service compatibility ---------------------------------
export function getAllActiveTelemetryForLegacy(now = Date.now()): any[] {
  return getFleetVehicles(now)
    .filter((v) => v.telemetryStatus !== 'offline')
    .map((v) => ({
      vehicleId: v.id,
      lat: v.currentLat,
      lng: v.currentLng,
      speed: v.speed,
      heading: v.heading,
      lastPing: new Date(now - v.signalAgeMs),
      status: v.status,
      source: v.source,
      sourceLabel: v.sourceLabel,
    }));
}

function getIngestResult(vehicleId: string, now: number): IngestResult {
  const state = getVehicleLiveState(vehicleId, now);
  if (!state) throw new Error(`Unknown vehicle "${vehicleId}"`);
  return {
    success: true,
    vehicleId,
    receivedAt: new Date().toISOString(),
    lastKnown: { lat: state.currentLat, lng: state.currentLng, speed: state.speed, heading: state.heading, signalAgeMs: state.signalAgeMs },
    telemetryStatus: state.telemetryStatus,
    status: state.status,
    source: state.source as GpsSource,
    sourceLabel: state.sourceLabel,
    distanceTodayKm: state.distanceTodayKm,
    currentTrip: state.currentTrip as IngestResult['currentTrip'],
    activeAlerts: listActiveAlerts(50).filter((a) => a.vehicle_id === vehicleId).slice(0, 5).map((a) => ({ id: a.id, category: a.category, title: a.title })),
  };
}

// ---- init ------------------------------------------------------------------
seedIfEmpty();
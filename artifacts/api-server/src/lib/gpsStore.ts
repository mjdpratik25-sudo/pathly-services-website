// ============================================================
// gpsStore — persistent fleet telemetry database (SQLite, node:sqlite)
// ------------------------------------------------------------
// Real, file-backed tables for the GPS pipeline:
//   vehicles    → registered fleet registry (metadata)
//   pings       → raw device location pings (ingested over HTTP)
//   trips       → derived trips (computed from pings, never fabricated)
//   stops       → derived idle/stop events (computed from pings)
//   geofences   → stored zones used for entry/exit / authorization checks
//   alerts      → generated geofence/speed/stop alerts (from pings + geofences)
//   vehicle_state → per-vehicle derived live state
// All metrics are computed from stored ping data.
// ============================================================

import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function resolveDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join(os.tmpdir(), 'pathly-data');
    if (!fs.existsSync(tmpDir)) {
      try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
    }
    const bundledDb = path.resolve(import.meta.dirname ?? process.cwd(), '../data/gps.db');
    const targetDb = path.join(tmpDir, 'gps.db');
    if (!fs.existsSync(targetDb) && fs.existsSync(bundledDb)) {
      try { fs.copyFileSync(bundledDb, targetDb); } catch {}
    }
    return tmpDir;
  }
  const localDir = path.resolve(import.meta.dirname ?? process.cwd(), '../data');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {
      const tmpDir = path.join(os.tmpdir(), 'pathly-data');
      if (!fs.existsSync(tmpDir)) try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
      return tmpDir;
    }
  }
  return localDir;
}

const DATA_DIR = resolveDataDir();

const DB_PATH = process.env['GPS_DB_PATH'] || path.join(DATA_DIR, 'gps.db');

export const db = new DatabaseSync(DB_PATH);

// ---- schema ------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id TEXT PRIMARY KEY,
  registration_no TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  driver_phone TEXT,
  vehicle_type TEXT NOT NULL,
  cargo_type TEXT NOT NULL,
  cargo_desc TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  origin_lat REAL, origin_lng REAL,
  dest_lat REAL, dest_lng REAL,
  route TEXT
);

CREATE TABLE IF NOT EXISTS pings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  speed REAL NOT NULL,
  heading REAL NOT NULL,
  accuracy REAL,
  ignition INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL,
  device_label TEXT,
  sent_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pings_vehicle ON pings(vehicle_id, sent_at);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id TEXT NOT NULL,
  driver_name TEXT,
  source TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  start_lat REAL, start_lng REAL,
  end_lat REAL, end_lng REAL,
  distance_km REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id, started_at);

CREATE TABLE IF NOT EXISTS stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  start_lat REAL, start_lng REAL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_stops_vehicle ON stops(vehicle_id, started_at);

CREATE TABLE IF NOT EXISTS geofences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  state TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  radius_m REAL NOT NULL,
  speed_limit REAL,
  allowed_stop INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_key TEXT,
  vehicle_id TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  lat REAL, lng REAL,
  source TEXT,
  created_at INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle ON alerts(vehicle_id, created_at);

CREATE TABLE IF NOT EXISTS vehicle_state (
  vehicle_id TEXT PRIMARY KEY,
  last_lat REAL, last_lng REAL,
  last_speed REAL, last_heading REAL,
  last_ignition INTEGER NOT NULL DEFAULT 1,
  last_source TEXT,
  last_device_label TEXT,
  last_ping_at INTEGER,
  prev_ping_at INTEGER,
  last_geofences TEXT NOT NULL DEFAULT '[]',
  trip_id INTEGER,
  stop_id INTEGER,
  distance_trip_km REAL NOT NULL DEFAULT 0,
  trip_started_at INTEGER,
  idle_since INTEGER,
  last_stop_checked_id INTEGER
);
`);

// ---- registry seed (mirrors the existing Pathly fixture fleet) ---------
interface VehicleSeed {
  vehicle_id: string;
  registration_no: string;
  driver_name: string;
  driver_phone: string;
  vehicle_type: string;
  cargo_type: string;
  cargo_desc: string;
  origin: string;
  destination: string;
  priority: string;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  route: string;
}

const VEHICLE_SEED: VehicleSeed[] = [
  { vehicle_id: 'NER-V001', registration_no: 'AS-01-AB-1234', driver_name: 'Ranjan Das', driver_phone: '9864011223', vehicle_type: 'truck', cargo_type: 'medicines', cargo_desc: 'Essential medicines, vaccines & medical supplies for Tezpur Civil Hospital', origin: 'Guwahati', destination: 'Tezpur', priority: 'high', origin_lat: 26.1445, origin_lng: 91.7362, dest_lat: 26.6332, dest_lng: 92.7928, route: 'NH-27' },
  { vehicle_id: 'NER-V002', registration_no: 'ML-05-C-5678', driver_name: 'Bah Kynjah Lyngdoh', driver_phone: '9436234567', vehicle_type: 'mini_truck', cargo_type: 'food_supplies', cargo_desc: 'Rice, pulses, cooking oil & PDS supplies for Nongstoin distribution center', origin: 'Shillong', destination: 'Nongstoin', priority: 'high', origin_lat: 25.5788, origin_lng: 91.8933, dest_lat: 25.5167, dest_lng: 91.2667, route: 'NH-106' },
  { vehicle_id: 'NER-V003', registration_no: 'TR-01-D-9012', driver_name: 'Biplab Debnath', driver_phone: '9862012345', vehicle_type: 'truck', cargo_type: 'construction', cargo_desc: 'Steel rods, cement bags & bridge repair materials for NH-44 restoration work', origin: 'Agartala', destination: 'Dharmanagar', priority: 'normal', origin_lat: 23.8315, origin_lng: 91.2868, dest_lat: 24.3619, dest_lng: 92.1598, route: 'NH-44' },
  { vehicle_id: 'NER-V004', registration_no: 'MN-01-E-3456', driver_name: 'Thingbaijam Ibochouba', driver_phone: '8794556677', vehicle_type: 'ambulance', cargo_type: 'medicines', cargo_desc: 'Emergency medical equipment & blood supply for RIMS Hospital', origin: 'Dimapur', destination: 'Imphal', priority: 'emergency', origin_lat: 25.9, origin_lng: 93.7333, dest_lat: 24.817, dest_lng: 93.9368, route: 'NH-29 → NH-2' },
  { vehicle_id: 'NER-V005', registration_no: 'AS-06-F-7890', driver_name: 'Pranab Gogoi', driver_phone: '9706033445', vehicle_type: 'tanker', cargo_type: 'fuel', cargo_desc: 'Diesel fuel supply for Dibrugarh fuel depot & emergency generator stations', origin: 'Numaligarh Refinery', destination: 'Dibrugarh', priority: 'normal', origin_lat: 26.8, origin_lng: 93.72, dest_lat: 27.4728, dest_lng: 94.912, route: 'NH-37' },
  { vehicle_id: 'NER-V006', registration_no: 'MZ-01-G-2345', driver_name: 'Lalchhuanawma Ralte', driver_phone: '9436889900', vehicle_type: 'mini_truck', cargo_type: 'food_supplies', cargo_desc: 'ICDS nutrition packs, fortified flour & infant formula for Lunglei district', origin: 'Aizawl', destination: 'Lunglei', priority: 'high', origin_lat: 23.7271, origin_lng: 92.7176, dest_lat: 22.8833, dest_lng: 92.7333, route: 'NH-54' },
  { vehicle_id: 'NER-V007', registration_no: 'NL-07-H-6789', driver_name: 'Temjen Ao', driver_phone: '8837209145', vehicle_type: 'van', cargo_type: 'agricultural', cargo_desc: 'Fresh organic produce, Naga King Chilli & bamboo shoots for Dimapur market', origin: 'Kohima', destination: 'Dimapur', priority: 'normal', origin_lat: 25.6751, origin_lng: 94.1086, dest_lat: 25.9, dest_lng: 93.7333, route: 'NH-29' },
  { vehicle_id: 'NER-V008', registration_no: 'AR-01-J-0123', driver_name: 'Nabam Taki', driver_phone: '9774112233', vehicle_type: 'truck', cargo_type: 'construction', cargo_desc: 'Pre-fab bridge panels & heavy machinery parts for Siang River bridge project', origin: 'Itanagar', destination: 'Aalo', priority: 'high', origin_lat: 27.0844, origin_lng: 93.6053, dest_lat: 28.1667, dest_lng: 94.85, route: 'NH-415' },
  { vehicle_id: 'NER-V009', registration_no: 'SK-01-K-4567', driver_name: 'Tshering Bhutia', driver_phone: '9862334455', vehicle_type: 'mini_truck', cargo_type: 'medicines', cargo_desc: 'Anti-venom, altitude sickness medication & emergency medical kits for Mangan PHC', origin: 'Gangtok', destination: 'Mangan', priority: 'emergency', origin_lat: 27.3389, origin_lng: 88.6065, dest_lat: 27.5167, dest_lng: 88.5333, route: 'NH-10' },
  { vehicle_id: 'NER-V010', registration_no: 'AS-01-L-8901', driver_name: 'Hiranya Kalita', driver_phone: '9435088991', vehicle_type: 'truck', cargo_type: 'general', cargo_desc: 'Mixed consignment: textbooks, uniforms & mid-day meal supplies for remote schools', origin: 'Guwahati', destination: 'Silchar', priority: 'normal', origin_lat: 26.1445, origin_lng: 91.7362, dest_lat: 24.8333, dest_lng: 92.7789, route: 'NH-37' },
];

// ---- geofence seed (warehouses / depots / ports / restricted zones) -----
interface GeofenceSeed {
  id: string;
  name: string;
  type: string;
  state: string;
  lat: number;
  lng: number;
  radius_m: number;
  speed_limit: number;
  allowed_stop: boolean;
}

const GEOFENCE_SEED: GeofenceSeed[] = [
  { id: 'gf-guw-wh', name: 'Guwahati Logistics Hub (warehouse)', type: 'warehouse', state: 'Assam', lat: 26.1445, lng: 91.7362, radius_m: 8000, speed_limit: 50, allowed_stop: true },
  { id: 'gf-sil-wh', name: 'Silchar Disaster Relief Warehouse', type: 'warehouse', state: 'Assam', lat: 24.8333, lng: 92.7789, radius_m: 6000, speed_limit: 50, allowed_stop: true },
  { id: 'gf-imp-rh', name: 'Imphal RIMS Hospital (dispensary)', type: 'warehouse', state: 'Manipur', lat: 24.817, lng: 93.9368, radius_m: 5000, speed_limit: 40, allowed_stop: true },
  { id: 'gf-dib-depot', name: 'Dibrugarh Fuel Depot', type: 'depot', state: 'Assam', lat: 27.4728, lng: 94.912, radius_m: 5000, speed_limit: 40, allowed_stop: true },
  { id: 'gf-nong-dc', name: 'Nongstoin Distribution Center', type: 'warehouse', state: 'Meghalaya', lat: 25.5167, lng: 91.2667, radius_m: 5000, speed_limit: 40, allowed_stop: true },
  { id: 'gf-tez-ch', name: 'Tezpur Civil Hospital', type: 'warehouse', state: 'Assam', lat: 26.6332, lng: 92.7928, radius_m: 5000, speed_limit: 40, allowed_stop: true },
  { id: 'gf-dhar-port', name: 'Dharmanagar Cargo Railhead', type: 'port', state: 'Tripura', lat: 24.3619, lng: 92.1598, radius_m: 5000, speed_limit: 40, allowed_stop: true },
  { id: 'gf-aalo-wh', name: 'Aalo Trans-shipment Yard', type: 'warehouse', state: 'Arunachal Pradesh', lat: 28.1667, lng: 94.85, radius_m: 5000, speed_limit: 40, allowed_stop: true },
  { id: 'gf-lung-wh', name: 'Lunglei ICDS Depot', type: 'warehouse', state: 'Mizoram', lat: 22.8833, lng: 92.7333, radius_m: 5000, speed_limit: 40, allowed_stop: true },
  { id: 'gf-mangan-phc', name: 'Mangan PHC (medical cache)', type: 'warehouse', state: 'Sikkim', lat: 27.5167, lng: 88.5333, radius_m: 5000, speed_limit: 40, allowed_stop: true },
  { id: 'gf-dimap-port', name: 'Dimapur Intermodal Terminal', type: 'port', state: 'Nagaland', lat: 25.9, lng: 93.7333, radius_m: 6000, speed_limit: 40, allowed_stop: true },
  { id: 'gf-kazi-restricted', name: 'Kaziranga NP (restricted zone)', type: 'restricted', state: 'Assam', lat: 26.58, lng: 93.17, radius_m: 9000, speed_limit: 30, allowed_stop: false },
  { id: 'gf-ziro-restricted', name: 'Ziro Valley Ecological Reserve', type: 'restricted', state: 'Arunachal Pradesh', lat: 27.55, lng: 93.82, radius_m: 7000, speed_limit: 30, allowed_stop: false },
];

export function seedIfEmpty(): void {
  const vCount = (db.prepare('SELECT COUNT(*) c FROM vehicles').get() as { c: number }).c;
  if (vCount === 0) {
    const ins = db.prepare(
      `INSERT INTO vehicles (vehicle_id, registration_no, driver_name, driver_phone, vehicle_type, cargo_type, cargo_desc, origin, destination, priority, origin_lat, origin_lng, dest_lat, dest_lng, route)
       VALUES (:vehicle_id, :registration_no, :driver_name, :driver_phone, :vehicle_type, :cargo_type, :cargo_desc, :origin, :destination, :priority, :origin_lat, :origin_lng, :dest_lat, :dest_lng, :route)`
    );
    for (const v of VEHICLE_SEED) ins.run(v as unknown as Record<string, SQLInputValue>);
  }
  const gCount = (db.prepare('SELECT COUNT(*) c FROM geofences').get() as { c: number }).c;
  if (gCount === 0) {
    const ins = db.prepare(
      `INSERT INTO geofences (id, name, type, state, lat, lng, radius_m, speed_limit, allowed_stop)
       VALUES (:id, :name, :type, :state, :lat, :lng, :radius_m, :speed_limit, :allowed_stop)`
    );
    for (const g of GEOFENCE_SEED) ins.run({ ...g, allowed_stop: g.allowed_stop ? 1 : 0 });
  }
}

// ---- low-level helpers --------------------------------------------------
const HAVERSINE_R = 6371;
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR;
  const dLng = (lng2 - lng1) * toR;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * HAVERSINE_R * Math.asin(Math.sqrt(a));
}

export function crossTrackKm(lat: number, lng: number, aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toR = Math.PI / 180;
  const d13 = haversineKm(aLat, aLng, lat, lng);
  const d12 = haversineKm(aLat, aLng, bLat, bLng);
  if (d12 < 0.01) return d13;
  const brng13 = bearingDeg(aLat, aLng, lat, lng);
  const brng12 = bearingDeg(aLat, aLng, bLat, bLng);
  const theta = ((brng13 - brng12) * Math.PI) / 180;
  return Math.abs(Math.asin(Math.min(1, Math.max(-1, d13 * Math.sin(theta) / d12))) * d12);
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toR = Math.PI / 180;
  const y = Math.sin((lng2 - lng1) * toR) * Math.cos(lat2 * toR);
  const x = Math.cos(lat1 * toR) * Math.sin(lat2 * toR) - Math.sin(lat1 * toR) * Math.cos(lat2 * toR) * Math.cos((lng2 - lng1) * toR);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

// ---- public read helpers (all derived from stored pings) ----------------
export function getRegistry(vehicleId: string) {
  return db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(vehicleId) as any | undefined;
}

export function getAllRegistered(): any[] {
  return db.prepare('SELECT * FROM vehicles ORDER BY vehicle_id').all() as any[];
}

export function getAllGeofences(): any[] {
  return db.prepare('SELECT * FROM geofences').all() as any[];
}

export function getState(vehicleId: string) {
  return db.prepare('SELECT * FROM vehicle_state WHERE vehicle_id = ?').get(vehicleId) as any | undefined;
}

export function listPings(vehicleId: string, from?: number, to?: number, limit = 2000): any[] {
  let sql = 'SELECT lat, lng, speed, heading, ignition, source, sent_at FROM pings WHERE vehicle_id = ?';
  const params: any[] = [vehicleId];
  if (from || to) sql += ` AND sent_at >= ? AND sent_at <= ?`;
  if (from) params.push(from);
  if (to) params.push(to);
  sql += ' ORDER BY sent_at ASC';
  const rows = db.prepare(sql).all(...params) as any[];
  return rows.slice(-limit);
}

export function listTrips(vehicleId: string): any[] {
  return db.prepare('SELECT * FROM trips WHERE vehicle_id = ? ORDER BY started_at DESC LIMIT 50').all(vehicleId) as any[];
}

export function listStops(vehicleId: string): any[] {
  return db.prepare('SELECT * FROM stops WHERE vehicle_id = ? ORDER BY started_at DESC LIMIT 50').all(vehicleId) as any[];
}

export function listActiveAlerts(limit = 100): any[] {
  return db.prepare('SELECT * FROM alerts WHERE is_active = 1 ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
}

export function listRecentAlerts(limit = 100): any[] {
  return db.prepare('SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
}

export function listVehicleAlerts(vehicleId: string): any[] {
  return db.prepare('SELECT * FROM alerts WHERE vehicle_id = ? ORDER BY created_at DESC LIMIT 50').all(vehicleId) as any[];
}

export function hasActiveAlert(alertKey: string): boolean {
  return (db.prepare('SELECT COUNT(*) c FROM alerts WHERE alert_key = ? AND is_active = 1').get(alertKey) as { c: number }).c > 0;
}

export function deactivateAlert(alertKey: string): void {
  db.prepare('UPDATE alerts SET is_active = 0 WHERE alert_key = ? AND is_active = 1').run(alertKey);
}

export function insertAlert(a: {
  alert_key: string;
  vehicle_id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  source: string;
  created_at: number;
}): void {
  db.prepare(
    `INSERT INTO alerts (alert_key, vehicle_id, category, severity, title, description, lat, lng, source, created_at, is_active)
     VALUES (:alert_key, :vehicle_id, :category, :severity, :title, :description, :lat, :lng, :source, :created_at, 1)`
  ).run(a);
}

/** Total distance travelled by a vehicle from stored pings on a given day (start-of-day ms) */
export function distanceSince(vehicleId: string, sinceMs: number): number {
  const rows = db
    .prepare('SELECT lat, lng FROM pings WHERE vehicle_id = ? AND sent_at >= ? ORDER BY sent_at ASC')
    .all(vehicleId, sinceMs) as any[];
  let total = 0;
  for (let i = 1; i < rows.length; i++) total += haversineKm(rows[i - 1].lat, rows[i - 1].lng, rows[i].lat, rows[i].lng);
  return total;
}

export function startOfToday(nowMs = Date.now()): number {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function pingsBetween(fromMs: number, toMs: number): number {
  return (db.prepare('SELECT COUNT(*) c FROM pings WHERE sent_at >= ? AND sent_at <= ?').get(fromMs, toMs) as { c: number }).c;
}

export function tripsClosedToday(): any[] {
  const s = startOfToday();
  return db
    .prepare('SELECT * FROM trips WHERE ended_at IS NOT NULL AND ended_at >= ? OR (is_active = 1 AND started_at >= ?) ORDER BY started_at')
    .all(s, s) as any[];
}

export function alertCountSince(sinceMs: number): number {
  return (db.prepare('SELECT COUNT(*) c FROM alerts WHERE created_at >= ?').get(sinceMs) as { c: number }).c;
}

export function avgTripDurationMs(): number {
  const row = db.prepare('SELECT AVG(duration_ms) a, COUNT(*) c FROM trips WHERE ended_at IS NOT NULL').get() as { a: number | null; c: number };
  return row.a || 0;
}

export function totalDistanceAllSince(sinceMs: number): number {
  const rows = db.prepare('SELECT DISTINCT vehicle_id FROM pings WHERE sent_at >= ?').all(sinceMs) as any[];
  let total = 0;
  for (const r of rows) total += distanceSince(r.vehicle_id, sinceMs);
  return total;
}

// ---- write helpers -------------------------------------------------------
export function createTrip(opts: {
  vehicleId: string;
  driverName?: string;
  source: string;
  lat: number;
  lng: number;
  now: number;
}): number {
  const res = db
    .prepare(
      `INSERT INTO trips (vehicle_id, driver_name, source, started_at, start_lat, start_lng, distance_km, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)`
    )
    .run(opts.vehicleId, opts.driverName ?? null, opts.source, opts.now, opts.lat, opts.lng);
  return Number(res.lastInsertRowid);
}

export function updateTripSeg(vehicleId: string, tripId: number, lat: number, lng: number, distanceKm: number, _now: number): void {
  db.prepare(
    `UPDATE trips SET end_lat = ?, end_lng = ?, distance_km = distance_km + ? WHERE id = ? AND vehicle_id = ? AND is_active = 1`
  ).run(lat, lng, distanceKm, tripId, vehicleId);
  db.prepare('UPDATE vehicle_state SET distance_trip_km = distance_trip_km + ? WHERE vehicle_id = ?').run(distanceKm, vehicleId);
}

export function closeTrip(vehicleId: string, tripId: number, lat: number, lng: number, now: number): void {
  db.prepare(
    `UPDATE trips SET end_lat = ?, end_lng = ?, ended_at = ?, duration_ms = ? - started_at, is_active = 0 WHERE id = ? AND vehicle_id = ?`
  ).run(lat, lng, now, now, tripId, vehicleId);
}

export function createStop(opts: { vehicleId: string; kind: string; lat: number; lng: number; since: number }): number {
  const res = db
    .prepare(`INSERT INTO stops (vehicle_id, kind, start_lat, start_lng, started_at, is_active) VALUES (?, ?, ?, ?, ?, 1)`)
    .run(opts.vehicleId, opts.kind, opts.lat, opts.lng, opts.since);
  return Number(res.lastInsertRowid);
}

export function closeStop(vehicleId: string, stopId: number | null, now: number): void {
  if (!stopId) return;
  db.prepare(`UPDATE stops SET ended_at = ?, duration_ms = ? - started_at, is_active = 0 WHERE id = ? AND vehicle_id = ?`).run(now, now, stopId, vehicleId);
}

export function getStop(stopId: number): any | undefined {
  return db.prepare('SELECT * FROM stops WHERE id = ?').get(stopId) as any | undefined;
}

export function tickOpenStop(stopId: number | null, now: number): void {
  if (!stopId) return;
  db.prepare('UPDATE stops SET duration_ms = ? - started_at WHERE id = ?').run(now, stopId);
}

export function saveState(vehicleId: string, patch: Record<string, unknown>): void {
  const keys = Object.keys(patch);
  if (!keys.length) return;
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const sqlVals = keys.map((k) => {
    const v = patch[k];
    return (v === undefined ? null : v) as SQLInputValue;
  });
  const existing = getState(vehicleId);
  if (!existing) {
    const cols = Object.keys(patch).join(', ');
    const ph = keys.map(() => '?').join(', ');
    db.prepare(`INSERT INTO vehicle_state (vehicle_id, ${cols}) VALUES (?${ph ? ', ' + ph : ''})`).run(vehicleId, ...sqlVals);
  } else {
    db.prepare(`UPDATE vehicle_state SET ${sets} WHERE vehicle_id = ?`).run(...sqlVals, vehicleId);
  }
}

export function resetVehicleState(vehicleId: string): void {
  db.prepare('DELETE FROM vehicle_state WHERE vehicle_id = ?').run(vehicleId);
}
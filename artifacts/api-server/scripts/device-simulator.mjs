#!/usr/bin/env node
// ============================================================
// Pathly Device Simulator (mock GPS hardware gateway)
// ------------------------------------------------------------
// Sends realistic GPS location pings to the real ingestion
// endpoint (POST /api/telemetry/location) over HTTP — i.e. the
// "device → mobile network → cloud" path is exercised for real,
// while the hardware itself is mocked. Values (lat/lng/speed/
// heading) are realistic device positions; every derived metric
// on the server is computed from these stored pings.
//
//   node scripts/device-simulator.mjs [--base http://127.0.0.1:5001]
//        [--interval 6000] [--once] [--duration 60000]
//        [--vehicles NER-V001,NER-V002]
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(new URL('..', import.meta.url).pathname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const PID_FILE = path.join(DATA_DIR, 'simulator.pid');

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const BASE = flag('--base', 'http://127.0.0.1:5001');
const INTERVAL = Number(flag('--interval', '6000'));
const ONCE = args.includes('--once');
const DURATION = Number(flag('--duration', '0')); // 0 = run until killed
const VEHICLE_FILTER = flag('--vehicles', '');

// ---- single-instance lock (atomic O_EXCL so duplicate simulators can
// never race the pid file and start streaming a second device stream) ----
function checkLock() {
  try {
    const fd = fs.openSync(PID_FILE, 'wx');
    fs.writeSync(fd, String(process.pid));
    fs.closeSync(fd);
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') { console.error(`[device-simulator] cannot acquire lock: ${err.message}`); process.exit(1); }
    try {
      const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim());
      try { process.kill(pid, 0); } catch { fs.rmSync(PID_FILE); return checkLock(); }
    } catch { /* unreadable lock — assume stale */ fs.rmSync(PID_FILE); return checkLock(); }
    console.log('[device-simulator] another instance is already running — exiting.');
    process.exit(0);
  }
}
function releaseLock() { try { fs.rmSync(PID_FILE); } catch {} }
if (!checkLock()) {
  console.log('[device-simulator] another instance is already running — exiting.');
  process.exit(0);
}
process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(0); });
process.on('SIGTERM', () => { releaseLock(); process.exit(0); });

// ---- helpers ----
const R = 6371;
const haversine = (a, b) => {
  const toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
  return 2 * R * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) ** 2));
};
const bearing = (a, b) => {
  const toR = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * toR) * Math.cos(b.lat * toR);
  const x = Math.cos(a.lat * toR) * Math.sin(b.lat * toR) - Math.sin(a.lat * toR) * Math.cos(b.lat * toR) * Math.cos((b.lng - a.lng) * toR);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};
const destFrom = (pos, headDeg, distKm) => {
  const toR = Math.PI / 180, rad = (headDeg * Math.PI) / 180;
  const d = distKm / R;
  const lat = Math.asin(Math.sin(pos.lat * toR) * Math.cos(d) + Math.cos(pos.lat * toR) * Math.sin(d) * Math.cos(rad));
  const lng = pos.lng * toR + Math.atan2(Math.sin(rad) * Math.sin(d) * Math.cos(pos.lat * toR), Math.cos(d) - Math.sin(pos.lat * toR) * Math.sin(lat));
  return { lat: lat / toR, lng: lng / toR };
};

let fleet = [];
const sim = new Map(); // vehicleId -> { pos, heading, progress, parkUntil, parked }

// Pull the fleet registry + current positions from the real API on start.
async function bootstrap() {
  try {
    const res = await fetch(`${BASE}/api/fleet/vehicles`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const vehicles = (json.vehicles || []).filter((v) => !VEHICLE_FILTER || VEHICLE_FILTER.split(',').includes(v.id));
    fleet = vehicles;
    for (const v of vehicles) {
      sim.set(v.id, { pos: { lat: v.currentLat, lng: v.currentLng }, heading: v.heading ?? 40, progress: 0.4, parkUntil: 0, parked: false, speed: Math.min(58, v.speed || 40) });
    }
    console.log(`[device-simulator] bootstrapped ${fleet.length} vehicles from ${BASE}`);
  } catch (e) {
    console.error('[device-simulator] bootstrap failed:', e.message);
    process.exit(1);
  }
}

async function sendPing(v) {
  const s = sim.get(v.id);
  if (!s) return;
  const now = Date.now();

  // Scheduled park behavior (idle/stop detection) — every ~5 min briefly park
  if (!s.parked && Math.random() < 0.002) {
    s.parked = true;
    s.parkUntil = now + 30000 + Math.random() * 25000;
  }
  const parked = s.parked && now < s.parkUntil;
  if (s.parked && now >= s.parkUntil) { s.parked = false; }

  let speed;
  let ignition = true;
  if (parked) {
    speed = 0;
    // Small chance ignition is switched off -> a real 'stop' event.
    ignition = Math.random() > 0.3;
  } else {
    speed = Math.max(0, Math.min(64, s.speed + (Math.random() - 0.5) * 8));
  }
  // Occasional brief speed burst (exercises the speeding alert path, then clears)
  if (Math.random() < 0.003) speed = 62 + Math.random() * 6;

  const dtKm = (speed / 3600) * (INTERVAL / 1000);
  let heading = s.heading;
  // gentle heading wander
  heading = (heading + (Math.random() - 0.5) * 14 + 360) % 360;
  const newPos = parked ? s.pos : destFrom(s.pos, heading, dtKm || 0.01);

const payload = {
      vehicleId: v.id,
      latitude: newPos.lat,
      longitude: newPos.lng,
      speed: Math.round(speed * 10) / 10,
      heading: Math.round(heading),
      accuracy: 3 + Math.random() * 8,
      ignitionStatus: ignition,
      source: 'simulator',
      deviceLabel: `Sim-Dongle-${v.id.slice(-3)}`,
    };

    // If this vehicle is currently driven by a real browser-geolocation source
    // (Driver Mode), the simulator steps aside so the two streams don't fight.
    if (s.pauseUntil && now < s.pauseUntil) return;

    try {
      const res = await fetch(`${BASE}/api/telemetry/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) console.warn('  [sim] ingest rejected for', v.id, json.error);
      if (json.source === 'driver_mobile') s.pauseUntil = now + 10 * 60 * 1000;
      s.pos = newPos;
      s.heading = heading;
      s.speed = speed;
      s.progress += 0.01;
    } catch (e) {
      // transient network error — keep state, retry next tick
    }
}

async function tick() {
  await Promise.all(fleet.map(sendPing));
}

async function main() {
  await bootstrap();
  console.log(`[device-simulator] streaming ${fleet.length} vehicles to ${BASE}/api/telemetry/location every ${INTERVAL}ms (source=simulator)`);
  if (ONCE) { await tick(); console.log('[device-simulator] one-shot complete'); releaseLock(); process.exit(0); }
  await tick();
  const started = Date.now();
  const timer = setInterval(async () => {
    await tick();
    if (DURATION > 0 && Date.now() - started > DURATION) {
      console.log(`[device-simulator] duration reached — stopping.`);
      clearInterval(timer);
      releaseLock();
      process.exit(0);
    }
  }, INTERVAL);
}

main().catch((e) => { console.error(e); releaseLock(); process.exit(1); });
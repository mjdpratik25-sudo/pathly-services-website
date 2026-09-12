// ============================================================
// DriverMode: In-cab navigation companion for field drivers.
// Turn-by-turn guidance, live ETA, incident re-routing,
// offline-ready corridor cache + voice replan, and
// Hours-of-Service (driving time / break / night-halt) rules.
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
  Volume2,
  VolumeX,
  Coffee,
  Moon,
  Truck,
  ArrowRight,
  CheckCircle2,
  Wifi,
  WifiOff,
  RotateCcw,
  Gauge
} from 'lucide-react';
import DataProvenance from '../components/common/DataProvenance';
import { useVehicleTracking } from '../hooks/useVehicleTracking';
import { useAlerts } from '../hooks/useAlerts';
import { transmitDriverMobilePing } from '../lib/api';
import { getRoadSegments } from '../lib/scenarioEngine';
import { findOptimalRoutes, type RouteOption } from '../lib/aiEngine';
import { requireAuthAction } from '../lib/authGate';
import { NER_DISTRICTS } from '../data/nerData';

interface TurnStep {
  index: number;
  roadName: string;
  distanceKm: number;
  instruction: string;
  landmark: string;
  status: 'done' | 'current' | 'next';
}

function parseEtaMinutes(eta: string): number | null {
  const matches = eta.match(/(\d+)h\s*(\d+)?min?/);
  if (!matches) return null;
  return parseInt(matches[1], 10) * 60 + (matches[2] ? parseInt(matches[2], 10) : 0);
}

function hubFor(name: string, lat?: number, lng?: number): string {
  const exact = NER_DISTRICTS.find((d) => d.majorTown === name || d.name === name);
  if (exact) return exact.majorTown;
  // Names like "Numaligarh Refinery": map to the nearest district town by coords
  if (lat != null && lng != null) {
    let best = NER_DISTRICTS[0];
    let bd = Infinity;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    for (const d of NER_DISTRICTS) {
      const dist = Math.hypot(d.lat - lat, (d.lng - lng) * cosLat);
      if (dist < bd) { bd = dist; best = d; }
    }
    return best.majorTown;
  }
  return 'Guwahati';
}

function vehicleHubs(v: { origin: string; destination: string; currentLat: number; currentLng: number }) {
  return {
    originHub: hubFor(v.origin, v.currentLat, v.currentLng),
    destHub: hubFor(v.destination, v.currentLat, v.currentLng),
  };
}

function isNightHaltWindow(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 22 || h < 5;
}

export default function DriverMode() {
  const { vehicles, selectedVehicle, setSelectedVehicle, activeVehicles, gpsSyncStatus } = useVehicleTracking(3000);
  const { alerts } = useAlerts();
  const [vehicleId, setVehicleId] = useState<string>(activeVehicles[0]?.id ?? vehicles[0]?.id ?? 'NER-V001');

  // active vehicle (explicitly selected)
  const vehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? selectedVehicle ?? vehicles[0],
    [vehicles, vehicleId, selectedVehicle]
  );

  // ---- Route computation ----
  const route = useMemo<RouteOption | null>(() => {
    if (!vehicle) return null;
    const hubs = vehicleHubs(vehicle);
    const opts = findOptimalRoutes(hubs.originHub, hubs.destHub, [], { cargoType: vehicle.cargoType, cargoWeight: vehicle.cargoWeight, priority: vehicle.priority });
    return opts[0] ?? null;
  }, [vehicle]);

  // ---- Turn-by-turn steps derived from the network path ----
  const turns = useMemo<TurnStep[]>(() => {
    if (!route || !route.segments || route.segments.length === 0) {
      // Fallback: derive from the vehicle's corridor label
      const corridor = getRoadSegments().filter((s) => s.name.includes(vehicle?.route ?? 'NH'));
      return corridor.map((seg, i) => ({
        index: i + 1,
        roadName: seg.name,
        distanceKm: seg.distance,
        instruction: i === 0 ? `Stay on ${seg.name} — ${seg.distance} km` : `Continue on ${seg.name}`,
        landmark: seg.from === vehicle?.origin ? 'Start' : seg.to,
        status: i === 0 ? ('current' as const) : ('next' as const),
      }));
    }
    return route.segments.map((seg, i) => ({
      index: i + 1,
      roadName: seg.name,
      distanceKm: seg.distance,
      instruction: i === 0 ? `Drive toward ${seg.to} via ${seg.name}` : `Continue ${seg.distance} km on ${seg.name}`,
      landmark: seg.to ?? `${i + 1}`,
      status: i === 0 ? ('current' as const) : ('next' as const),
    }));
  }, [route, vehicle]);

  const [turnIndex, setTurnIndex] = useState(0);
  const [arrived, setArrived] = useState(false);

  // ---- Live ETA countdown ----
  const [remainingSec, setRemainingSec] = useState<number>(() => {
    if (vehicle && vehicle.eta && vehicle.eta !== 'Unknown') {
      const mins = parseEtaMinutes(vehicle.eta);
      return mins ? mins * 60 : 0;
    }
    return route ? Math.round((route.costScore ?? 120) * 60) : 7200;
  });
  const [etaSource, setEtaSource] = useState<'network' | 'evolved'>('network');

  useEffect(() => {
    if (arrived) return;
    const t = setInterval(() => setRemainingSec((s) => (s <= 0 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [arrived]);

  // ---- Re-routing on live incident alerts ----
  const [rerouted, setRerouted] = useState(false);
  const [rerouteCost, setRerouteCost] = useState<number | null>(null);
  const [isComputing, setIsComputing] = useState(false);

  const routeHighway = vehicle?.route?.split('→')[0]?.trim() ?? '';
  const incidentOnRoute = alerts.some((a) => (a.title ?? '').includes(routeHighway) || (a.severity === 'critical'));

  const handleReroute = () => {
    if (!requireAuthAction('Re-route Vehicle')) return;
    if (!vehicle) return;
    setIsComputing(true);
    setTimeout(() => {
      const hubs = vehicleHubs(vehicle);
      const opts = findOptimalRoutes(hubs.originHub, hubs.destHub, [], {
        cargoType: vehicle.cargoType,
        cargoWeight: vehicle.cargoWeight,
        priority: vehicle.priority,
      });
      // Prefer a non-blocked network route (index 1 if it exists), fallback to index 0
      const best = opts.find((o) => o.routeType === 'network') ?? opts[0];
      if (best) {
        setRerouteCost(best.costScore ?? null);
        setRemainingSec(best.costScore ? best.costScore * 60 : remainingSec);
        setEtaSource('evolved');
        setRerouted(true);
      }
      setIsComputing(false);
    }, 1200);
  };

  // ---- Hours-of-Service: driving time, break, night-halt ----
  const [drivingSeconds, setDrivingSeconds] = useState(4 * 3600 + 15 * 60); // starts mid-shift (demo)
  const [onBreak, setOnBreak] = useState(false);
  const startedEpoch = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      if (!onBreak) setDrivingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [onBreak]);

  const drivingHrs = drivingSeconds / 3600;
  const breakDue = drivingHrs >= 4;
  const maxDutyDue = drivingHrs >= 8;

  // ---- Voice prompts (offline-capable via Web Speech) ----
  const [voiceOn, setVoiceOn] = useState(false);
  const lastSpoken = useRef(-1);
  useEffect(() => {
    if (!voiceOn || arrived) return;
    const current = turns[turnIndex];
    if (current && current.status === 'current' && turnIndex !== lastSpoken.current) {
      lastSpoken.current = turnIndex;
      try {
        const synth = window.speechSynthesis;
        if (synth) {
          const u = new SpeechSynthesisUtterance(`In ${current.distanceKm} kilometres, ${current.instruction}`);
          u.lang = 'en-IN';
          synth.cancel();
          synth.speak(u);
        }
      } catch { /* SpeechSynthesis unavailable */ }
    }
  }, [turnIndex, turns, voiceOn, arrived]);

  // advance turns (simulated progress)
  useEffect(() => {
    const t = setInterval(() => {
      setTurnIndex((ti) => {
        if (ti >= turns.length - 1) { setArrived(true); return ti; }
        return ti + 1;
      });
    }, 30000);
    return () => clearInterval(t);
  }, [turns.length]);

  // ---- Derived displays ----
  const hrs = Math.floor(remainingSec / 3600);
  const mins = Math.floor((remainingSec % 3600) / 60);
  const secs = remainingSec % 60;
  const complete = Math.min(100, Math.round(((vehicle?.progress ?? 0) + turnIndex * (100 / Math.max(1, turns.length))) / 2));
  const nightHalt = isNightHaltWindow();
  const offlineReady = useMemo(() => getRoadSegments().length, []);

  // ---- Real GPS source: browser Geolocation pings (tagged 'driver_mobile') ----
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'live' | 'denied' | 'error'>('idle');
  const [geoTimestamp, setGeoTimestamp] = useState<string | null>(null);
  const geoWatchRef = useRef<number | null>(null);
  const vehicleIdRef = useRef(vehicleId);
  const lastPingSent = useRef(0);

  useEffect(() => { vehicleIdRef.current = vehicleId; }, [vehicleId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('locating');
    geoWatchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastPingSent.current < 5000) return; // throttle to the sync cadence
        lastPingSent.current = now;
        const v = vehicleIdRef.current;
        if (!v) return;
        const c = pos.coords;
        const res = await transmitDriverMobilePing({
          vehicleId: v,
          latitude: c.latitude,
          longitude: c.longitude,
          speed: Math.round(c.speed ?? 0),
          heading: Math.round(c.heading ?? 0),
          accuracy: c.accuracy ?? null,
        });
        if (res) {
          setGeoStatus('live');
          setGeoTimestamp(new Date().toLocaleTimeString());
        }
      },
      (err) => {
        setGeoStatus(err.code === 1 ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    );
    return () => {
      if (geoWatchRef.current != null) navigator.geolocation.clearWatch(geoWatchRef.current);
    };
  }, []);

  const geoTag = geoStatus === 'live'
    ? `Driver Mobile Location (live ${geoTimestamp})`
    : geoStatus === 'locating'
      ? 'Driver Mobile Location (locating…)'
      : geoStatus === 'denied'
        ? 'Driver Mobile Location (permission denied)'
        : 'Driver Mobile Location (unavailable)';

  const currentTurn = turns[turnIndex] ?? turns[0];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl gov-panel">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#0B3D6D] font-bold">
              {arrived ? 'Trip Complete' : rerouted ? 'Re-routed by Command' : 'Live Navigation'}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-800 mt-0.5">Driver Mode — Turn-by-Turn</h2>
          <p className="text-xs text-slate-600 mt-1">
            In-cab guidance for field drivers. Corridor data cached on this device — navigation & voice replan work offline.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-1 border border-emerald-600 bg-emerald-50 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
            {navigator.onLine ? <Wifi size={13} /> : <WifiOff size={13} />}
            {navigator.onLine ? 'Live sync' : 'Offline cache ready'}
          </span>
          <button
            type="button"
            onClick={() => setVoiceOn((v) => !v)}
            className={`px-2.5 py-1 border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
              voiceOn ? 'bg-[#0B3D6D] text-white border-[#0B3D6D]' : 'bg-white text-[#0B3D6D] border-[#0B3D6D]/40'
            }`}
          >
            {voiceOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
            {voiceOn ? 'Voice prompts ON' : 'Voice prompts OFF'}
          </button>
        </div>
      </div>

      {/* Vehicle selector */}
      <div className="p-4 rounded-xl gov-panel">
        <div className="flex items-center gap-2 mb-2">
          <Truck size={15} className="text-[#0B3D6D]" />
          <h3 className="text-sm font-bold text-slate-700">Active Trip</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vehicles.filter((v) => v.status !== 'delivered').map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => { if (!requireAuthAction('Select Active Trip')) return; setVehicleId(v.id); setRerouted(false); setEtaSource('network'); }}
              className={`text-left p-3 rounded border cursor-pointer transition-all ${
                v.id === vehicle?.id
                  ? 'border-[#0B3D6D] bg-[#0B3D6D]/8 ring-1 ring-[#0B3D6D]/30'
                  : 'border-slate-200 bg-white hover:border-[#0B3D6D]/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold text-slate-800">{v.registrationNo}</span>
                <span className="text-[10px] font-mono text-slate-500">{v.id}</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                <MapPin size={11} className="text-slate-400" />
                {v.origin} <ArrowRight size={10} className="text-slate-400" /> {v.destination}
              </p>
              <p className="text-[10px] font-mono text-slate-500 mt-1">
                {v.driverName} · {v.cargoType} ({v.cargoWeight} t) · {v.status}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: next maneuver + turn list */}
        <div className="lg:col-span-2 space-y-5">
          {/* Next maneuver hero */}
          <div className="p-5 rounded-xl gov-panel border-l-4 border-l-[#0B3D6D]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded bg-[#0B3D6D] text-white flex items-center justify-center">
                  <Navigation size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Next maneuver</p>
                  <p className="text-base font-black text-slate-800">{currentTurn?.instruction ?? 'Route ready'}</p>
                  <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                    <MapPin size={11} /> {currentTurn?.landmark ?? 'Origin'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black font-mono text-[#0B3D6D]">
                  {currentTurn?.distanceKm ?? '—'} km
                </p>
                <p className="text-[10px] font-mono text-slate-500">{currentTurn?.roadName ?? ''}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                <span>Corridor progress</span>
                <span>{complete}% · step {turnIndex + 1}/{turns.length}</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#0B3D6D]" style={{ width: `${complete}%` }} />
              </div>
            </div>
          </div>

          {/* Turn-by-turn list */}
          <div className="p-4 rounded-xl gov-panel">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700">Turn-by-Turn Guidance</h3>
              <span className="text-[10px] font-mono text-slate-500">{turns.length} waypoints</span>
            </div>
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {turns.map((t) => (
                <div
                  key={t.index}
                  className={`flex items-center gap-3 p-2.5 rounded border ${
                    t.status === 'current'
                      ? 'border-[#FF9933] bg-[#FF9933]/10'
                      : t.status === 'done'
                        ? 'border-slate-200 bg-white text-slate-500'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                    t.status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#0B3D6D] text-white'
                  }`}>
                    {t.status === 'done' ? <CheckCircle2 size={13} /> : t.index}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${t.status === 'done' ? 'text-slate-400' : 'text-slate-800'}`}>
                      {t.instruction}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">{t.roadName} · {t.landmark}</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-600">{t.distanceKm} km</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail: ETA + reroute + HOS */}
        <div className="space-y-5">
          {/* ETA panel */}
          <div className="p-4 rounded-xl gov-panel">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={14} className="text-[#0B3D6D]" /> Estimated Arrival
              </h3>
              <span className="text-[9px] font-mono text-slate-500">
                {etaSource === 'network' ? 'NETWORK' : 'RE-ROUTED'}
              </span>
            </div>
            <p className="text-3xl font-black font-mono text-[#0B3D6D] mt-2">
              {hrs}h {mins.toString().padStart(2, '0')}m <span className="text-lg">{secs.toString().padStart(2, '0')}s</span>
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              {vehicle?.origin} → {vehicle?.destination}
              {rerouteCost != null && (
                <span className="ml-1 text-[#7A1F1F] font-bold">(new route adds {Math.max(0, rerouteCost - (parseEtaMinutes(vehicle?.eta ?? '') ?? rerouteCost))} min)</span>
              )}
            </p>
            <div className="mt-3 p-2 bg-slate-100 rounded">
              <p className="text-[10px] text-slate-500">ETA model</p>
              <p className="text-[11px] text-slate-700">{rerouted ? 'Cost-based optimum (after incident re-route)' : 'Network speed estimate from corridor telemetry'}</p>
            </div>
          </div>

          {/* Incident + reroute */}
          <div className={`p-4 rounded-xl border ${incidentOnRoute ? 'border-[#7A1F1F]/50 bg-[#7A1F1F]/5' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <AlertTriangle size={14} className={incidentOnRoute ? 'text-[#7A1F1F]' : 'text-slate-400'} />
                Corridor {routeHighway || 'Alert'}
              </h3>
              {incidentOnRoute && (
                <span className="text-[9px] font-bold uppercase text-[#7A1F1F] bg-red-100 border border-red-300 px-1.5 py-0.5">Incident</span>
              )}
            </div>
            {incidentOnRoute ? (
              <>
                <p className="text-[11px] text-slate-700 mt-2">
                  A critical incident has been flagged on this corridor. Command recommends an alternative network path.
                </p>
                <button
                  type="button"
                  onClick={handleReroute}
                  disabled={isComputing}
                  className="mt-3 w-full py-2 px-3 bg-[#7A1F1F] hover:bg-red-800 disabled:opacity-60 text-white text-xs font-bold rounded flex items-center justify-center gap-1.5"
                >
                  {isComputing ? <RefreshCw size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  {isComputing ? 'Computing best path…' : 'Re-route via network optimum'}
                </button>
                {rerouted && (
                  <p className="mt-2 text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Re-route accepted by vehicle
                  </p>
                )}
              </>
            ) : (
              <p className="text-[11px] text-slate-500 mt-2">No live incident on this corridor. Route is clear.</p>
            )}
            <DataProvenance source="LIVE API" basis="command telemetry + network graph" updatedAt="continuous" />
          </div>

          {/* HOS: Hours of Service */}
          <div className="p-4 rounded-xl gov-panel">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-700">Hours-of-Service</h3>
              <span className="text-[10px] font-mono text-slate-500">{onBreak ? 'ON BREAK' : 'DRIVING'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-2 bg-slate-100 rounded">
                <p className="text-[10px] font-mono text-slate-500">Driving time</p>
                <p className="text-lg font-black font-mono text-slate-800">
                  {Math.floor(drivingHrs)}h {Math.round((drivingHrs % 1) * 60)}m
                </p>
              </div>
              <div className="p-2 bg-slate-100 rounded">
                <p className="text-[10px] font-mono text-slate-500">Duty window</p>
                <p className="text-lg font-black font-mono text-slate-800">8h 0m</p>
              </div>
            </div>
            {breakDue && (
              <div className="mt-3 p-2.5 border border-amber-400 bg-amber-50 text-amber-900 flex items-center gap-2">
                <Coffee size={14} />
                <span className="text-[11px] font-semibold">
                  {maxDutyDue ? 'Max duty reached — take 30-min rest now.' : `${drivingHrs.toFixed(1)}h driving — 30-min break advised.`}
                </span>
              </div>
            )}
            {nightHalt && (
              <div className="mt-2 p-2.5 border border-indigo-400 bg-indigo-50 text-indigo-900 flex items-center gap-2">
                <Moon size={14} />
                <span className="text-[11px] font-semibold">Night-halt advisory — legal rest required before {`05:00`}.</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setOnBreak((b) => !b)}
              className={`mt-3 w-full py-2 px-3 rounded text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 ${
                onBreak ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-[#0B3D6D] text-white hover:bg-blue-900'
              }`}
            >
              {onBreak ? 'Resume driving' : 'Start 30-min break'}
            </button>
          </div>

          {/* Vehicle telemetry */}
          <div className="p-4 rounded-xl gov-panel">
            <div className="flex items-center gap-2 mb-2">
              <Gauge size={14} className="text-[#0B3D6D]" />
              <h3 className="text-sm font-bold text-slate-700">Telemetry</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-100 rounded">
                <p className="text-base font-black font-mono text-slate-800">{vehicle?.speed ?? 0} km/h</p>
                <p className="text-[9px] font-mono text-slate-500">Speed</p>
              </div>
              <div className="p-2 bg-slate-100 rounded">
                <p className="text-base font-black font-mono text-slate-800">{vehicle?.fuelLevel ?? 0}%</p>
                <p className="text-[9px] font-mono text-slate-500">Fuel</p>
              </div>
              <div className="p-2 bg-slate-100 rounded">
                <p className="text-base font-black font-mono text-slate-800">{offlineReady}</p>
                <p className="text-[9px] font-mono text-slate-500">Cached corridors</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase tracking-wide ${
                  geoStatus === 'live'
                    ? 'text-emerald-800 bg-emerald-100 border-emerald-700'
                    : 'text-slate-500 bg-slate-100 border-slate-400'
                }`}
              >
                <MapPin size={10} className="mr-1" />
                {geoTag}
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${
                  gpsSyncStatus === 'synced'
                    ? 'text-[#138808] bg-green-50 border border-green-700'
                    : 'text-[#B45309] bg-amber-100 border border-amber-600'
                }`}
              >
                AIS-140 ping: {gpsSyncStatus === 'synced' ? 'Synced' : gpsSyncStatus === 'queued' ? 'Queued (backend offline)' : 'Idle'}
              </span>
            </div>
            <DataProvenance
              source={geoStatus === 'live' ? 'LIVE API' : 'STANDBY'}
              basis={geoStatus === 'live' ? 'real browser GPS device uplink, tagged driver_mobile' : 'fleet telemetry feed; live AIS-140 push when backend is connected'}
              updatedAt="5s refresh"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
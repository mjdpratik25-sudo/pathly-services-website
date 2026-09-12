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
  Gauge,
  Compass,
  ShieldCheck,
  Check,
} from 'lucide-react';
import DataProvenance from '../components/common/DataProvenance';
import { useVehicleTracking } from '../hooks/useVehicleTracking';
import { useAlerts } from '../hooks/useAlerts';
import { transmitDriverMobilePing } from '../lib/api';
import { getRoadSegments, updateVehicleTrip } from '../lib/scenarioEngine';
import { findOptimalRoutes, type RouteOption } from '../lib/aiEngine';
import { requireAuthAction } from '../lib/authGate';
import { NER_DISTRICTS } from '../data/nerData';
import { saveOrderRoute, getAssignedRouteForOrder } from '../lib/orderRouteStore';

interface TurnStep {
  index: number;
  roadName: string;
  distanceKm: number;
  instruction: string;
  landmark: string;
  status: 'done' | 'current' | 'next';
  isBridge?: boolean;
  bridgeName?: string;
  weightLimitNote?: string;
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

// ---- Detailed Multi-Waypoint Generator (PART 1) ----
function generateDetailedTurnSteps(
  origin: string,
  dest: string,
  route: RouteOption | null,
  currentTurnIndex: number
): TurnStep[] {
  const normOrigin = (origin || '').trim();
  const normDest = (dest || '').trim();

  // 1. Guwahati -> Tezpur (Exact 7-Waypoint Route per PART 1 specifications)
  if (
    (normOrigin.toLowerCase() === 'guwahati' && normDest.toLowerCase() === 'tezpur') ||
    (!route && normOrigin.toLowerCase() === 'guwahati')
  ) {
    const steps: Omit<TurnStep, 'status'>[] = [
      {
        index: 1,
        roadName: 'NH-44 Guwahati–Jorabat',
        distanceKm: 18,
        instruction: 'Drive toward Jorabat via NH-44 Guwahati–Jorabat',
        landmark: 'Jorabat Junction (Exiting Guwahati)',
      },
      {
        index: 2,
        roadName: 'NH-44 Jorabat–Jagi Road',
        distanceKm: 34,
        instruction: 'Continue via Jagi Road',
        landmark: 'Jagi Road Industrial Corridor',
      },
      {
        index: 3,
        roadName: 'NH-44 Jagi Road–Raha',
        distanceKm: 23,
        instruction: 'Continue via Raha',
        landmark: 'Raha Checkpoint',
      },
      {
        index: 4,
        roadName: 'NH-44 Raha–Nagaon',
        distanceKm: 18,
        instruction: 'Continue toward Nagaon',
        landmark: 'Nagaon Bypass Junction',
      },
      {
        index: 5,
        roadName: 'NH-44 Nagaon–Koliabor Tiniali',
        distanceKm: 45,
        instruction: 'Continue via Koliabor Tiniali',
        landmark: 'Koliabor Tiniali Junction',
      },
      {
        index: 6,
        roadName: 'Kaliabhomora Setu (NH-44 / NH-715)',
        distanceKm: 6,
        instruction: 'Cross Kaliabhomora Setu (Brahmaputra bridge crossing)',
        landmark: 'Kaliabhomora Bridge · 40T Gross Limit',
        isBridge: true,
        bridgeName: 'Kaliabhomora Setu',
        weightLimitNote: 'Brahmaputra Bridge Crossing · Passed Weight Inspection',
      },
      {
        index: 7,
        roadName: 'NH-44 Koliabor–Tezpur',
        distanceKm: 34,
        instruction: 'Arrive Tezpur via NH-44 Koliabor–Tezpur',
        landmark: 'Tezpur Civil Hospital Hub',
      },
    ];

    return steps.map((s, idx) => ({
      ...s,
      status: idx === currentTurnIndex ? 'current' : idx < currentTurnIndex ? 'done' : 'next',
    }));
  }

  // 2. Imphal -> Moreh Corridor (Landslide Bypass Scenario)
  if (normOrigin.toLowerCase() === 'imphal' && normDest.toLowerCase() === 'moreh') {
    const steps: Omit<TurnStep, 'status'>[] = [
      {
        index: 1,
        roadName: 'NH-2 Imphal South Exit',
        distanceKm: 14,
        instruction: 'Drive toward Thoubal via NH-2 Exit',
        landmark: 'Thoubal District Junction',
      },
      {
        index: 2,
        roadName: 'MDR Kakching Bypass',
        distanceKm: 28,
        instruction: 'Divert via MDR Kakching Corridor (Bypassing NH-2 Landslide)',
        landmark: 'Kakching Agricultural Terminal',
      },
      {
        index: 3,
        roadName: 'Pallel–Tengnoupal Hill Road',
        distanceKm: 24,
        instruction: 'Ascend Tengnoupal Mountain Pass',
        landmark: 'Tengnoupal Ridge Checkpoint',
      },
      {
        index: 4,
        roadName: 'Lokchao River Bridge (NH-102)',
        distanceKm: 8,
        instruction: 'Cross Lokchao River Bridge (Heavy Axle Clearance)',
        landmark: 'Lokchao Bridge Crossing · 35T Limit',
        isBridge: true,
        bridgeName: 'Lokchao Bridge',
      },
      {
        index: 5,
        roadName: 'NH-102 Moreh Approach',
        distanceKm: 22,
        instruction: 'Continue on NH-102 toward Border Gate',
        landmark: 'Moreh Commercial Checkpoint',
      },
      {
        index: 6,
        roadName: 'Moreh Land Port Terminal',
        distanceKm: 14,
        instruction: 'Arrive Moreh Integrated Check Post',
        landmark: 'Moreh ICP Border Depot',
      },
    ];
    return steps.map((s, idx) => ({
      ...s,
      status: idx === currentTurnIndex ? 'current' : idx < currentTurnIndex ? 'done' : 'next',
    }));
  }

  // 3. Shillong -> Jowai Corridor
  if (normOrigin.toLowerCase() === 'shillong' && normDest.toLowerCase() === 'jowai') {
    const steps: Omit<TurnStep, 'status'>[] = [
      {
        index: 1,
        roadName: 'NH-6 Shillong Peak Pass',
        distanceKm: 12,
        instruction: 'Exit Shillong toward Mawryngkneng',
        landmark: 'Mawryngkneng Bypass',
      },
      {
        index: 2,
        roadName: 'NH-6 East Khasi Foothills',
        distanceKm: 16,
        instruction: 'Continue on NH-6 through scenic plateau',
        landmark: 'Mawlyngkhung Pass',
      },
      {
        index: 3,
        roadName: 'Umkhen River Bridge',
        distanceKm: 5,
        instruction: 'Cross Umkhen River Bridge',
        landmark: 'Umkhen Bridge Crossing · 30T Rating',
        isBridge: true,
        bridgeName: 'Umkhen Bridge',
      },
      {
        index: 4,
        roadName: 'NH-6 Thadlaskein Stretch',
        distanceKm: 18,
        instruction: 'Continue toward Thadlaskein Lake Pass',
        landmark: 'Thadlaskein Lake Pass',
      },
      {
        index: 5,
        roadName: 'NH-6 Jowai West Entry',
        distanceKm: 13,
        instruction: 'Arrive Jowai District Distribution Center',
        landmark: 'Jowai Civil Depot',
      },
    ];
    return steps.map((s, idx) => ({
      ...s,
      status: idx === currentTurnIndex ? 'current' : idx < currentTurnIndex ? 'done' : 'next',
    }));
  }

  // 4. Dynamic Multi-Leg Subdivision for Any Custom Route
  const totalDist = route?.totalDistance ?? 120;
  const corridorName = route?.name ?? `${normOrigin}–${normDest} Corridor`;

  const dist1 = Math.max(5, Math.round(totalDist * 0.15));
  const dist2 = Math.max(8, Math.round(totalDist * 0.22));
  const dist3 = Math.max(8, Math.round(totalDist * 0.20));
  const dist4 = Math.max(4, Math.round(totalDist * 0.08)); // Bridge crossing landmark
  const dist5 = Math.max(8, Math.round(totalDist * 0.20));
  const dist6 = Math.max(5, totalDist - (dist1 + dist2 + dist3 + dist4 + dist5));

  const steps: Omit<TurnStep, 'status'>[] = [
    {
      index: 1,
      roadName: `${corridorName} (Exit Leg)`,
      distanceKm: dist1,
      instruction: `Depart ${normOrigin} via primary corridor`,
      landmark: `${normOrigin} City Checkpost`,
    },
    {
      index: 2,
      roadName: `${corridorName} (Highway Stretch)`,
      distanceKm: dist2,
      instruction: `Continue along ${corridorName}`,
      landmark: 'Intermediate Highway Junction',
    },
    {
      index: 3,
      roadName: `${corridorName} (Sub-District Link)`,
      distanceKm: dist3,
      instruction: 'Maintain corridor heading past regional interchange',
      landmark: 'Regional Toll & Weigh Station',
    },
    {
      index: 4,
      roadName: `${corridorName} River Bridge`,
      distanceKm: dist4,
      instruction: 'Cross River Viaduct (Check Weight Limit)',
      landmark: 'Major River Bridge Crossing · Regulated Axle Speed',
      isBridge: true,
      bridgeName: 'River Viaduct Bridge',
    },
    {
      index: 5,
      roadName: `${corridorName} (Approach Sector)`,
      distanceKm: dist5,
      instruction: `Continue toward ${normDest} entrance perimeter`,
      landmark: `${normDest} Outer Sector`,
    },
    {
      index: 6,
      roadName: `${normDest} Logistics Link`,
      distanceKm: dist6,
      instruction: `Arrive ${normDest} Consignment Hub`,
      landmark: `${normDest} Distribution Center`,
    },
  ];

  return steps.map((s, idx) => ({
    ...s,
    status: idx === currentTurnIndex ? 'current' : idx < currentTurnIndex ? 'done' : 'next',
  }));
}

export default function DriverMode() {
  const { vehicles, selectedVehicle, setSelectedVehicle, activeVehicles, gpsSyncStatus } = useVehicleTracking(3000);
  const { alerts } = useAlerts();
  const [vehicleId, setVehicleId] = useState<string>(activeVehicles[0]?.id ?? vehicles[0]?.id ?? 'NER-V001');

  // Active vehicle (explicitly selected)
  const vehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? selectedVehicle ?? vehicles[0],
    [vehicles, vehicleId, selectedVehicle]
  );

  const [turnIndex, setTurnIndex] = useState(0);
  const [arrived, setArrived] = useState(false);

  // Driver-configurable Departure and Destination (PART 2)
  const [driverOrigin, setDriverOrigin] = useState<string>('Guwahati');
  const [driverDestination, setDriverDestination] = useState<string>('Tezpur');
  const [activeOrigin, setActiveOrigin] = useState<string>('Guwahati');
  const [activeDestination, setActiveDestination] = useState<string>('Tezpur');
  const [routeSyncNotice, setRouteSyncNotice] = useState<string | null>(null);
  const [corridorWarning, setCorridorWarning] = useState<string | null>(null);

  // Synchronize when vehicle selection changes
  useEffect(() => {
    if (vehicle) {
      const assigned = vehicle.orderToken ? getAssignedRouteForOrder(vehicle.orderToken) : null;
      const o = assigned?.origin || vehicle.origin || 'Guwahati';
      const d = assigned?.destination || vehicle.destination || 'Tezpur';
      setDriverOrigin(o);
      setDriverDestination(d);
      setActiveOrigin(o);
      setActiveDestination(d);
      setTurnIndex(0);
      setArrived(false);
      setCorridorWarning(null);
      setRouteSyncNotice(null);
    }
  }, [vehicle?.id]);

  // Distinct list of district hubs for driver autocomplete
  const hubOptions = useMemo(() => {
    const set = new Set<string>();
    NER_DISTRICTS.forEach((d) => {
      if (d.majorTown) set.add(d.majorTown);
      if (d.name) set.add(d.name);
    });
    return Array.from(set).sort();
  }, []);

  // ---- Route computation based on activeOrigin and activeDestination ----
  const route = useMemo<RouteOption | null>(() => {
    const originHub = hubFor(activeOrigin);
    const destHub = hubFor(activeDestination);
    const opts = findOptimalRoutes(originHub, destHub, [], {
      cargoType: vehicle?.cargoType ?? 'medicines',
      cargoWeight: vehicle?.cargoWeight ?? 4.2,
      priority: vehicle?.priority ?? 'normal',
    });
    return opts[0] ?? null;
  }, [activeOrigin, activeDestination, vehicle]);

  // ---- Turn-by-turn steps derived from the detailed generator (PART 1) ----
  const turns = useMemo<TurnStep[]>(() => {
    return generateDetailedTurnSteps(activeOrigin, activeDestination, route, turnIndex);
  }, [activeOrigin, activeDestination, route, turnIndex]);

  // ---- Live ETA countdown ----
  const [remainingSec, setRemainingSec] = useState<number>(() => {
    if (vehicle && vehicle.eta && vehicle.eta !== 'Unknown') {
      const mins = parseEtaMinutes(vehicle.eta);
      return mins ? mins * 60 : 0;
    }
    return route ? Math.round((route.costScore ?? 120) * 60) : 7200;
  });
  const [etaSource, setEtaSource] = useState<'network' | 'evolved'>('network');

  // Handle Driver Route Update & Sync with Control Room (PART 2)
  const handleUpdateDriverRoute = (newOrigin: string, newDestination: string) => {
    if (!requireAuthAction('Update Trip Route')) return;
    const cleanOrigin = newOrigin.trim();
    const cleanDest = newDestination.trim();

    if (!cleanOrigin || !cleanDest) {
      setCorridorWarning('Please provide both Departure and Destination locations.');
      return;
    }
    if (cleanOrigin.toLowerCase() === cleanDest.toLowerCase()) {
      setCorridorWarning('Departure and Destination cannot be the same hub location.');
      return;
    }

    // Corridor and cargo weight validation
    if (cleanOrigin.toLowerCase().includes('imphal') && cleanDest.toLowerCase().includes('moreh')) {
      setCorridorWarning('Active Landslide on NH-2: Direct route blocked. Automated bypass via MDR Kakching corridor calculated.');
    } else if (vehicle && vehicle.cargoWeight > 7) {
      setCorridorWarning(`Heavy Axle Protocol (${vehicle.cargoWeight}T): Regulated 20 km/h speed limit on river bridge landmarks.`);
    } else {
      setCorridorWarning(null);
    }

    setActiveOrigin(cleanOrigin);
    setActiveDestination(cleanDest);
    setTurnIndex(0);
    setArrived(false);

    const originHub = hubFor(cleanOrigin);
    const destHub = hubFor(cleanDest);
    const opts = findOptimalRoutes(originHub, destHub, [], {
      cargoType: vehicle?.cargoType ?? 'medicines',
      cargoWeight: vehicle?.cargoWeight ?? 4.2,
      priority: vehicle?.priority ?? 'normal',
    });
    const bestRoute = opts[0] ?? null;

    if (bestRoute) {
      setRemainingSec(Math.round((bestRoute.costScore ?? 120) * 60));
      setEtaSource('network');
    }

    // Sync back to Control Room
    if (vehicle) {
      // 1. Update vehicle trip in scenarioEngine so Tracking View and GIS Map reflect the new trip
      updateVehicleTrip(vehicle.id, cleanOrigin, cleanDest, bestRoute?.name);

      // 2. Persist in orderRouteStore so Cargo Manifest displays the updated assigned route
      const orderToken = vehicle.orderToken || `ORD-${vehicle.id}`;
      saveOrderRoute({
        orderId: orderToken,
        vehicleId: vehicle.id,
        registrationNo: vehicle.registrationNo,
        driverName: vehicle.driverName,
        origin: cleanOrigin,
        destination: cleanDest,
        routeName: bestRoute ? `${cleanOrigin} → ${cleanDest} (${bestRoute.name})` : `${cleanOrigin} → ${cleanDest}`,
        corridorSummary: bestRoute?.segments.map((s) => s.name).join(' → ') || 'Direct Corridor Link',
        cargoType: vehicle.cargoType,
        priority: vehicle.priority === 'emergency' ? 'emergency' : 'normal',
        totalDistanceKm: bestRoute?.totalDistance ?? 178,
        estimatedTimeHours: bestRoute?.estimatedTime ?? 3.5,
        riskScore: bestRoute?.riskScore ?? 35,
        riskClass: bestRoute?.riskAssessment.riskClass ?? 'LOW',
        terrainDifficulty: bestRoute?.terrainDifficulty ?? 'moderate',
        fuelEstimateLiters: Math.round((bestRoute?.totalDistance ?? 178) * 0.28),
        tollCostRupees: 180,
        dispatchedAt: new Date().toLocaleTimeString('en-IN') + ' · Driver Mode',
        dispatchedBy: `Field Driver (${vehicle.driverName})`,
        status: 'in_transit',
        avoidanceNotice: (cleanOrigin.toLowerCase().includes('imphal') && cleanDest.toLowerCase().includes('moreh'))
          ? 'Automated bypass via MDR Kakching corridor due to NH-2 landslide'
          : undefined,
      });

      // 3. Transmit driver mobile ping
      if (vehicle.currentLat && vehicle.currentLng) {
        transmitDriverMobilePing({
          vehicleId: vehicle.id,
          latitude: vehicle.currentLat,
          longitude: vehicle.currentLng,
          speed: vehicle.speed || 40,
          heading: vehicle.heading || 75,
        });
      }

      // 4. Custom window event notification
      window.dispatchEvent(
        new CustomEvent('pathly_driver_route_updated', {
          detail: {
            vehicleId: vehicle.id,
            origin: cleanOrigin,
            destination: cleanDest,
            orderToken,
          },
        })
      );
    }

    const dist = bestRoute?.totalDistance ?? (cleanOrigin.toLowerCase() === 'guwahati' && cleanDest.toLowerCase() === 'tezpur' ? 178 : 120);
    setRouteSyncNotice(`Trip Updated & Synced with Control Room: ${cleanOrigin} ➔ ${cleanDest} (${dist} km · Active)`);
    setTimeout(() => setRouteSyncNotice(null), 8000);
  };

  const handleResetToAssigned = () => {
    if (!vehicle) return;
    const orig = vehicle.origin || 'Guwahati';
    const dest = vehicle.destination || 'Tezpur';
    setDriverOrigin(orig);
    setDriverDestination(dest);
    handleUpdateDriverRoute(orig, dest);
  };

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

      {/* Trip Route Configuration & In-Cab Corridor Assignment (PART 2) */}
      <div className="p-4 rounded-xl gov-panel border border-[#0B3D6D]/30 bg-slate-50/70 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-[#0B3D6D]" />
            <h3 className="text-sm font-bold text-slate-800">
              Trip Route Configuration &amp; Corridor Assignment
            </h3>
            <span className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
              Driver Editable
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#0B3D6D]">
            Vehicle: <strong>{vehicle?.registrationNo}</strong> ({vehicle?.orderToken || 'Ad-Hoc'})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Departure Field */}
          <div className="sm:col-span-4 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center gap-1">
              <MapPin size={11} className="text-emerald-700" />
              <span>Departure Point / Origin Hub</span>
            </label>
            <input
              type="text"
              list="driver-hub-options"
              value={driverOrigin}
              onChange={(e) => setDriverOrigin(e.target.value)}
              placeholder="e.g. Guwahati"
              className="w-full py-2 px-3 text-xs bg-white border border-slate-300 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B3D6D]/30 focus:border-[#0B3D6D] shadow-xs"
            />
          </div>

          {/* Arrow indicator */}
          <div className="hidden sm:flex sm:col-span-1 items-center justify-center pb-2 text-slate-400">
            <ArrowRight size={16} />
          </div>

          {/* Destination Field */}
          <div className="sm:col-span-4 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center gap-1">
              <MapPin size={11} className="text-red-700" />
              <span>Destination District Hub</span>
            </label>
            <input
              type="text"
              list="driver-hub-options"
              value={driverDestination}
              onChange={(e) => setDriverDestination(e.target.value)}
              placeholder="e.g. Tezpur"
              className="w-full py-2 px-3 text-xs bg-white border border-slate-300 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B3D6D]/30 focus:border-[#0B3D6D] shadow-xs"
            />
          </div>

          {/* Datalist of towns */}
          <datalist id="driver-hub-options">
            {hubOptions.map((town) => (
              <option key={town} value={town} />
            ))}
          </datalist>

          {/* Action Buttons */}
          <div className="sm:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleUpdateDriverRoute(driverOrigin, driverDestination)}
              disabled={isComputing}
              className="flex-1 py-2 px-3 bg-[#0B3D6D] hover:bg-[#092D52] text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Navigation size={13} />
              <span>{isComputing ? 'Calculating…' : 'Update Route'}</span>
            </button>

            {(driverOrigin !== vehicle?.origin || driverDestination !== vehicle?.destination) && (
              <button
                type="button"
                onClick={handleResetToAssigned}
                title="Reset to Control Room assigned origin/destination"
                className="py-2 px-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 text-xs font-semibold rounded transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Validation Warning Notice */}
        {corridorWarning && (
          <div className="p-2.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-mono flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Corridor Validation Warning</p>
              <p className="text-[10px] text-amber-800 mt-0.5">{corridorWarning}</p>
            </div>
          </div>
        )}

        {/* Sync Feedback Notification */}
        {routeSyncNotice && (
          <div className="p-2 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-mono flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
            <span>{routeSyncNotice}</span>
          </div>
        )}
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
              <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {turns.length} waypoints
              </span>
            </div>
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {turns.map((t) => (
                <div
                  key={t.index}
                  className={`flex items-center gap-3 p-3 rounded border transition-all ${
                    t.status === 'current'
                      ? 'border-[#FF9933] bg-[#FF9933]/10 ring-1 ring-[#FF9933]/40'
                      : t.status === 'done'
                        ? 'border-slate-200 bg-white text-slate-500'
                        : t.isBridge
                          ? 'border-blue-300 bg-blue-50/40'
                          : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                    t.status === 'done'
                      ? 'bg-emerald-100 text-emerald-700'
                      : t.isBridge
                        ? 'bg-[#0B3D6D] text-amber-300 ring-2 ring-blue-300'
                        : t.status === 'current'
                          ? 'bg-[#FF9933] text-white'
                          : 'bg-[#0B3D6D] text-white'
                  }`}>
                    {t.status === 'done' ? (
                      <CheckCircle2 size={13} />
                    ) : t.isBridge ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 19h18" />
                        <path d="M4 19V11a8 8 0 0 1 16 0v8" />
                        <path d="M9 19v-5a3 3 0 0 1 6 0v5" />
                        <path d="M3 11h18" />
                      </svg>
                    ) : (
                      t.index
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-xs font-bold ${t.status === 'done' ? 'text-slate-400' : 'text-slate-800'}`}>
                        {t.instruction}
                      </p>
                      {t.isBridge && (
                        <span className="text-[9px] px-1.5 py-0.5 border border-blue-500/60 bg-blue-100/70 text-[#0B3D6D] font-mono font-bold uppercase rounded flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 19h18M4 19V11a8 8 0 0 1 16 0v8M9 19v-5a3 3 0 0 1 6 0v5" />
                          </svg>
                          Critical Bridge Landmark
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {t.roadName} · <span className="font-semibold text-slate-700">{t.landmark}</span>
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-700 shrink-0">{t.distanceKm} km</span>
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
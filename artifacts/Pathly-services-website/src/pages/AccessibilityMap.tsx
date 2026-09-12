// ============================================================
// AccessibilityMap: District-level GIS & Topological Road Surveillance
// ============================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  MapPin,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Compass,
  ShieldCheck,
  RefreshCw,
  Eye,
  Navigation,
  Sparkles,
  Mountain,
  Gauge,
  CloudRain,
  Users,
  Train,
  Plane,
  ChevronRight,
  Maximize2,
  Minimize2,
  Printer
} from 'lucide-react';
import GoogleNERMap from '../components/maps/GoogleNERMap';
import TacticalNERMap from '../components/maps/TacticalNERMap';
import StatusBadge from '../components/common/StatusBadge';
import {
  NER_DISTRICTS,
  NER_STATES,
  ROAD_SEGMENTS,
  type NERDistrict,
  type NERState,
  type RoadSegment,
  getConnectivityStatus
} from '../data/nerData';
import { useVehicleTracking } from '../hooks/useVehicleTracking';
import { useAlerts } from '../hooks/useAlerts';
import { requireAuthAction } from '../lib/authGate';

// Geographic center + zoom for each state selector pill (and the all-states view)
const STATE_CENTERS: Record<NERState | 'ALL', { lat: number; lng: number; zoom: number }> = {
  ALL: { lat: 26.14, lng: 91.77, zoom: 7 },
  Assam: { lat: 26.14, lng: 91.77, zoom: 8 },
  Meghalaya: { lat: 25.57, lng: 91.88, zoom: 8 },
  Tripura: { lat: 23.84, lng: 91.28, zoom: 9 },
  Manipur: { lat: 24.81, lng: 93.95, zoom: 8 },
  Mizoram: { lat: 23.16, lng: 92.93, zoom: 8 },
  Nagaland: { lat: 26.15, lng: 94.56, zoom: 8 },
  'Arunachal Pradesh': { lat: 28.21, lng: 94.72, zoom: 7 },
  Sikkim: { lat: 27.53, lng: 88.51, zoom: 9 },
};

export default function AccessibilityMap({ isSidebarOpen = true }: { isSidebarOpen?: boolean }) {
  const [selectedState, setSelectedState] = useState<NERState | 'ALL'>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<NERDistrict | null>(() => {
    return NER_DISTRICTS.find(d => d.name === 'West Tripura') || NER_DISTRICTS[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'GOOD'>('ALL');
  const [showRoads, setShowRoads] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [mapEngine, setMapEngine] = useState<'google' | 'tactical'>('google');

  // Item 10 — improved map: layer toggles, forecast window, legend, fullscreen, report.
  const [showFloodZones, setShowFloodZones] = useState(true);
  const [showLandslide, setShowLandslide] = useState(true);
  const [timeWindowH, setTimeWindowH] = useState(6);
  const [showOnlyAffected, setShowOnlyAffected] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapWrapRef = useRef<HTMLDivElement | null>(null);

  const toggleFullscreen = () => {
    const el = mapWrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen()?.then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen()?.then(() => setIsFullscreen(false)).catch(() => {});
    }
  };
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Routes flagable as affected within the selected forecast window
  // (approximated from live segment status, delay and risk — DEMO).
  const affectedRoutes = useMemo(() => {
    return ROAD_SEGMENTS.filter((s) => {
      const baseAffected = s.status !== 'open';
      const riskAffected = (s.riskScore ?? 0) >= 60;
      const delayAffects = (s.delayMinutes ?? Number.MAX_SAFE_INTEGER) <= timeWindowH * 60;
      return baseAffected || riskAffected || (delayAffects ? (s.delayMinutes ?? 0) > 0 : false);
    });
  }, [timeWindowH]);

  const stateDistrictNames = useMemo(() => {
    const set = new Set<string>();
    NER_DISTRICTS.filter((d) => selectedState === 'ALL' || d.state === selectedState).forEach((d) => {
      set.add(d.name.toLowerCase());
      set.add(d.majorTown.toLowerCase());
    });
    return set;
  }, [selectedState]);

  const visibleAffectedRoutes = showOnlyAffected
    ? affectedRoutes.filter((s) =>
        [s.name, s.from, s.to].some((v) => {
          const q = v.toLowerCase();
          return [...stateDistrictNames].some((n) => q.includes(n));
        })
      )
    : [];

  // Route comparison for the selected district (primary vs alternate NH corridor).
  const districtRoutes = useMemo(() => {
    if (!selectedDistrict || selectedDistrict.nhConnected.length === 0) return [];
    return ROAD_SEGMENTS
      .filter((s) => selectedDistrict.nhConnected.some((nh) => s.name.includes(nh)))
      .sort((a, b) => {
        const score = (seg: RoadSegment) => (seg.riskScore ?? 0) + (seg.delayMinutes ?? 0) * 2 + (seg.status === 'open' ? 0 : seg.status === 'partially_blocked' ? 30 : 100);
        return score(a) - score(b);
      });
  }, [selectedDistrict]);

  // Printable situation report (window → browser print / Save as PDF).
  const buildSituationReport = () => {
    if (!requireAuthAction('Situation Report')) return;
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    const bySeverity = alerts.reduce<Record<string, number>>((acc, a) => {
      acc[a.severity] = (acc[a.severity] ?? 0) + 1;
      return acc;
    }, {});
    const fleetCount = vehicles.length;
    const rows = affectedRoutes
      .map(
        (s) => `<tr><td>${s.name}</td><td>${s.status.replace(/_/g, ' ')}</td><td>${s.condition}/100</td><td>${s.delayMinutes ?? 0} min</td><td>${s.riskScore ?? 0}/100</td></tr>`
      )
      .join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Pathly Situation Report — ${now}</title>
      <style>body{font-family:-apple-system,'Segoe UI',Arial,sans-serif;color:#111;padding:24px;font-size:12px}
      header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #FF9933;padding-bottom:12px}
      h1{font-size:18px;margin:0;color:#0B3D6D}.badge{font-size:10px;font-weight:700;letter-spacing:1px;color:#7A1F1F}
      h2{font-size:13px;margin:20px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:6px}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
      th{background:#f1f5f9;text-transform:uppercase;font-size:10px;letter-spacing:0.5px}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:6px}
      .card{border:1px solid #ddd;padding:10px} .card b{font-size:20px;color:#0B3D6D}
      .note{font-size:10px;color:#555;margin-top:12px;font-style:italic}</style></head><body>
      <header><div><h1>Pathly Situation Report</h1><div style="font-size:11px;margin-top:2px">NER Regional Command · Live operational snapshot</div></div>
      <div style="text-align:right"><span class="badge">GENERATED ${now}</span></div></header>
      <h2>Summary</h2>
      <div class="grid">
        <div class="card">Routes flagged affected (${timeWindowH}h)<b>${affectedRoutes.length}</b></div>
        <div class="card">Active alerts<b>${alerts.length}</b></div>
        <div class="card">Fleet vehicles<b>${fleetCount}</b></div>
        <div class="card">Districts monitored<b>${NER_DISTRICTS.length}</b></div>
      </div>
      <h2>Affected Routes in Next ${timeWindowH} Hours</h2>
      <table><thead><tr><th>Corridor</th><th>Status</th><th>Condition</th><th>Delay</th><th>Risk</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No routes flagged affected.</td></tr>'}</tbody></table>
      <h2>Alert Mix</h2>
      <table><thead><tr><th>Severity</th><th>Count</th></tr></thead><tbody>${Object.entries(bySeverity).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('') || '<tr><td colspan="2">No alerts.</td></tr>'}</tbody></table>
      <p class="note">Honest-data notice: status values are derived from the NER road-segment fixtures and live telemetry cache. Forecast "next ${timeWindowH} hours" is an approximation from current delay/risk — not a probabilistic prediction. Every panel labels its data source.</p>
      </body></html>`;
    const win = window.open('', '_blank', 'width=900,height=720');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  // Deep Link Location Coordinates from Top Search
  const [customCenter, setCustomCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [customZoom, setCustomZoom] = useState<number | null>(null);
  const [customLocation, setCustomLocation] = useState<{
    name: string;
    formattedAddress: string;
    lat: number;
    lng: number;
  } | null>(null);

  const { vehicles } = useVehicleTracking();
  const { alerts } = useAlerts();

  // Guest view-only: state selector and district filters require sign-in.
  const handleSelectState = (st: NERState | 'ALL') => {
    if (!requireAuthAction('Filter by State')) return;
    setSelectedState(st);
    const c = STATE_CENTERS[st];
    setCustomCenter({ lat: c.lat, lng: c.lng });
    setCustomZoom(c.zoom);
  };

  const corridorStatusBadge = (seg: RoadSegment): React.ReactNode => {
    if (seg.status === 'blocked') {
      return <span className="text-[9px] font-bold uppercase tracking-wider text-white bg-[#7A1F1F] px-1.5 py-0.5">Blocked</span>;
    }
    if (seg.status === 'partially_blocked') {
      return <span className="text-[9px] font-bold uppercase tracking-wider text-[#B45309] bg-amber-50 border border-amber-600 px-1.5 py-0.5">At Risk</span>;
    }
    if (seg.status === 'under_repair') {
      return <span className="text-[9px] font-bold uppercase tracking-wider text-[#0B3D6D] bg-blue-50 border border-[#0B3D6D]/50 px-1.5 py-0.5">Repair</span>;
    }
    return <span className="text-[9px] font-bold uppercase tracking-wider text-[#138808] bg-green-50 border border-green-700 px-1.5 py-0.5">Open</span>;
  };

  // Helper to parse query parameters or handle deep navigation
  const processLocationDeepLink = () => {
    try {
      const url = new URL(window.location.href);
      const lat = url.searchParams.get('lat');
      const lng = url.searchParams.get('lng');
      const zoom = url.searchParams.get('zoom');
      const name = url.searchParams.get('name');
      const district = url.searchParams.get('district');

      if (lat && lng) {
        const numLat = parseFloat(lat);
        const numLng = parseFloat(lng);
        const numZoom = zoom ? parseInt(zoom, 10) : 16;

        if (!isNaN(numLat) && !isNaN(numLng)) {
          setCustomCenter({ lat: numLat, lng: numLng });
          setCustomZoom(numZoom);
          setCustomLocation({
            name: name ? decodeURIComponent(name) : 'Selected Location',
            formattedAddress: district ? `${decodeURIComponent(name || '')}, ${decodeURIComponent(district)}` : `${numLat.toFixed(4)}, ${numLng.toFixed(4)}`,
            lat: numLat,
            lng: numLng
          });

          // Match district if exists
          if (district) {
            const foundDist = NER_DISTRICTS.find(d =>
              d.name.toLowerCase().includes(decodeURIComponent(district).toLowerCase()) ||
              (name && d.name.toLowerCase().includes(decodeURIComponent(name).toLowerCase()))
            );
            if (foundDist) setSelectedDistrict(foundDist);
          }
        }
      }
    } catch { }
  };

  useEffect(() => {
    processLocationDeepLink();

    // Listen for custom location navigation events
    const handleCustomNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ lat: number; lng: number; zoom?: number; name?: string; district?: string }>;
      if (customEvent.detail) {
        const { lat, lng, zoom = 16, name, district } = customEvent.detail;
        setCustomCenter({ lat, lng });
        setCustomZoom(zoom);
        setCustomLocation({
          name: name || 'Selected Location',
          formattedAddress: district ? `${name || ''}, ${district}` : `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat,
          lng
        });
      }
    };

    window.addEventListener('pathly_navigate_location', handleCustomNav);
    window.addEventListener('popstate', processLocationDeepLink);

    return () => {
      window.removeEventListener('pathly_navigate_location', handleCustomNav);
      window.removeEventListener('popstate', processLocationDeepLink);
    };
  }, []);

  const filteredDistricts = NER_DISTRICTS.filter((d) => {
    if (selectedState !== 'ALL' && d.state !== selectedState) return false;
    if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase()) && !d.majorTown.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter === 'CRITICAL' && d.connectivityScore >= 50) return false;
    if (statusFilter === 'GOOD' && d.connectivityScore < 70) return false;
    return true;
  });

  const criticalCount = NER_DISTRICTS.filter((d) => d.connectivityScore < 40).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 relative">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-600"></span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">
              GIS Topological Surveillance
            </span>
          </div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            Regional District Accessibility & Infrastructure GIS Map
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
            Real-time highway vulnerability, elevation profiles, bridge integrity, and emergency disaster bypass routes across the whole region.
          </p>
        </div>

        {/* Map Engine Switcher */}
        <div className="flex items-center gap-0 border border-slate-300 dark:border-slate-700 relative z-10">
          <button
            type="button"
            onClick={() => setMapEngine('google')}
            className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-r border-slate-300 dark:border-slate-700 ${mapEngine === 'google'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
          >
            <span>Google Maps</span>
          </button>
          <button
            type="button"
            onClick={() => setMapEngine('tactical')}
            className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${mapEngine === 'tactical'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
          >
            <span>Tactical GIS</span>
          </button>
        </div>
      </div>

      {/* 2. State Filter Pills */}
      <div
        className="flex items-center gap-0 overflow-x-auto pb-2 scrollbar-none border border-slate-300 dark:border-slate-700"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          type="button"
          onClick={() => handleSelectState('ALL')}
          className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border-r border-slate-300 dark:border-slate-700 ${selectedState === 'ALL'
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
              : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
        >
          <span>All 8 States</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 ${selectedState === 'ALL' ? 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
            {NER_DISTRICTS.length}
          </span>
        </button>

        {NER_STATES.map((st) => {
          const count = NER_DISTRICTS.filter((d) => d.state === st.name).length;
          const isSelected = selectedState === st.name;
          return (
            <button
              key={st.name}
              type="button"
              onClick={() => handleSelectState(st.name)}
              className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer border-r border-slate-300 dark:border-slate-700 last:border-r-0 ${isSelected
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold'
                  : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
              <span className="text-sm">{st.emoji}</span>
              <span>{st.name}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 ${isSelected ? 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Grid: Map (2 Cols) + District Inspector (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Interactive Map (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Item 10 — analysis toolbar: layers, forecast window, legend, fullscreen, report */}
          <div className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 border-b border-slate-300 dark:border-slate-700">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                <Layers size={12} /> Layers
              </span>
              {[
                { key: 'roads', label: 'Roads', active: showRoads, on: () => setShowRoads((v) => !v) },
                { key: 'vehicles', label: 'Vehicles', active: showVehicles, on: () => setShowVehicles((v) => !v) },
                { key: 'alerts', label: 'Alerts', active: showAlerts, on: () => setShowAlerts((v) => !v) },
                { key: 'floodZones', label: 'Flood Zones', active: showFloodZones, on: () => setShowFloodZones((v) => !v) },
                { key: 'landslide', label: 'Landslide', active: showLandslide, on: () => setShowLandslide((v) => !v) },
              ].map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={l.on}
                  aria-pressed={l.active}
                  className={`px-2 py-0.5 text-[11px] font-bold border transition-colors cursor-pointer ${
                    l.active
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-400 dark:border-slate-600'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
              <div className="flex items-center gap-2 min-w-[220px]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold flex-shrink-0">
                  Forecast window
                </span>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={timeWindowH}
                  onChange={(e) => setTimeWindowH(parseInt(e.target.value, 10))}
                  aria-label="Forecast window in hours"
                  className="flex-1 cursor-pointer accent-[#0B3D6D]"
                />
                <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 w-8 text-right">
                  {timeWindowH}h
                </span>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-600 dark:text-slate-300" htmlFor="affected-only">
                <input
                  id="affected-only"
                  type="checkbox"
                  checked={showOnlyAffected}
                  onChange={(e) => setShowOnlyAffected(e.target.checked)}
                  className="accent-[#0B3D6D]"
                />
                Show only routes affected in next {timeWindowH} hours
              </label>

              <div className="ml-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowLegend((v) => !v)}
                  aria-pressed={showLegend}
                  className="px-2 py-1 text-[11px] font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Legend {showLegend ? '▾' : '▸'}
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="px-2 py-1 text-[11px] font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                >
                  {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                  {isFullscreen ? 'Exit' : 'Fullscreen'}
                </button>
                <button
                  type="button"
                  onClick={buildSituationReport}
                  className="px-2 py-1 text-[11px] font-bold border border-[#0B3D6D] bg-[#0B3D6D] text-white hover:bg-blue-800 cursor-pointer flex items-center gap-1"
                >
                  <Printer size={12} />
                  Situation Report (PDF)
                </button>
              </div>
            </div>

            {/* Legend */}
            {showLegend && (
              <div className="px-3 py-2 border-t border-slate-300 dark:border-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                <span className="font-mono uppercase tracking-wider text-slate-500 dark:text-slate-500 font-bold">Legend</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-blue-600 inline-block" /> Road network</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> Active vehicle</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Critical alert</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Warning alert</span>
                {showFloodZones && <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-300 border border-indigo-600 inline-block" /> Flood-prone zone</span>}
                {showLandslide && <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-orange-300 border border-orange-600 inline-block" /> Landslide corridor</span>}
              </div>
            )}
          </div>

          <div
            ref={mapWrapRef}
            className="overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 h-[420px] sm:h-[520px] lg:h-[680px]"
            style={isFullscreen ? { height: '100vh', width: '100vw' } : undefined}
          >
            {mapEngine === 'google' ? (
              <GoogleNERMap
                vehicles={vehicles}
                alerts={alerts}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={(d) => setSelectedDistrict(d)}
                showRoads={showRoads}
                showVehicles={showVehicles}
                showAlerts={showAlerts}
                centerPos={customCenter ? [customCenter.lat, customCenter.lng] : undefined}
                zoomLevel={customZoom || undefined}
                initialLocation={customLocation}
                stateFilter={selectedState}
                isSidebarOpen={isSidebarOpen}
                height="100%"
              />
            ) : (
              <TacticalNERMap
                vehicles={vehicles}
                alerts={alerts}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={(d) => setSelectedDistrict(d)}
                showRoads={showRoads}
                showVehicles={showVehicles}
                showAlerts={showAlerts}
                centerPos={customCenter ? [customCenter.lat, customCenter.lng] : undefined}
                zoomLevel={customZoom || undefined}
                stateFilter={selectedState}
                height="100%"
              />
            )}
          </div>

          {/* Quick Stats Below Map */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-slate-300 dark:border-slate-700 divide-x divide-y sm:divide-y-0 divide-slate-300 dark:divide-slate-700">
            <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-mono font-bold tracking-wider">
                  Monitored Bridges
                </p>
                <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">142 Units</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Telemetry Online</p>
              </div>
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-lg border border-slate-300 dark:border-slate-600">
                🌉
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-mono font-bold tracking-wider">
                  Critical Bottlenecks
                </p>
                <p className="text-xl font-black font-mono text-rose-700 dark:text-rose-400 mt-1">{criticalCount} Districts</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Bypass Enforced</p>
              </div>
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg border border-rose-300 dark:border-rose-700">
                ⚠️
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-mono font-bold tracking-wider">
                  Emergency Routes
                </p>
                <p className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">18 Active</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Escort Standby</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-300 dark:border-emerald-700">
                🛣️
              </div>
            </div>
          </div>

          {/* Item 10 — routes affected within the forecast window */}
          <div className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 border-b border-slate-300 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-amber-600" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400">
                  Corridors Flagged Affected — Next {timeWindowH} Hours
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500">
                  ({affectedRoutes.length} of {ROAD_SEGMENTS.length} routes)
                </span>
              </div>
              {showOnlyAffected && visibleAffectedRoutes.length > 0 && (
                <span className="text-[10px] text-slate-500 dark:text-slate-500">
                  Filtered to <strong className="text-amber-700 dark:text-amber-400">{visibleAffectedRoutes.length}</strong> affecting {selectedState === 'ALL' ? 'all states' : selectedState}
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-[220px] overflow-y-auto">
              {(showOnlyAffected ? visibleAffectedRoutes : affectedRoutes).slice(0, 12).map((s) => {
                const cb = corridorStatusBadge(s);
                return (
                  <div key={s.id} className="px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500">{s.from} → {s.to} · {s.distance} km</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {cb}
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500">
                        {s.delayMinutes ?? 0} min · risk {s.riskScore ?? 0}/100
                      </span>
                    </div>
                  </div>
                );
              })}
              {affectedRoutes.length === 0 && (
                <p className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                  No routes flagged affected within the {timeWindowH}h forecast window.
                </p>
              )}
            </div>
          </div>

          {/* Item 10 — route comparison for the selected district */}
          {districtRoutes.length > 0 && selectedDistrict && (
            <div className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 border-b border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Navigation size={13} className="text-[#0B3D6D]" />
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400">
                    Route Comparison — {selectedDistrict.name} ({selectedDistrict.nhConnected.join(', ')})
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-500">Ranked by lowest risk × delay</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2 px-3 font-bold">Rank</th>
                      <th className="py-2 pr-3 font-bold">Corridor</th>
                      <th className="py-2 pr-3 font-bold">Status</th>
                      <th className="py-2 pr-3 font-bold">Condition</th>
                      <th className="py-2 pr-3 font-bold">Delay</th>
                      <th className="py-2 px-3 font-bold">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtRoutes.map((s, i) => (
                      <tr key={s.id} className={`border-b border-slate-100 dark:border-slate-800 ${i === 0 ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : i === 1 ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}`}>
                        <td className="py-2 px-3 font-black">{i + 1}</td>
                        <td className="py-2 pr-3 font-semibold text-slate-900 dark:text-white">{s.name}</td>
                        <td className="py-2 pr-3">{corridorStatusBadge(s)}</td>
                        <td className="py-2 pr-3 font-mono text-slate-600 dark:text-slate-300">{s.condition}/100</td>
                        <td className="py-2 pr-3 font-mono text-slate-600 dark:text-slate-300">{s.delayMinutes ?? 0} min</td>
                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">{s.riskScore ?? 0}/100</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right District Inspector Panel (1 Col) */}
        <div className="space-y-4">
          {/* Search & Status Filter */}
          <div className="p-4 bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 space-y-3">
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-slate-500" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter district or town..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex gap-0 border border-slate-300 dark:border-slate-600">
              <button
                type="button"
                onClick={() => {
                  if (!requireAuthAction('Filter Districts')) return;
                  setStatusFilter('ALL');
                }}
                className={`flex-1 py-2 text-[11px] font-bold border-r border-slate-300 dark:border-slate-600 transition-all cursor-pointer ${statusFilter === 'ALL'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
              >
                All ({filteredDistricts.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!requireAuthAction('Filter Districts')) return;
                  setStatusFilter('CRITICAL');
                }}
                className={`flex-1 py-2 text-[11px] font-bold border-r border-slate-300 dark:border-slate-600 transition-all cursor-pointer ${statusFilter === 'CRITICAL'
                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
              >
                Critical Risk
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!requireAuthAction('Filter Districts')) return;
                  setStatusFilter('GOOD');
                }}
                className={`flex-1 py-2 text-[11px] font-bold transition-all cursor-pointer ${statusFilter === 'GOOD'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
              >
                Good (70+)
              </button>
            </div>
          </div>

          {/* Selected District Detail Card */}
          {selectedDistrict ? (
            <div className="p-5 bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{selectedDistrict.name}</h3>
                    <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-slate-300 dark:border-slate-600">
                      {selectedDistrict.state}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Major Hub: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{selectedDistrict.majorTown}</strong>
                  </p>
                </div>
                <StatusBadge type="connectivity" value={getConnectivityStatus(selectedDistrict.connectivityScore)} />
              </div>

              {/* Accessibility Score Box - flat text row with badge */}
              <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex-wrap">
                <div className="flex-shrink-0">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-bold tracking-wider">
                    Accessibility Score
                  </p>
                  <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                    {selectedDistrict.connectivityScore}<span className="text-base text-slate-400 font-normal">/100</span>
                  </p>
                </div>
                <div className="text-right min-w-0">
                  <span className={`inline-block text-[11px] font-bold px-2.5 py-1 border ${
                    (100 - selectedDistrict.connectivityScore) <= 25
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                      : (100 - selectedDistrict.connectivityScore) <= 50
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                        : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700'
                  }`}>
                    {100 - selectedDistrict.connectivityScore}% Vulnerability — {(100 - selectedDistrict.connectivityScore) <= 25 ? 'Low Risk' : (100 - selectedDistrict.connectivityScore) <= 50 ? 'Medium Risk' : 'High Risk'}
                  </span>
                </div>
              </div>

              {/* 4 Metric Boxes with Icons */}
              <div className="grid grid-cols-2 gap-0 border border-slate-300 dark:border-slate-600 divide-x divide-y divide-slate-300 dark:divide-slate-600 text-xs">
                <div className="p-3 bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-bold">
                    <Mountain size={12} className="text-amber-500" />
                    <span>Terrain Type</span>
                  </div>
                  <p className="font-bold capitalize text-slate-900 dark:text-white mt-1 text-xs">
                    {selectedDistrict.terrain}
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-bold">
                    <Gauge size={12} className="text-blue-500" />
                    <span>Elevation</span>
                  </div>
                  <p className="font-bold font-mono text-slate-900 dark:text-white mt-1 text-xs">
                    {selectedDistrict.elevation} m ASL
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-bold">
                    <CloudRain size={12} className="text-indigo-500" />
                    <span>Annual Rain</span>
                  </div>
                  <p className="font-bold font-mono text-slate-900 dark:text-white mt-1 text-xs">
                    {selectedDistrict.avgRainfall} mm
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-bold">
                    <Users size={12} className="text-purple-500" />
                    <span>Population</span>
                  </div>
                  <p className="font-bold font-mono text-slate-900 dark:text-white mt-1 text-xs truncate">
                    {selectedDistrict.population.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Infrastructure Connectivity Badges */}
              <div className="space-y-0 border border-slate-300 dark:border-slate-600 divide-y divide-slate-300 dark:divide-slate-600 text-xs">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 p-3 bg-white dark:bg-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium flex-shrink-0">NH Highways:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 sm:text-right min-w-0 break-words">
                    {selectedDistrict.nhConnected.length > 0 ? selectedDistrict.nhConnected.join(', ') : 'None (State Road Only)'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <Train size={13} className="text-slate-400" />
                    <span>Railhead Access:</span>
                  </span>
                  <span className={`font-semibold px-2 py-0.5 text-[11px] border ${selectedDistrict.railConnected
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                      : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700'
                    }`}>
                    {selectedDistrict.railConnected ? 'Connected' : 'No Rail Connection'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <Plane size={13} className="text-slate-400" />
                    <span>Helipad / Airport:</span>
                  </span>
                  <span className={`font-semibold px-2 py-0.5 text-[11px] border ${selectedDistrict.airportNearby
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-600'
                    }`}>
                    {selectedDistrict.airportNearby ? 'Available' : 'Remote / No Airport'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
              Click any district on the map or list below to inspect infrastructure.
            </div>
          )}

          {/* District Selectable List */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 max-h-[300px] overflow-y-auto">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2 border-b border-slate-300 dark:border-slate-600 font-mono flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <span>Districts</span>
              <span className="text-[10px]">{filteredDistricts.length} results</span>
            </h4>
            {filteredDistricts.map((d) => (
              <div
                key={d.id}
                onClick={() => {
                  setSelectedDistrict(d);
                  setCustomCenter({ lat: d.lat, lng: d.lng });
                  setCustomZoom(16);
                  setCustomLocation({
                    name: d.name,
                    formattedAddress: `${d.name} (${d.majorTown}), ${d.state}, India • Elevation: ${d.elevation}m ASL`,
                    lat: d.lat,
                    lng: d.lng,
                  });
                }}
                className={`px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 last:border-b-0 cursor-pointer flex items-center justify-between transition-all ${selectedDistrict?.id === d.id
                    ? 'bg-slate-100 dark:bg-slate-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
              >
                <div>
                  <p className={`text-xs ${selectedDistrict?.id === d.id ? 'font-bold text-slate-900 dark:text-white' : 'font-bold text-slate-900 dark:text-white'}`}>
                    {d.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {d.majorTown}, {d.state}
                  </p>
                </div>
                <div className="text-right flex items-center gap-1.5">
                  <span
                    className={`text-[11px] font-bold font-mono px-2 py-0.5 border ${d.connectivityScore >= 75
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                        : d.connectivityScore >= 50
                          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                          : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700'
                      }`}
                  >
                    {d.connectivityScore}%
                  </span>
                  <ChevronRight size={14} className={selectedDistrict?.id === d.id ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 group-hover:translate-x-0.5 transition-transform'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

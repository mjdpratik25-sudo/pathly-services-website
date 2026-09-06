// ============================================================
// AccessibilityMap: District-level GIS & Topological Road Surveillance
// ============================================================

import React, { useState, useEffect } from 'react';
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
  ChevronRight
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
  getConnectivityStatus
} from '../data/nerData';
import { useVehicleTracking } from '../hooks/useVehicleTracking';
import { useAlerts } from '../hooks/useAlerts';

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
          onClick={() => {
            setSelectedState('ALL');
            setCustomCenter({ lat: STATE_CENTERS.ALL.lat, lng: STATE_CENTERS.ALL.lng });
            setCustomZoom(STATE_CENTERS.ALL.zoom);
          }}
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
              onClick={() => {
                setSelectedState(st.name);
                const c = STATE_CENTERS[st.name];
                setCustomCenter({ lat: c.lat, lng: c.lng });
                setCustomZoom(c.zoom);
              }}
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
          <div className="overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 h-[420px] sm:h-[520px] lg:h-[680px]">
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
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-2 text-[11px] font-bold border-r border-slate-300 dark:border-slate-600 transition-all cursor-pointer ${statusFilter === 'ALL'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
              >
                All ({filteredDistricts.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('CRITICAL')}
                className={`flex-1 py-2 text-[11px] font-bold border-r border-slate-300 dark:border-slate-600 transition-all cursor-pointer ${statusFilter === 'CRITICAL'
                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
              >
                Critical Risk
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('GOOD')}
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

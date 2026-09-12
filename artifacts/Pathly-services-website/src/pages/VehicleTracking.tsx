// ============================================================
// VehicleTracking: GPS Cargo Tracking & Fleet Surveillance System
// ============================================================

import React, { useState } from 'react';
import { 
  Truck, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Fuel, 
  AlertTriangle, 
  Phone, 
  Navigation, 
  ShieldAlert, 
  Activity, 
  ChevronRight,
  Package,
  Layers
} from 'lucide-react';
import NERMap from '../components/maps/NERMap';
import GoogleNERMap from '../components/maps/GoogleNERMap';
import TacticalNERMap from '../components/maps/TacticalNERMap';
import StatusBadge from '../components/common/StatusBadge';
import CargoManifest from '../components/tracking/CargoManifest';
import DataProvenance from '../components/common/DataProvenance';
import { useVehicleTracking } from '../hooks/useVehicleTracking';
import { type CargoType, type Vehicle, gpsSourceLabel, type GpsSource, getCargoIcon } from '../data/nerData';
import { requireAuthAction } from '../lib/authGate';

const SOURCE_TAG_STYLE: Record<GpsSource, string> = {
  simulator: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30',
  driver_mobile: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30',
  real: 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-500/10 border-sky-300 dark:border-sky-500/30',
};

function SourceTag({ source }: { source?: GpsSource }) {
  const label = gpsSourceLabel(source);
  const style = SOURCE_TAG_STYLE[source ?? 'simulator'];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[8px] font-mono font-bold uppercase tracking-wide ${style}`}>
      {label}
    </span>
  );
}

export default function VehicleTracking({ isSidebarOpen = true }: { isSidebarOpen?: boolean }) {
  const { 
    vehicles, 
    selectedVehicle, 
    setSelectedVehicle, 
    activeVehicles, 
    delayedVehicles, 
    emergencyVehicles,
    serverOnline
  } = useVehicleTracking();

  const [cargoFilter, setCargoFilter] = useState<CargoType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'in_transit' | 'delayed' | 'stopped'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapEngine, setMapEngine] = useState<'google' | 'tactical'>('google');

  // Guest view-only: opening an order's detail/action panel requires sign-in.
  const handleSelectVehicle = (v: Vehicle) => {
    if (!requireAuthAction('Track Orders')) return;
    setSelectedVehicle(v);
  };

  const handleSetCargoFilter = (f: CargoType | 'ALL') => {
    if (!requireAuthAction('Filter Fleet')) return;
    setCargoFilter(f);
  };

  // Parse URL search parameters (e.g. ?vehicle=NER-V003 or ?search=ORD-TR-7821)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vId = params.get('vehicle');
    const q = params.get('search') || params.get('q');

    if (vId) {
      const found = vehicles.find(v => v.id === vId || v.registrationNo === vId);
      if (found) {
        setSelectedVehicle(found);
      }
    }

    if (q) {
      setSearchQuery(q);
      const qLower = q.toLowerCase();
      const matched = vehicles.find(v =>
        (v.orderToken && v.orderToken.toLowerCase() === qLower) ||
        v.registrationNo.toLowerCase().includes(qLower) ||
        v.id.toLowerCase() === qLower
      );
      if (matched) {
        setSelectedVehicle(matched);
      }
    }
  }, [vehicles, setSelectedVehicle]);

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (cargoFilter !== 'ALL' && v.cargoType !== cargoFilter) return false;
    if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (v.orderToken && v.orderToken.toLowerCase().includes(q)) ||
        v.registrationNo.toLowerCase().includes(q) ||
        v.driverName.toLowerCase().includes(q) ||
        v.origin.toLowerCase().includes(q) ||
        v.destination.toLowerCase().includes(q) ||
        v.cargoDescription.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-blue-200/60 dark:border-slate-700 bg-gradient-to-r from-blue-50/80 via-white to-emerald-50/60 dark:from-blue-950/40 dark:via-slate-900 dark:to-emerald-950/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
              GPS Satellite Telemetry
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            Essential Commodity Fleet & GPS Movement Tracking
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Live positioning of trucks, mini-trucks, and medical refrigeration vans carrying life-saving supplies across remote districts.
          </p>
          <div className="mt-1.5">
            <DataProvenance
              source={serverOnline ? 'LIVE API' : 'STANDBY'}
              basis={serverOnline ? 'real GPS telemetry pipeline (device pings persisted server-side)' : 'no live GPS uplink configured — position cache in standby'}
              updatedBy="Telemetry Service"
              updatedAt="5s refresh cadence"
            />
          </div>
        </div>

        {/* Quick KPI pills */}
        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 font-mono font-bold shadow-xs">
            <strong>{activeVehicles.length}</strong> In Transit
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 font-mono font-bold shadow-xs">
            <strong>{delayedVehicles.length}</strong> Delayed
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-red-950/40 border border-rose-200 dark:border-red-500/30 text-rose-700 dark:text-red-400 font-mono font-bold shadow-xs">
            <strong>{emergencyVehicles.length}</strong> Priority Emergency
          </div>
        </div>
      </div>

      {/* Main Grid: Fleet List + Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Vehicle List & Filters (1 Col) */}
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-white via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search registration, driver, town..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-[hsl(var(--muted))]/60 border border-slate-200 dark:border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
              />
            </div>

            {/* Cargo Category Pills with Bright Surrounding Colors */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <button
                onClick={() => handleSetCargoFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
                  cargoFilter === 'ALL'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/20'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60'
                }`}
              >
                All Fleet
              </button>
              <button
                onClick={() => handleSetCargoFilter('medicines')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
                  cargoFilter === 'medicines'
                    ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/25 ring-1 ring-rose-400/20'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60'
                }`}
              >
                💊 Medicines
              </button>
              <button
                onClick={() => handleSetCargoFilter('food_supplies')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
                  cargoFilter === 'food_supplies'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25 ring-1 ring-amber-400/20'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/60'
                }`}
              >
                🍚 Food
              </button>
              <button
                onClick={() => handleSetCargoFilter('agricultural')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
                  cargoFilter === 'agricultural'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400/20'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60'
                }`}
              >
                🌾 Agri
              </button>
              <button
                onClick={() => handleSetCargoFilter('construction')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
                  cargoFilter === 'construction'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25 ring-1 ring-purple-400/20'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/60'
                }`}
              >
                🏗️ Materials
              </button>
            </div>
          </div>

          {/* Vehicle List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredVehicles.map((v) => {
              const isSelected = selectedVehicle?.id === v.id;

              return (
                <div
                  key={v.id}
                  onClick={() => handleSelectVehicle(v)}
                  className={`p-3.5 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50/90 to-indigo-50/40 dark:bg-blue-950/20 shadow-lg shadow-blue-500/10 ring-2 ring-blue-400/20'
                      : 'border-slate-200 dark:border-[hsl(var(--border))] hover:border-blue-400 dark:hover:border-slate-500 bg-white dark:bg-[hsl(var(--card))] shadow-xs hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl flex-shrink-0">{getCargoIcon(v.cargoType)}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-mono font-bold text-xs text-slate-900 dark:text-white">{v.registrationNo}</h4>
                          {v.priority === 'emergency' && (
                            <span className="text-[9px] font-bold text-rose-700 dark:text-red-400 bg-rose-100 dark:bg-red-500/10 px-1.5 py-0.5 rounded border border-rose-300 dark:border-red-500/30">
                              SOS
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 break-words">{v.driverName} • {v.origin} ➔ {v.destination}</p>
                        <div className="mt-1"><SourceTag source={v.source} /></div>
                      </div>
                    </div>
                    <StatusBadge type="vehicle" value={v.status} />
                  </div>

                  {/* Progress & Speed */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex justify-between gap-2 text-[11px] font-mono flex-wrap">
                      <span className="text-slate-500 dark:text-slate-400">Progress: {v.progress}%</span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">{v.speed} km/h • ETA: {v.eta}{v.distanceTripKm !== undefined ? ` • ${v.distanceTripKm} km trip` : ''}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                        style={{ width: `${v.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Full Interactive Map (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase">Live Fleet Positioning Radar</span>
            </div>

            {/* Engine Switcher */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-xs flex-shrink-0">
              <button
                onClick={() => setMapEngine('google')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  mapEngine === 'google'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🗺️ Google Maps
              </button>
              <button
                onClick={() => setMapEngine('tactical')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  mapEngine === 'tactical'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🛰️ Tactical GIS
              </button>
            </div>
          </div>

          {mapEngine === 'google' ? (
            <GoogleNERMap
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={(v: Vehicle) => handleSelectVehicle(v)}
              showRoads={true}
              showVehicles={true}
              showAlerts={true}
              isSidebarOpen={isSidebarOpen}
              height="620px"
            />
          ) : (
            <TacticalNERMap
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={(v: Vehicle) => handleSelectVehicle(v)}
              showRoads={true}
              showVehicles={true}
              showAlerts={true}
              height="620px"
            />
          )}
        </div>
      </div>

      {/* Manifest Modal */}
      <CargoManifest
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onReroute={(v) => {
          setSelectedVehicle(null);
          alert(`Rerouting vehicle ${v.registrationNo} to alternate corridor via Route Optimizer.`);
        }}
      />
    </div>
  );
}

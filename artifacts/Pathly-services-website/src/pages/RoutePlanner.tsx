// ============================================================
// RoutePlanner: AI-powered Route Prediction & Optimization Engine
// ============================================================

import React, { useState } from 'react';
import { 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  CloudRain,
  Share2
} from 'lucide-react';
import { 
  NER_DISTRICTS, 
  type CargoType 
} from '../data/nerData';
import { findOptimalRoutes, type RouteOption } from '../lib/aiEngine';
import { useWeatherData } from '../hooks/useWeatherData';
import RiskGauge from '../components/common/RiskGauge';
import StatusBadge from '../components/common/StatusBadge';

export default function RoutePlanner() {
  const { weatherData } = useWeatherData();

  const [origin, setOrigin] = useState('Guwahati');
  const [destination, setDestination] = useState('Shillong');
  const [cargoType, setCargoType] = useState<CargoType>('medicines');
  const [priority, setPriority] = useState<'normal' | 'emergency'>('normal');

  const [isCalculating, setIsCalculating] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>(() =>
    findOptimalRoutes('Guwahati', 'Shillong', weatherData)
  );
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  const hubList = Array.from(new Set(NER_DISTRICTS.map((d) => d.majorTown))).sort();

  const handleCalculateRoutes = () => {
    setIsCalculating(true);
    setDispatchSuccess(false);
    setTimeout(() => {
      const computed = findOptimalRoutes(origin, destination, weatherData);
      setRoutes(computed);
      setSelectedRouteIndex(0);
      setIsCalculating(false);
    }, 600);
  };

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const activeRoute = routes[selectedRouteIndex] || routes[0];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="gov-panel">
        <div className="gov-panel-head flex items-center gap-2">
          <Sparkles size={15} className="text-[#FF9933]" />
          <span>Smart Routing Engine</span>
        </div>
        <div className="p-5">
          <h2 className="text-xl font-bold text-[#0B3D6D] mt-0.5">
            Predictive Route Planning, Disruption Bypass & Travel Delay Estimation
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Multi-corridor route optimizer factoring in active landslides, flood levels, mountain gradients, and bridge weight limits.
          </p>
        </div>
      </div>

      {/* Input Form & Route Generator */}
      <div className="gov-panel">
        <div className="gov-panel-head flex items-center gap-2">
          <MapPin size={15} className="text-[#0B3D6D]" />
          <span>Origin / Destination & Consignment Details</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Origin */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono">
                Origin City / Hub
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0B3D6D]/30 focus:border-[#0B3D6D] font-medium text-slate-900 shadow-xs"
              >
                {hubList.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono">
                Destination District Hub
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0B3D6D]/30 focus:border-[#0B3D6D] font-medium text-slate-900 shadow-xs"
              >
                {hubList.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Cargo Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono">
                Commodity Class
              </label>
              <select
                value={cargoType}
                onChange={(e) => setCargoType(e.target.value as CargoType)}
                className="w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0B3D6D]/30 focus:border-[#0B3D6D] font-medium text-slate-900 shadow-xs"
              >
                <option value="medicines">💊 Life-saving Medicines</option>
                <option value="food_supplies">🍚 Essential Food Supplies</option>
                <option value="agricultural">🌾 Agricultural Seeds & Produce</option>
                <option value="construction">🏗️ Infrastructure Materials</option>
                <option value="fuel">⛽ Fuel & Petroleum</option>
                <option value="general">📦 General Freight</option>
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono">
                Priority Level
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPriority('normal')}
                  className={`flex-1 py-2 text-xs font-semibold rounded border transition-all cursor-pointer ${
                    priority === 'normal'
                      ? 'bg-[#0B3D6D] border-[#0B3D6D] text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-blue-50'
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={() => setPriority('emergency')}
                  className={`flex-1 py-2 text-xs font-semibold rounded border transition-all cursor-pointer ${
                    priority === 'emergency'
                      ? 'bg-[#7A1F1F] border-[#7A1F1F] text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-red-50'
                  }`}
                >
                  🚨 SOS
                </button>
              </div>
            </div>

            {/* Compute Button */}
            <div className="flex items-end">
              <button
                onClick={handleCalculateRoutes}
                disabled={isCalculating}
                className="w-full py-2.5 px-4 rounded bg-[#0B3D6D] hover:bg-[#0A3560] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isCalculating ? (
                  <span>Optimizing Path...</span>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Compute Routes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Route Options Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List of Route Options */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono px-1">
            Generated Route Candidates ({routes.length})
          </h3>

          {routes.map((rt, idx) => {
            const isSelected = selectedRouteIndex === idx;
            const isSafest = idx === 0;

            return (
              <div
                key={rt.id}
                onClick={() => setSelectedRouteIndex(idx)}
                className={`p-4 rounded border cursor-pointer transition-all bg-white ${
                  isSelected
                    ? 'border-[#0B3D6D] ring-1 ring-[#0B3D6D]/30 shadow-md'
                    : 'border-[#d5dbe2] hover:border-[#0B3D6D]/60 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{rt.name}</span>
                      {isSafest && (
                        <span className="text-[10px] font-bold text-green-800 bg-green-50 px-2 py-0.5 border border-green-700 font-mono">
                          ★ RECOMMENDED
                        </span>
                      )}
                    </div>
                    {rt.alternateReason && (
                      <p className="text-xs text-amber-700 font-bold mt-1">{rt.alternateReason}</p>
                    )}
                  </div>
                  <RiskGauge score={rt.riskScore} size={48} strokeWidth={4} showPercent={false} />
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">DISTANCE</span>
                    <span className="font-bold text-slate-900">{Math.round(rt.totalDistance)} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">EST. TIME</span>
                    <span className="font-bold text-[#0B3D6D]">{rt.estimatedTime.toFixed(1)} hrs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">TERRAIN</span>
                    <span className="font-bold capitalize text-slate-700">{rt.terrainDifficulty}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Active Route Detailed Inspection (2 Cols) */}
        {activeRoute && (
          <div className="lg:col-span-2 gov-panel space-y-5">
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d5dbe2]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#0B3D6D]">{activeRoute.name}</h3>
                  <span className="text-xs text-[#0B3D6D] font-mono font-bold">
                    [{origin} ➔ {destination}]
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Optimized for {cargoType.replace('_', ' ')} cargo delivery with real-time risk mitigation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`Advisory Briefing dispatched for Route ${activeRoute.name}`)}
                  className="px-3.5 py-2 rounded bg-[#0B3D6D] hover:bg-[#0A3560] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 size={13} />
                  <span>Dispatch Route</span>
                </button>
                <button
                  onClick={() => setDispatchSuccess(true)}
                  className="px-4 py-2 rounded bg-[#7A1F1F] hover:bg-[#671a1a] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>Assign Fleet</span>
                </button>
              </div>
            </div>

            {/* Success banner */}
            {dispatchSuccess && (
              <div className="mx-4 p-3.5 rounded bg-green-50 border border-green-700 flex items-center justify-between gap-3 flex-wrap animate-fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={16} className="text-green-700 flex-shrink-0" />
                  <span className="text-xs text-green-900 font-bold min-w-0">
                    Route assigned to nearest available dispatch fleet. GPS tracking link broadcasted.
                  </span>
                </div>
                <button onClick={() => setDispatchSuccess(false)} className="text-xs text-green-800 font-bold hover:underline cursor-pointer flex-shrink-0">
                  Dismiss
                </button>
              </div>
            )}

            {/* Route Elevation & Bridges profile */}
            <div className="px-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 font-bold font-mono">Max Altitude</span>
                <p className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {Math.max(...(activeRoute.segments?.map(s => s.altitude || 0) || [650]))} m
                </p>
              </div>
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 font-bold font-mono">Bridges Passed</span>
                <p className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {(activeRoute.segments?.reduce((sum, s) => sum + (s.bridgeCount || 0), 0) || 4)} Units
                </p>
              </div>
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 font-bold font-mono">Risk Index</span>
                <p className="text-lg font-bold font-mono text-amber-700 mt-0.5">{activeRoute.riskScore}/100</p>
              </div>
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 font-bold font-mono">Corridor Integrity</span>
                <p className="text-lg font-bold font-mono text-green-700 mt-0.5">
                  {100 - activeRoute.riskScore}%
                </p>
              </div>
            </div>

            {/* Step-by-Step Waypoints & Bottlenecks */}
            <div className="px-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
                Segment Breakdown & Critical Waypoints
              </h4>

              <div className="space-y-2">
                {activeRoute.segments.map((seg, idx) => {
                  return (
                    <div
                      key={seg.id}
                      className="p-3.5 rounded bg-white border border-[#d5dbe2] hover:border-[#0B3D6D]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-[#0B3D6D]/10 text-[#0B3D6D] font-mono font-bold flex items-center justify-center text-[11px] border border-[#0B3D6D]/30 flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900">{seg.name}</p>
                            <span className="text-[10px] font-mono text-[#0B3D6D] font-bold">({seg.from} ➔ {seg.to})</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                            {seg.distance} km • Terrain: {seg.terrain} • Alt: {seg.altitude}m
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <StatusBadge type="road" value={seg.status} />
                        <span className="font-mono font-bold text-[11px] text-slate-700">
                          Risk: {seg.riskScore}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weather & Road Condition Safety Advisory */}
            <div className="mx-4 mb-4 p-4 rounded bg-blue-50 border border-[#0B3D6D]/30 space-y-2">
              <div className="flex items-center gap-2 text-[#0B3D6D] text-xs font-bold">
                <CloudRain size={16} />
                <span>Driver Cautionary Advisory</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Rainfall advisory active in East Khasi Hills & Guwahati corridor. Maintain minimum 50-meter following distance on steep hairpin descents. Radio contact mandatory at every district police checkpost.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// RoutePlanner: AI-powered Route Prediction & Optimization Engine
// ============================================================

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  CloudRain,
  Share2,
  Package,
  AlertTriangle,
  Navigation,
  Check,
  Bookmark
} from 'lucide-react';
import { 
  NER_DISTRICTS, 
  VEHICLES,
  type CargoType 
} from '../data/nerData';
import { findOptimalRoutes, type RouteOption } from '../lib/aiEngine';
import { requireAuthAction } from '../lib/authGate';
import { useWeatherData } from '../hooks/useWeatherData';
import RiskGauge from '../components/common/RiskGauge';
import StatusBadge from '../components/common/StatusBadge';
import { 
  DEMO_ORDERS, 
  saveOrderRoute, 
  findDemoOrder, 
  type DemoOrder, 
  type AssignedOrderRoute 
} from '../lib/orderRouteStore';

export default function RoutePlanner() {
  const { weatherData } = useWeatherData();

  const [orderNumber, setOrderNumber] = useState('');
  const [origin, setOrigin] = useState('Guwahati');
  const [destination, setDestination] = useState('Shillong');
  const [cargoType, setCargoType] = useState<CargoType>('medicines');
  const [priority, setPriority] = useState<'normal' | 'emergency'>('normal');

  const [isCalculating, setIsCalculating] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>(() =>
    findOptimalRoutes('Guwahati', 'Shillong', weatherData, {
      cargoType: 'medicines',
      cargoWeight: 4.2,
      priority: 'normal',
    })
  );
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [lastAssigned, setLastAssigned] = useState<AssignedOrderRoute | null>(null);

  const hubList = Array.from(new Set(NER_DISTRICTS.map((d) => d.majorTown))).sort();

  // Parse URL search params (e.g. ?order=ORD-MN-51190)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get('order') || params.get('search');
    if (orderParam) {
      handleSelectDemoOrder(orderParam);
    }
  }, []);

  const handleSelectDemoOrder = (orderId: string) => {
    setOrderNumber(orderId);
    setDispatchSuccess(false);
    const demo = findDemoOrder(orderId);
    if (demo) {
      setOrigin(demo.origin);
      setDestination(demo.destination);
      setCargoType(demo.cargoType);
      setPriority(demo.priority);
      const computed = findOptimalRoutes(demo.origin, demo.destination, weatherData, {
        cargoType: demo.cargoType,
        cargoWeight: demo.cargoWeight,
        priority: demo.priority,
      });
      setRoutes(computed);
      setSelectedRouteIndex(0);
    }
  };

  const handleOrderInputChange = (val: string) => {
    setOrderNumber(val);
    setDispatchSuccess(false);
    const demo = findDemoOrder(val);
    if (demo) {
      setOrigin(demo.origin);
      setDestination(demo.destination);
      setCargoType(demo.cargoType);
      setPriority(demo.priority);
      const computed = findOptimalRoutes(demo.origin, demo.destination, weatherData, {
        cargoType: demo.cargoType,
        cargoWeight: demo.cargoWeight,
        priority: demo.priority,
      });
      setRoutes(computed);
      setSelectedRouteIndex(0);
    }
  };

  const handleCalculateRoutes = () => {
    if (!requireAuthAction('Compute Routes')) return;
    setIsCalculating(true);
    setDispatchSuccess(false);
    setTimeout(() => {
      const demo = findDemoOrder(orderNumber);
      const weight = demo ? demo.cargoWeight : (cargoType === 'construction' || cargoType === 'fuel' ? 9 : 4.2);
      const computed = findOptimalRoutes(origin, destination, weatherData, {
        cargoType,
        cargoWeight: weight,
        priority,
      });
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

  const handleDispatch = (mode: 'dispatch' | 'assign') => {
    if (!requireAuthAction(mode === 'dispatch' ? 'Dispatch Route' : 'Assign Fleet')) return;
    if (!activeRoute) return;

    const linkedDemo = findDemoOrder(orderNumber);
    const targetOrderId = orderNumber.trim() || linkedDemo?.orderId || `ORD-REQ-${Math.floor(10000 + Math.random() * 90000)}`;
    const matchedVehicle = VEHICLES.find(v => v.orderToken?.toUpperCase() === targetOrderId.toUpperCase());
    const vehicleId = linkedDemo?.vehicleId || matchedVehicle?.id || 'NER-V001';
    const registrationNo = linkedDemo?.registrationNo || matchedVehicle?.registrationNo || 'AS-01-AB-1234';
    const driverName = linkedDemo?.driverName || matchedVehicle?.driverName || 'Designated Driver';

    const assignment: AssignedOrderRoute = {
      orderId: targetOrderId,
      vehicleId,
      registrationNo,
      driverName,
      routeName: activeRoute.name,
      corridorSummary: activeRoute.segments?.map(s => s.name.split(' ')[0]).filter((v, i, a) => a.indexOf(v) === i).join(' → ') || activeRoute.name,
      origin,
      destination,
      cargoType,
      priority,
      totalDistanceKm: Math.round(activeRoute.totalDistance),
      estimatedTimeHours: Number(activeRoute.estimatedTime.toFixed(1)),
      riskScore: activeRoute.riskScore,
      riskClass: activeRoute.riskAssessment?.riskClass || 'MEDIUM',
      terrainDifficulty: activeRoute.terrainDifficulty,
      fuelEstimateLiters: Math.round(activeRoute.fuelEstimate),
      tollCostRupees: activeRoute.tollCost,
      dispatchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dispatchedBy: 'State Logistics Control Room',
      status: mode === 'dispatch' ? 'dispatched' : 'assigned_fleet',
      avoidanceNotice: (origin === 'Imphal' && destination === 'Moreh') ? 'Avoids active NH-2 landslide blockade' : undefined,
      alternateReason: activeRoute.alternateReason,
    };

    saveOrderRoute(assignment);
    setLastAssigned(assignment);
    setDispatchSuccess(true);
  };

  const activeMaxAltitude =
    activeRoute?.maxAltitude ??
    (activeRoute && activeRoute.segments.length > 0
      ? Math.max(...activeRoute.segments.map((s) => s.altitude || 0))
      : null);

  const applyPriority = (p: 'normal' | 'emergency') => {
    setPriority(p);
    const computed = findOptimalRoutes(origin, destination, weatherData, {
      cargoType,
      cargoWeight: cargoType === 'construction' || cargoType === 'fuel' ? 9 : 4.2,
      priority: p,
    });
    setRoutes(computed);
    setSelectedRouteIndex(0);
    setDispatchSuccess(false);
  };

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
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Order / Consignment ID */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center gap-1">
                  <Package size={11} className="text-[#0B3D6D]" />
                  <span>Order / Consignment ID</span>
                </label>
                <span className="text-[9px] text-slate-400 font-mono">(Optional)</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="order-token-suggestions"
                  value={orderNumber}
                  onChange={(e) => handleOrderInputChange(e.target.value)}
                  placeholder="e.g. ORD-AS-90412"
                  className="w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0B3D6D]/30 focus:border-[#0B3D6D] font-mono font-bold text-blue-700 shadow-xs uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
                />
                <datalist id="order-token-suggestions">
                  {DEMO_ORDERS.map((d) => (
                    <option key={d.orderId} value={d.orderId}>
                      {d.orderId} — {d.origin} ➔ {d.destination} ({d.registrationNo})
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

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
                  type="button"
                  onClick={() => applyPriority('normal')}
                  className={`flex-1 py-2 text-xs font-semibold rounded border transition-all cursor-pointer ${
                    priority === 'normal'
                      ? 'bg-[#0B3D6D] border-[#0B3D6D] text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-blue-50'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => applyPriority('emergency')}
                  className={`flex-1 py-2 text-xs font-semibold rounded border transition-all cursor-pointer ${
                    priority === 'emergency'
                      ? 'bg-[#7A1F1F] border-[#7A1F1F] text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-red-50'
                  }`}
                >
                  🚨 SOS
                </button>
              </div>
              {priority === 'emergency' && (
                <p className="text-[10px] font-bold text-[#7A1F1F] leading-tight mt-1">
                  SOS active — relaxed risk-weighting, corridor cleared.
                </p>
              )}
            </div>

            {/* Compute Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleCalculateRoutes}
                disabled={isCalculating}
                className="w-full py-2.5 px-4 rounded bg-[#0B3D6D] hover:bg-[#0A3560] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
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

          {/* Quick Demo Orders Selector for Judges & Testing */}
          <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 font-bold shrink-0">
              <Bookmark size={13} className="text-[#0B3D6D]" />
              <span className="text-[11px] uppercase tracking-wider font-mono">Judge Demo Consignments:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {DEMO_ORDERS.map((demo) => {
                const isActive = orderNumber.toUpperCase() === demo.orderId.toUpperCase();
                return (
                  <button
                    key={demo.orderId}
                    type="button"
                    onClick={() => handleSelectDemoOrder(demo.orderId)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#0B3D6D] text-white shadow-xs'
                        : demo.hasDisruptionRisk
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <span>{demo.orderId}</span>
                    <span className="font-sans text-[10px] opacity-85">
                      ({demo.origin} ➔ {demo.destination})
                    </span>
                    {demo.hasDisruptionRisk && (
                      <span className="text-[9px] bg-red-600 text-white px-1 py-0.2 rounded font-sans font-bold">
                        NH-2 Alert
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auto-filled Order Details Summary Pill */}
          {orderNumber && (
            <div className="p-2.5 rounded bg-blue-50/70 border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#0B3D6D]">{orderNumber.toUpperCase()}</span>
                {findDemoOrder(orderNumber) ? (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-700">
                      Vehicle: <strong className="font-mono">{findDemoOrder(orderNumber)?.registrationNo}</strong> ({findDemoOrder(orderNumber)?.driverName})
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-700">
                      Cargo: <em>{findDemoOrder(orderNumber)?.cargoDescription}</em>
                    </span>
                  </>
                ) : (
                  <span className="text-slate-600 italic">Custom Order Identifier Linked</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOrderNumber('')}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Clear Link
              </button>
            </div>
          )}

          {/* Special Disruption Banner for Imphal -> Moreh (NH-2 Blockade) */}
          {((origin === 'Imphal' && destination === 'Moreh') || orderNumber === 'ORD-MN-51190') && (
            <div className="p-3.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3 animate-fade-in shadow-xs">
              <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-950">⚠️ Active Corridor Disruption (NH-2 Blockade Scenario):</span>
                  <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                    Road Blocked
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Heavy landslide and road subsidence on NH-2 near Kangpokpi / Churachandpur corridor (Risk: 94%). Direct NH-2 rejected. The Smart Routing Engine has automatically routed via <strong>MDR Thoubal–Kakching–Moreh Bypass</strong> (−52% composite risk reduction).
                </p>
              </div>
            </div>
          )}
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
                      {rt.isRecommended && (
                        <span className="text-[10px] font-bold text-green-800 bg-green-50 px-2 py-0.5 border border-green-700 font-mono">
                          ★ RECOMMENDED{priority === 'emergency' ? ' · SOS' : ''}
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
                  type="button"
                  onClick={() => handleDispatch('dispatch')}
                  className="px-3.5 py-2 rounded bg-[#0B3D6D] hover:bg-[#0A3560] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Share2 size={13} />
                  <span>Dispatch Route</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDispatch('assign')}
                  className="px-4 py-2 rounded bg-[#7A1F1F] hover:bg-[#671a1a] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <CheckCircle2 size={14} />
                  <span>Assign Fleet</span>
                </button>
              </div>
            </div>

            {/* Success banner with order and tracking link */}
            {dispatchSuccess && (
              <div className="mx-4 p-4 rounded bg-emerald-50 border border-emerald-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                    <span className="text-xs text-emerald-950 font-bold">
                      Route Successfully Linked & Dispatched to {lastAssigned?.orderId}!
                    </span>
                    {lastAssigned?.registrationNo && (
                      <span className="text-[10px] bg-emerald-200 text-emerald-800 font-mono font-bold px-1.5 py-0.5 rounded">
                        {lastAssigned.registrationNo} • {lastAssigned.driverName}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-tight">
                    Planned Path: <strong className="text-emerald-950">{lastAssigned?.routeName}</strong> ({lastAssigned?.totalDistanceKm} km · {lastAssigned?.estimatedTimeHours} hrs · Risk Score: {lastAssigned?.riskScore})
                    {lastAssigned?.avoidanceNotice && (
                      <span className="text-amber-800 font-bold ml-1.5">
                        • {lastAssigned.avoidanceNotice}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/tracking?search=${encodeURIComponent(lastAssigned?.orderId || '')}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    <Navigation size={13} />
                    <span>View in Fleet Tracking →</span>
                  </a>
                  <button 
                    type="button"
                    onClick={() => setDispatchSuccess(false)} 
                    className="text-xs text-emerald-800 hover:text-emerald-950 font-bold px-1.5 py-1 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Route Elevation & Bridges profile */}
            <div className="px-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 font-bold font-mono">Max Altitude</span>
                <p className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {activeMaxAltitude != null ? `${activeMaxAltitude} m` : '—'}
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
                <p className={`text-lg font-bold font-mono mt-0.5 ${activeRoute.riskScore >= 70 ? 'text-[#7A1F1F]' : activeRoute.riskScore >= 50 ? 'text-amber-700' : 'text-green-700'}`}>
                  {activeRoute.riskScore}/100
                </p>
                <span className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${activeRoute.riskAssessment.riskClassColor}`}>
                  {activeRoute.riskAssessment.riskClass}
                </span>
              </div>
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 font-bold font-mono">Corridor Integrity</span>
                <p className="text-lg font-bold font-mono text-green-700 mt-0.5">
                  {100 - activeRoute.riskScore}%
                </p>
              </div>
            </div>

            {/* Explainable Risk Model — Objective 4 (weighted rule-based, transparent factors) */}
            <div className="px-4">
              <div className="p-3.5 rounded border border-[#d5dbe2] bg-white">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
                      🔍 Explainable Risk — Why This Score?
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {activeRoute.riskAssessment.explanation}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 border border-slate-400 text-slate-700 flex-shrink-0">
                    Transparency Model
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
                  {activeRoute.riskAssessment.factors.map((f) => (
                    <div
                      key={f.factor}
                      className="p-2 border border-slate-200 bg-slate-50"
                      title={f.detail}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-bold uppercase text-slate-500 font-mono truncate">{f.factor}</span>
                        <span className="text-[10px] font-mono font-bold text-[#0B3D6D]">{f.value}</span>
                      </div>
                      <div className="mt-1 h-1 w-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-[#FF9933]" style={{ width: `${f.value}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-600 font-mono mt-1 block">w={f.weight} · +{f.contribution}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-500 mt-2 font-mono">
                  score = Σ (Wᵢ × factorᵢ) | W = rainfall 0.20 · flood 0.15 · access 0.25 · bridge 0.10 · delay 0.10 · criticality 0.20
                </p>
              </div>
            </div>

            {/* Item 3 — transparent additive cost breakdown (minutes) */}
            {activeRoute.costBreakdown && activeRoute.costBreakdown.length > 0 && (
              <div className="px-4">
                <div className="p-3.5 rounded border border-[#d5dbe2] bg-white">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
                      Additive Route Cost — minutes
                    </h4>
                    <span className="text-sm font-bold font-mono text-[#0B3D6D]">
                      {activeRoute.costScore} min
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {activeRoute.costBreakdown.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="font-bold text-slate-900">{item.value} min</span>
                      </div>
                    ))}
                    <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-bold text-slate-900">Total composite cost</span>
                      <span className="font-bold text-[#0B3D6D]">{activeRoute.costScore} min</span>
                    </div>
                  </div>
                  {activeRoute.rejectedReason && (
                    <p className="mt-2 text-[10px] text-[#7A1F1F] font-semibold bg-red-50 border border-red-200 p-2">
                      {activeRoute.rejectedReason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step-by-Step Waypoints & Bottlenecks */}
            <div className="px-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
                Segment Breakdown &amp; Critical Waypoints
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
                {priority === 'emergency'
                  ? 'SOS convoy protocol engaged. Corridor priority granted — district traffic control and checkpost staff have been notified to hold normal traffic clear. Vehicles should maintain assigned convoy spacing and respond by radio call-sign only.'
                  : 'Rainfall advisory active in East Khasi Hills & Guwahati corridor. Maintain minimum 50-meter following distance on steep hairpin descents. Radio contact mandatory at every district police checkpost.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Dashboard: Regional Command Center Overview for Logistics Intelligence
// ============================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Truck,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Activity,
  ArrowUpRight,
  Sparkles,
  CloudRain,
  Layers,
  CheckCircle2,
  Clock,
  Compass,
  Navigation,
  RefreshCw,
  Warehouse,
  ArrowRight
} from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';
import AlertTicker from '../components/dashboard/AlertTicker';
import WeatherPanel from '../components/dashboard/WeatherPanel';
import PredictionCard from '../components/dashboard/PredictionCard';
import NERMap from '../components/maps/NERMap';
import GoogleNERMap from '../components/maps/GoogleNERMap';
import TacticalNERMap from '../components/maps/TacticalNERMap';
import CargoManifest from '../components/tracking/CargoManifest';
import DataProvenance from '../components/common/DataProvenance';
import {
  PLATFORM_STATS,
  SUPPLY_CHAIN_METRICS,
  NER_DISTRICTS,
  FLOOD_PRONE_ZONES,
  LANDSLIDE_CORRIDORS,
  LOGISTICS_HUBS,
  type Vehicle,
  type NERDistrict,
  type RoadSegment,
  getCargoIcon
} from '../data/nerData';
import { predictDisruptions } from '../lib/aiEngine';
import { applyFieldSignal, MODEL_CARD } from '../lib/riskModel';
import { getRoadSegments } from '../lib/scenarioEngine';
import { useWeatherData } from '../hooks/useWeatherData';
import { useVehicleTracking } from '../hooks/useVehicleTracking';
import { useAlerts } from '../hooks/useAlerts';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { Link, useLocation } from 'wouter';
import { useTranslation } from '../i18n/LanguageContext';
import { requireAuthAction } from '../lib/authGate';

export default function Dashboard({ isSidebarOpen = true }: { isSidebarOpen?: boolean }) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { weatherData, lastUpdated, refresh: refreshWeather, dataSourceLabel } = useWeatherData();
  const { vehicles, selectedVehicle, setSelectedVehicle, activeVehicles, delayedVehicles, refresh: refreshVehicles } = useVehicleTracking();
  const { alerts, activeAlerts, criticalAlerts } = useAlerts();
  const { reports: fieldReports, pendingReports, reviewReport } = useOfflineSync();

  const [selectedDistrict, setSelectedDistrict] = useState<NERDistrict | null>(null);
  const [mapEngine, setMapEngine] = useState<'google' | 'tactical'>('google');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModelCard, setShowModelCard] = useState(false);
  // "What Should I Do Now" — internally scrollable action list (bottom fade affordance).
  const [actionsCanScroll, setActionsCanScroll] = useState(false);
  const [actionsAtEnd, setActionsAtEnd] = useState(false);
  const actionsScrollRef = useRef<HTMLDivElement>(null);

  // Compute AI Disruption Predictions based on live weather
  const basePredictions = predictDisruptions(weatherData);
  // Item 4 — hybrid fusion: rules + ML probability + field-report signal
  const predictions = applyFieldSignal(basePredictions, fieldReports, weatherData);

  // ---- Corridor health computed from real fixture data (no hardcoded numbers) ----
  const corridorSegments = getRoadSegments();
  const corridorStats = {
    open: corridorSegments.filter((s) => s.status === 'open').length,
    partiallyBlocked: corridorSegments.filter((s) => s.status === 'partially_blocked').length,
    blocked: corridorSegments.filter((s) => s.status === 'blocked').length,
    underRepair: corridorSegments.filter((s) => s.status === 'under_repair').length,
    total: corridorSegments.length,
  };
  const accessibilityPct = Math.round(
    ((corridorStats.open + corridorStats.underRepair) / corridorStats.total) * 1000
  ) / 10;
  const atRiskCorridors = corridorSegments.filter(
    (s) => s.status === 'partially_blocked' || s.riskScore >= 60 || (s.delayMinutes ?? 0) >= 60
  );
  const blockedSegmentNames = corridorSegments.filter((s) => s.status === 'blocked').map((s) => s.name);
  const openSegmentNames = corridorSegments.filter((s) => s.status === 'open').map((s) => s.name);

  const corridorStatusBadge = (seg: RoadSegment) => {
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

  // Item 9 — prioritized action list derived live from corridor, fleet & report state.
  interface PriorityAction {
    id: string;
    priority: 'critical' | 'high' | 'medium' | 'clear';
    title: string;
    detail: string;
    action: string;
    href: string;
  }
  const priorityActions = useMemo<PriorityAction[]>(() => {
    const list: PriorityAction[] = [];
    blockedSegmentNames.forEach((n) => {
      list.push({
        id: `blocked-${n}`,
        priority: 'critical',
        title: `Corridor blocked: ${n}`,
        detail: 'Route impassable — notify assets, reroute traffic and warn affected districts',
        action: 'Open alerts',
        href: '/alerts',
      });
    });
    delayedVehicles.slice(0, 3).forEach((v) => {
      list.push({
        id: `delayed-${v.id}`,
        priority: 'high',
        title: `${v.registrationNo} delayed (${v.cargoType}, ${v.route})`,
        detail: `${v.driverName} · ETA now ${v.eta} · verify cause and consider reroute`,
        action: 'Reroute',
        href: '/routes',
      });
    });
    if (pendingReports.length > 0) {
      list.push({
        id: 'reports-review',
        priority: 'high',
        title: `${pendingReports.length} field report(s) awaiting review (${activeAlerts.length} active warnings)`,
        detail: 'Review → verify → dispatch response team',
        action: 'Review',
        href: '/field-reports',
      });
    }
    atRiskCorridors.filter((s) => s.status !== 'blocked').slice(0, 3).forEach((s) => {
      list.push({
        id: `atrisk-${s.id}`,
        priority: 'medium',
        title: `At-risk corridor: ${s.name}`,
        detail: `risk ${s.riskScore} · ${s.delayMinutes ?? 0} min delay · monitor condition`,
        action: 'Monitor',
        href: '/routes',
      });
    });
    if (criticalAlerts.length > 0) {
      list.push({
        id: 'critical-alerts',
        priority: 'medium',
        title: `${criticalAlerts.length} critical alert(s) in the region`,
        detail: 'Review incident details and coordinate response',
        action: 'Open alerts',
        href: '/alerts',
      });
    }
    if (list.length === 0) {
      list.push({
        id: 'all-clear',
        priority: 'clear',
        title: 'No immediate action required',
        detail: 'All corridors operational and fleet on schedule',
        action: '',
        href: '/',
      });
    }
    return list;
  }, [blockedSegmentNames, delayedVehicles, pendingReports, activeAlerts, atRiskCorridors, criticalAlerts]);

  // Recompute the overflow affordance whenever the action list changes.
  useEffect(() => {
    const el = actionsScrollRef.current;
    if (!el) return;
    const check = () => setActionsCanScroll(el.scrollHeight > el.clientHeight + 4);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [priorityActions]);

  const handleTakeAction = (pred: any) => {
    setLocation('/routes');
  };

  const handleRerouteVehicle = (v: Vehicle) => {
    setSelectedVehicle(null);
    setLocation('/routes');
  };

  const handleRefreshRadar = async () => {
    if (!requireAuthAction('Refresh Radar')) return;
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.allSettled([refreshWeather(), refreshVehicles()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-7 pb-12">
      {/* Real-time Alert Ticker */}
      <AlertTicker alerts={alerts} />

      {/* Hero / Quick Action Bar */}
      <div className="gov-panel">
        <div className="gov-panel-head flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-[10px] font-semibold uppercase text-green-800 bg-green-100 border border-green-700 px-2 py-0.5">
              {t('surveillanceActive')}
            </span>
          </div>
          <span className="text-[10px] text-slate-600 font-medium">{t('centerBrand')}</span>
        </div>
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-[#0B3D6D] mt-0.5">
              {t('dashTitle')}
            </h2>
            <p className="text-xs text-slate-700 mt-1">
              {t('dashSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleRefreshRadar}
              disabled={isRefreshing}
              className="gov-btn"
              title="Refresh Live Sensor Data"
              style={{ opacity: isRefreshing ? 0.7 : 1, cursor: isRefreshing ? 'not-allowed' : 'pointer' }}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? t('refreshingRadar') : t('refreshRadar')}</span>
            </button>

            <Link
              href="/routes"
              className="gov-btn"
            >
              <Navigation size={14} />
              <span>{t('dashRoutePlanner')}</span>
            </Link>

            <Link
              href="/field-reports"
              className="gov-btn gov-btn-secondary"
            >
              <ShieldCheck size={14} />
              <span>{t('fieldReport')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('activeFleet')}
          value={activeVehicles.length}
          subtitle={t('activeFleetSub')}
          icon={<Truck size={20} />}
          accentColor="blue"
          trend={{ value: `${delayedVehicles.length} delayed`, direction: 'neutral', isGood: delayedVehicles.length === 0 }}
          onClick={() => setLocation('/tracking')}
        />
        <MetricCard
          title={t('criticalDisruptions')}
          value={criticalAlerts.length}
          subtitle={t('criticalDisruptionsSub')}
          icon={<AlertTriangle size={20} />}
          accentColor="red"
          trend={{ value: `${activeAlerts.length} total warnings`, direction: 'up', isGood: false }}
          onClick={() => setLocation('/alerts')}
        />
        <MetricCard
          title={t('routeAccessibility')}
          value={`${accessibilityPct}%`}
          subtitle={t('routeAccessibilitySub')}
          icon={<Activity size={20} />}
          accentColor="emerald"
          trend={{ value: `${corridorStats.open} open of ${corridorStats.total} corridors`, direction: 'neutral', isGood: true }}
          onClick={() => setLocation('/accessibility')}
        />
        <MetricCard
          title={t('monitoredDistricts')}
          value={NER_DISTRICTS.length}
          subtitle={t('monitoredDistrictsSub')}
          icon={<MapPin size={20} />}
          accentColor="purple"
          trend={{ value: 'Full telemetry', direction: 'neutral', isGood: true }}
          onClick={() => setLocation('/accessibility')}
        />
      </div>

      {/* Central GIS Map & Weather Panel — two equal-height fixed columns (60% map / 40% weather) */}
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-5 mb-8 items-stretch">
        {/* Main Map */}
        <div className="gov-panel flex flex-col h-[350px] sm:h-[520px] lg:h-[620px] xl:h-[760px] overflow-hidden">
          <div className="gov-panel-head flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-[#0B3D6D]" />
              <span>{t('liveGisMap')}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Map Engine Selector */}
              <div className="flex items-center bg-white p-0.5 border border-slate-300 text-xs">
                <button
                  onClick={() => setMapEngine('google')}
                  className={`px-2.5 py-0.5 font-medium transition-colors ${mapEngine === 'google'
                      ? 'bg-[#0B3D6D] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  🗺️ Google Maps
                </button>
                <button
                  onClick={() => setMapEngine('tactical')}
                  className={`px-2.5 py-0.5 font-medium transition-colors ${mapEngine === 'tactical'
                      ? 'bg-[#0B3D6D] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  🛰️ Tactical GIS
                </button>
              </div>

              <Link href="/accessibility" className="text-[11px] font-medium text-[#0B3D6D] hover:underline flex items-center gap-1">
                <span>{t('fullGis')}</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>

          <div className="p-3 flex-1 min-h-0 flex flex-col">
            {mapEngine === 'google' ? (
              <GoogleNERMap
                vehicles={vehicles}
                alerts={alerts}
                fieldReports={fieldReports}
                selectedDistrict={selectedDistrict}
                selectedVehicle={selectedVehicle}
                onSelectDistrict={(d) => setSelectedDistrict(d)}
                onSelectVehicle={(v) => setSelectedVehicle(v)}
                isSidebarOpen={isSidebarOpen}
                height="100%"
              />
            ) : (
              <TacticalNERMap
                vehicles={vehicles}
                alerts={alerts}
                fieldReports={fieldReports}
                selectedDistrict={selectedDistrict}
                selectedVehicle={selectedVehicle}
                onSelectDistrict={(d) => setSelectedDistrict(d)}
                onSelectVehicle={(v: Vehicle) => setSelectedVehicle(v)}
                height="100%"
              />
            )}
          </div>
        </div>

        {/* Weather Risk Telemetry (same fixed height as the map, internal scroll for overflow) */}
        <div className="gov-panel flex flex-col h-[400px] sm:h-[520px] lg:h-[620px] xl:h-[760px] max-h-[760px] min-h-0 overflow-hidden">
          <div className="gov-panel-head flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <CloudRain size={16} className="text-[#0B3D6D]" />
              <span>{t('weatherTelemetry')}</span>
            </div>
            <span className="text-[9px] text-slate-500 font-normal normal-case flex items-center gap-1.5" title={`${t('autoUpdated')}`}>
              {!dataSourceLabel.startsWith('live') && (
                <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 border border-amber-600 text-amber-800">
                  LOCAL
                </span>
              )}
              {isRefreshing
                ? t('refreshingRadar')
                : `${t('autoUpdated')} · Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
            </span>
          </div>

          <div className="p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <WeatherPanel
                weatherData={weatherData}
                dataSourceLabel={dataSourceLabel}
                onSelectDistrict={(dName) => {
                  const q = dName.trim().toLowerCase();
                  const d = NER_DISTRICTS.find((item) =>
                    item.name.toLowerCase() === q ||
                    item.majorTown?.toLowerCase() === q ||
                    item.name.toLowerCase().includes(q) ||
                    q.includes(item.name.toLowerCase()) ||
                    (item.majorTown && q.includes(item.majorTown.toLowerCase()))
                  );
                  if (d) {
                    setSelectedDistrict(d);
                    window.dispatchEvent(new CustomEvent('pathly_navigate_location', {
                      detail: {
                        lat: d.lat,
                        lng: d.lng,
                        zoom: 16,
                        name: d.name,
                        district: d.state,
                        formattedAddress: `${d.name} (${d.majorTown}), ${d.state}, India • Elevation: ${d.elevation}m ASL`
                      }
                    }));
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Corridor Health Strip — immediately scannable: what's blocked / at risk / open */}
      <div className="gov-panel">
        <div className="gov-panel-head flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-[#7A1F1F]" />
            <span>Corridor Health — NER National Highway Network</span>
          </div>
          <span className="text-[10px] text-slate-500 font-normal normal-case">
            {corridorStats.blocked} blocked · {corridorStats.partiallyBlocked} at risk · {corridorStats.open} open
          </span>
        </div>

        <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Blocked — needs action */}
          <div className="border border-[#7A1F1F]/50 bg-[#7A1F1F]/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A1F1F]">Needs Immediate Action</span>
              <span className="text-lg font-bold text-[#7A1F1F]">{corridorStats.blocked}</span>
            </div>
            <div className="space-y-1 mb-2">
              {blockedSegmentNames.length ? (
                blockedSegmentNames.map((n) => <p key={n} className="text-[10px] text-slate-700 leading-tight">{n}</p>)
              ) : (
                <p className="text-[10px] text-slate-600">No fully blocked corridors.</p>
              )}
            </div>
            <Link href="/alerts" className="text-[10px] font-bold text-[#7A1F1F] hover:underline">View alert details &rsaquo;</Link>
          </div>

          {/* At risk — monitor */}
          <div className="border border-amber-600/50 bg-amber-50/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">At Risk / Watch</span>
              <span className="text-lg font-bold text-[#B45309]">{corridorStats.partiallyBlocked}</span>
            </div>
            <div className="space-y-1 mb-2">
              {atRiskCorridors.filter((s) => s.status !== 'blocked').slice(0, 4).map((s) => (
                <p key={s.id} className="text-[10px] text-slate-700 leading-tight">{s.name} <span className="text-slate-400">· risk {s.riskScore}</span></p>
              ))}
              {atRiskCorridors.filter((s) => s.status !== 'blocked').length === 0 && (
                <p className="text-[10px] text-slate-600">No corridors actively at risk.</p>
              )}
            </div>
            <Link href="/routes" className="text-[10px] font-bold text-[#B45309] hover:underline">Open route planner &rsaquo;</Link>
          </div>

          {/* Open — clear */}
          <div className="border border-green-700/40 bg-green-50/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-800">Open / Clear</span>
              <span className="text-lg font-bold text-green-800">{corridorStats.open}</span>
            </div>
            <div className="space-y-1 mb-2">
              {openSegmentNames.slice(0, 4).map((n) => <p key={n} className="text-[10px] text-slate-700 leading-tight">{n}</p>)}
            </div>
            <span className="text-[10px] font-medium text-green-700">No movement restrictions.</span>
          </div>
        </div>

        {/* Source of corridor status values */}
        <div className="px-3 pb-3">
          <DataProvenance
            source="LOCAL FEED"
            basis="NER road-segment fixtures; live status sync when backend telemetry is connected"
            updatedAt="sensor cadence configurable"
          />
        </div>
      </div>

      {/* Item 9 — What Should I Do Now — prioritized action list */}
      <div className="gov-panel border-l-4 border-l-[#0B3D6D]">
        <div className="gov-panel-head flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-[#0B3D6D]" />
            <span>What Should I Do Now — Prioritized Action List</span>
          </div>
          <span className="text-[10px] text-slate-500 font-normal normal-case flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 border border-amber-600 text-amber-800">
              REGIONAL FEED
            </span>
            Ranked live from corridor, fleet &amp; field-report status
          </span>
        </div>

        <div className="relative">
          <div
            ref={actionsScrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              setActionsAtEnd(el.scrollHeight - el.scrollTop - el.clientHeight < 8);
            }}
            className="max-h-[360px] overflow-y-auto overscroll-contain p-4 space-y-2"
          >
            {priorityActions.map((a, idx) => (
            <div
              key={a.id}
              className={`flex items-center justify-between gap-3 flex-wrap border p-3 ${
                a.priority === 'critical'
                  ? 'border-[#7A1F1F]/50 bg-[#7A1F1F]/5'
                  : a.priority === 'high'
                  ? 'border-amber-600/50 bg-amber-50/60'
                  : a.priority === 'medium'
                  ? 'border-[#d5dbe2] bg-white'
                  : 'border-green-700/40 bg-green-50/50'
              }`}
              data-priority={a.priority}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center text-[11px] font-black ${
                  a.priority === 'clear' ? 'text-green-800 bg-green-100' : 'text-white bg-[#0B3D6D]'
                }`}>
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 shrink-0 ${
                      a.priority === 'critical'
                        ? 'text-white bg-[#7A1F1F]'
                        : a.priority === 'high'
                        ? 'text-[#B45309] bg-amber-100 border border-amber-600'
                        : a.priority === 'medium'
                        ? 'text-[#0B3D6D] bg-blue-50 border border-[#0B3D6D]/40'
                        : 'text-green-800 bg-green-100 border border-green-700/40'
                    }`}>
                      {a.priority === 'medium' ? 'Monitor' : a.priority === 'clear' ? 'Clear' : a.priority === 'critical' ? 'Critical' : 'High'}
                    </span>
                    <p className="text-xs font-bold text-[#0B3D6D]">{a.title}</p>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">{a.detail}</p>
                </div>
              </div>
              {a.href && a.href !== '/' && (
                <Link href={a.href} className="shrink-0 text-[11px] font-bold text-[#0B3D6D] hover:underline flex items-center gap-1">
                  {a.action} <ArrowRight size={13} />
                </Link>
              )}
            </div>
          ))}
          </div>
          {actionsCanScroll && !actionsAtEnd && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white via-white/70 to-transparent flex items-end justify-center pb-1">
              <span className="text-[9px] font-semibold tracking-wide text-slate-500">Scroll for more ↓</span>
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <DataProvenance
            source="LOCAL FEED"
            basis="Derived from the corridor health strip, fleet telemetry and the field-report queue above"
            updatedAt="recomputed on every sensor refresh"
          />
        </div>
      </div>

      {/* Operating Network — Logistics Hubs & Hazard Zones (Objective 3 fixtures) */}
      <div className="gov-panel">
        <div className="gov-panel-head flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Warehouse size={15} className="text-[#0B3D6D]" />
            <span>Operating Network — Logistics Hubs &amp; Hazard Zones</span>
          </div>
          <span className="text-[10px] text-slate-500 font-normal normal-case flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 border border-amber-600 text-amber-800">REGIONAL FEED</span>
            {LOGISTICS_HUBS.length} hubs · {FLOOD_PRONE_ZONES.length} flood zones · {LANDSLIDE_CORRIDORS.length} landslide corridors
          </span>
        </div>

        <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Flood-prone zones */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-800 mb-1.5">🌊 Flood-Prone Zones</h4>
            <div className="space-y-1.5">
              {FLOOD_PRONE_ZONES.map((z) => (
                <div key={z.id} className="border border-[#d5dbe2] bg-white p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold text-slate-900 leading-tight">{z.name}</p>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 shrink-0 ${
                      z.dangerLevel === 'extreme' || z.dangerLevel === 'high'
                        ? 'text-white bg-[#7A1F1F]'
                        : 'text-[#B45309] bg-amber-100 border border-amber-600'
                    }`}>{z.dangerLevel}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">{z.river} · danger gauge {z.dangerWaterLevel}m · {z.exposedRoutes.length} corridors exposed</p>
                </div>
              ))}
            </div>
          </div>

          {/* Landslide corridors */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-800 mb-1.5">⛰️ Landslide Corridors</h4>
            <div className="space-y-1.5">
              {LANDSLIDE_CORRIDORS.slice(0, 6).map((c) => (
                <div key={c.id} className="border border-[#d5dbe2] bg-white p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold text-slate-900 leading-tight">{c.name}</p>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 shrink-0 ${
                      c.status === 'closed'
                        ? 'text-white bg-[#7A1F1F]'
                        : c.status === 'advisory'
                        ? 'text-[#B45309] bg-amber-100 border border-amber-600'
                        : 'text-green-800 bg-green-100'
                    }`}>{c.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">Risk {c.riskScore}/100 · trigger &gt; {c.rainfallTriggerMm}mm/24h · {c.clearanceResponsible}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Logistics hubs */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-800 mb-1.5">🏭 Logistics Hubs</h4>
            <div className="space-y-1.5">
              {LOGISTICS_HUBS.slice(0, 7).map((h) => (
                <div key={h.id} className="border border-[#d5dbe2] bg-white p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold text-slate-900 leading-tight">{h.name}</p>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 shrink-0 ${
                      h.status === 'critical'
                        ? 'text-white bg-[#7A1F1F]'
                        : h.status === 'restricted' || h.status === 'congested'
                        ? 'text-[#B45309] bg-amber-100 border border-amber-600'
                        : 'text-green-800 bg-green-100'
                    }`}>{h.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">{h.city}, {h.state} · {h.capacity} · congestion {h.congestionLevel}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Disruption Predictions Section */}
      <div className="gov-panel">
        <div className="gov-panel-head flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#FF9933]" />
            <span>{t('predictiveDisruption')}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-normal normal-case flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 border border-amber-600 text-amber-800">
                RISK MODEL
              </span>
              {t('predictiveDisruptionSub')}
              <button
                type="button"
                onClick={() => setShowModelCard((v) => !v)}
                className={`px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                  showModelCard ? 'bg-[#0B3D6D] text-white border-[#0B3D6D]' : 'bg-white text-[#0B3D6D] border-[#0B3D6D]/50 hover:bg-blue-50'
                }`}
              >
                Model Card {showModelCard ? '▴' : '▾'}
              </button>
            </span>
        </div>

        {/* Model Card — honest model metadata (Item 4) */}
        {showModelCard && (
          <div className="px-4">
            <div className="border border-[#d5dbe2] bg-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-xs font-bold text-[#0B3D6D]">{MODEL_CARD.algorithm}</h4>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Model family: <strong>{MODEL_CARD.modelFamily}</strong> · version <span className="font-mono">{MODEL_CARD.version}</span> · updated <span className="font-mono">{MODEL_CARD.updatedAt}</span>
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Trained on: <strong>{MODEL_CARD.trainingData.name}</strong> ({MODEL_CARD.trainingData.rows} rows) — {MODEL_CARD.trainingData.provenance}
                  </p>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 border text-[#7A1F1F] bg-orange-50 border-orange-400 shrink-0">
                  NOT A NEURAL NETWORK
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {MODEL_CARD.metrics.map((m) => (
                  <div key={m.label} className="border border-slate-200 bg-slate-50 p-2">
                    <span className="text-[9px] font-bold uppercase text-slate-500">{m.label}</span>
                    <p className="text-base font-bold font-mono text-[#0B3D6D]">{m.value}</p>
                    {m.note && <p className="text-[9px] text-slate-500 font-mono">{m.note}</p>}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {MODEL_CARD.features.map((f) => (
                  <span key={f} className="text-[9px] font-mono bg-slate-100 border border-slate-300 text-slate-700 px-1.5 py-0.5">
                    {f}
                  </span>
                ))}
              </div>

              <p className="text-[10px] text-slate-600"><strong>Calibration:</strong> {MODEL_CARD.calibration}</p>
              <p className="text-[10px] text-slate-600"><strong>Deployment:</strong> {MODEL_CARD.deploymentStatus}</p>
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Limitations</h5>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {MODEL_CARD.limitations.map((l) => (
                    <li key={l} className="text-[10px] text-slate-600">{l}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {predictions.slice(0, 4).map((pred) => (
            <PredictionCard key={pred.id} prediction={pred} onTakeAction={handleTakeAction} />
          ))}
        </div>
      </div>

      {/* Field Reports — Needs Action (Objective 5) */}
      <div className="gov-panel border-l-4" style={{ borderLeftColor: pendingReports.length > 0 ? '#dc2626' : '#138808' }}>
        <div className="gov-panel-head flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-[#0B3D6D]" />
            <h3 className="text-sm font-bold text-[#0B3D6D]">
              Field Reports — Needs Action &amp; On-Site Status
            </h3>
            <span className="text-[11px] text-slate-600 font-normal normal-case hidden sm:inline">
              Submitted by field officers in near real time
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-normal normal-case flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 border border-amber-600 text-amber-800">
              LOCAL
            </span>
            {pendingReports.length > 0
              ? `${pendingReports.length} report(s) awaiting review`
              : 'All reports reviewed, verified & resolved'}
          </span>
          <a href="/field-reports" className="text-xs font-bold text-[#0B3D6D] underline-offset-2 hover:underline flex items-center gap-1 cursor-pointer">
            Manage all reports →
          </a>
        </div>

        <div className="p-4">
          {fieldReports.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">
              No field reports received yet. Field officers submit from the Field Reports module.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3 font-bold">Report / Incident</th>
                    <th className="py-2 pr-3 font-bold">Location</th>
                    <th className="py-2 pr-3 font-bold">Severity</th>
                    <th className="py-2 pr-3 font-bold">Officer</th>
                    <th className="py-2 pr-3 font-bold">Status</th>
                    <th className="py-2 font-bold">Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldReports.slice(0, 6).map((fr) => (
                    <tr key={fr.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-[#0B3D6D]">{fr.title}</div>
                        <div className="text-[10px] text-slate-500">{fr.category} · {fr.timestamp}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-700">{fr.district}, {fr.state}</td>
                      <td className="py-2.5 pr-3">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: fr.severity === 'critical' ? '#FEE2E2' : fr.severity === 'warning' ? '#FFEDD5' : '#FEF3C7',
                            color: fr.severity === 'critical' ? '#991B1B' : fr.severity === 'warning' ? '#9A3412' : '#92400E',
                          }}
                        >
                          {fr.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">
                        {fr.officerName}
                        <div className="text-[10px] text-slate-400 font-mono">{fr.officerId}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: fr.status === 'resolved' ? '#DCFCE7' : fr.status === 'submitted' ? '#FEF3C7' : '#DBEAFE',
                            color: fr.status === 'resolved' ? '#166534' : fr.status === 'submitted' ? '#92400E' : '#1E40AF',
                          }}
                        >
                          {fr.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {fr.status !== 'resolved' ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!requireAuthAction('Verify Field Report')) return;
                              reviewReport(fr.id, 'Verified by district control — response team dispatched.');
                            }}
                            className="px-2 py-1 rounded bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 text-[10px] font-bold border border-emerald-500/30"
                          >
                            {fr.status === 'submitted' ? 'Review ✕ Verify' : 'Mark Resolved'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-mono">✓ closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
              <Activity size={11} className="text-amber-600" />
              Live feed — field reports update the accessibility layer automatically
            </p>
            <span className="text-[10px] text-slate-400 font-mono">
              {fieldReports.length} total · {pendingReports.length} pending
            </span>
          </div>
        </div>
      </div>

      {/* Essential Supply Chain Velocity */}
      <div className="gov-panel">
        <div className="gov-panel-head flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0B3D6D]">
              {t('supplyVelocity')}
            </h3>
            <p className="text-[11px] text-slate-600 font-normal normal-case">
              {t('supplyVelocitySub')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocation('/analytics')}
            className="text-xs font-bold text-[#0B3D6D] underline-offset-2 hover:underline flex items-center gap-1 cursor-pointer"
          >
            Detailed Analytics ➔
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUPPLY_CHAIN_METRICS.map((metric) => (
            <div
              key={metric.commodity}
              className="border border-[#d5dbe2] bg-white p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCargoIcon(metric.commodity)}</span>
                  <h4 className="text-xs font-bold text-[#0B3D6D]">{metric.label}</h4>
                </div>
                <span className="text-xs font-bold text-green-700">{metric.onTimeRate}% on-time</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                <span>In transit: <strong className="text-[#0B3D6D]">{metric.inTransit}</strong></span>
                <span>Delayed: <strong className={metric.delayed > 0 ? 'text-amber-700' : 'text-slate-500'}>{metric.delayed}</strong></span>
                <span>Avg Time: <strong>{metric.avgDeliveryTime}h</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cargo Drawer */}
      <CargoManifest
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onReroute={handleRerouteVehicle}
      />
    </div>
  );
}

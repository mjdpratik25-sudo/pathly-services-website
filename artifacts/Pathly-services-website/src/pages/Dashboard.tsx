// ============================================================
// Dashboard: Regional Command Center Overview for Logistics Intelligence
// ============================================================

import React, { useState } from 'react';
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
  RefreshCw
} from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';
import AlertTicker from '../components/dashboard/AlertTicker';
import WeatherPanel from '../components/dashboard/WeatherPanel';
import PredictionCard from '../components/dashboard/PredictionCard';
import NERMap from '../components/maps/NERMap';
import GoogleNERMap from '../components/maps/GoogleNERMap';
import TacticalNERMap from '../components/maps/TacticalNERMap';
import CargoManifest from '../components/tracking/CargoManifest';
import {
  PLATFORM_STATS,
  SUPPLY_CHAIN_METRICS,
  NER_DISTRICTS,
  type Vehicle,
  type NERDistrict,
  getCargoIcon
} from '../data/nerData';
import { predictDisruptions } from '../lib/aiEngine';
import { useWeatherData } from '../hooks/useWeatherData';
import { useVehicleTracking } from '../hooks/useVehicleTracking';
import { useAlerts } from '../hooks/useAlerts';
import { Link, useLocation } from 'wouter';
import { useTranslation } from '../i18n/LanguageContext';

export default function Dashboard({ isSidebarOpen = true }: { isSidebarOpen?: boolean }) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { weatherData, lastUpdated, refresh: refreshWeather } = useWeatherData();
  const { vehicles, selectedVehicle, setSelectedVehicle, activeVehicles, delayedVehicles, refresh: refreshVehicles } = useVehicleTracking();
  const { alerts, activeAlerts, criticalAlerts } = useAlerts();

  const [selectedDistrict, setSelectedDistrict] = useState<NERDistrict | null>(null);
  const [mapEngine, setMapEngine] = useState<'google' | 'tactical'>('google');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute AI Disruption Predictions based on live weather
  const predictions = predictDisruptions(weatherData);

  const handleTakeAction = (pred: any) => {
    setLocation('/routes');
  };

  const handleRerouteVehicle = (v: Vehicle) => {
    setSelectedVehicle(null);
    setLocation('/routes');
  };

  const handleRefreshRadar = async () => {
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
          value="82.4%"
          subtitle={t('routeAccessibilitySub')}
          icon={<Activity size={20} />}
          accentColor="emerald"
          trend={{ value: '+3.2% vs last week', direction: 'up', isGood: true }}
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
            <span className="text-[9px] text-slate-500 font-normal normal-case" title={`${t('autoUpdated')}`}>
              {isRefreshing
                ? t('refreshingRadar')
                : `${t('autoUpdated')} · Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
            </span>
          </div>

          <div className="p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <WeatherPanel
                weatherData={weatherData}
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

      {/* Disruption Predictions Section */}
      <div className="gov-panel">
        <div className="gov-panel-head flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#FF9933]" />
            <span>{t('predictiveDisruption')}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-normal normal-case">
            {t('predictiveDisruptionSub')}
          </span>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {predictions.slice(0, 4).map((pred) => (
            <PredictionCard key={pred.id} prediction={pred} onTakeAction={handleTakeAction} />
          ))}
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

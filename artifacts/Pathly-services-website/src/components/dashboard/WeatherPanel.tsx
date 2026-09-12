// ============================================================
// WeatherPanel: Summary card showing current rainfall, flood & landslide warnings
// ============================================================

import React, { useState } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { type WeatherData } from '../../data/nerData';
import DataProvenance from '../common/DataProvenance';

const WEATHER_ICONS: Record<WeatherData['condition'], { Icon: LucideIcon; color: string }> = {
  clear: { Icon: Sun, color: '#F59E0B' },
  cloudy: { Icon: Cloud, color: '#94A3B8' },
  drizzle: { Icon: CloudDrizzle, color: '#3B82F6' },
  rain: { Icon: CloudRain, color: '#3B82F6' },
  heavy_rain: { Icon: CloudRainWind, color: '#2563EB' },
  storm: { Icon: CloudLightning, color: '#F59E0B' },
  fog: { Icon: CloudFog, color: '#64748B' },
};

function WeatherConditionIcon({ condition }: { condition: WeatherData['condition'] }) {
  const { Icon, color } = WEATHER_ICONS[condition] || WEATHER_ICONS.cloudy;
  return <Icon size={22} className="shrink-0" style={{ color }} aria-hidden="true" />;
}

interface WeatherPanelProps {
  weatherData: WeatherData[];
  onSelectDistrict?: (districtName: string) => void;
  /** Data source surfaced by the hook, e.g. 'live' | 'local (key present but API unavailable)' | 'local weather feed (no API key)'. */
  dataSourceLabel?: string;
}

export default function WeatherPanel({ weatherData, onSelectDistrict, dataSourceLabel }: WeatherPanelProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'warning' | 'high_rain'>('all');

  const filtered = weatherData.filter((w) => {
    if (activeFilter === 'warning') return w.floodWarning || w.landslideWarning;
    if (activeFilter === 'high_rain') return w.rainfall > 40;
    return true;
  });

  const totalWarnings = weatherData.filter((w) => w.floodWarning || w.landslideWarning).length;

  return (
    <div className="flex flex-col h-full">
      {/* Filter Tabs (Flat rectangular form buttons) */}
      <div className="flex items-center gap-1.5 mb-3 pb-2 overflow-x-auto border-b border-slate-200 flex-nowrap scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`shrink-0 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-[#0B3D6D] text-white border-[#0B3D6D]'
              : 'bg-white text-[#0B3D6D] border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span>📍 All Hubs</span>
          <span className="text-[10px] font-mono px-1.5">({weatherData.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('warning')}
          className={`shrink-0 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
            activeFilter === 'warning'
              ? 'bg-[#FF9933] text-white border-[#FF9933]'
              : 'bg-white text-[#B45309] border-amber-300 hover:bg-amber-50'
          }`}
        >
          <span>⚠️ Warning Zones</span>
          <span className="text-[10px] font-mono px-1.5">({totalWarnings})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('high_rain')}
          className={`shrink-0 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer border whitespace-nowrap ${
            activeFilter === 'high_rain'
              ? 'bg-[#138808] text-white border-[#138808]'
              : 'bg-white text-green-800 border-green-300 hover:bg-green-50'
          }`}
        >
          <span>🌧️ Rain &gt; 40mm</span>
        </button>
      </div>

      {/* Weather List */}
      <div className="space-y-2.5 overflow-y-auto flex-1 min-h-0 pr-1">
        {filtered.map((item) => (
          <div
            key={item.district}
            onClick={() => onSelectDistrict?.(item.district)}
            className="border border-[#d5dbe2] bg-white hover:border-[#0B3D6D] transition-colors cursor-pointer p-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center" title={item.condition}>
                  <WeatherConditionIcon condition={item.condition} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900">{item.district}</h4>
                    <span className="text-[10px] text-[#0B3D6D] font-semibold">[{item.state}]</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs font-bold text-slate-900">
                    <span>{item.temperature}°C</span>
                    <span className="text-[10px] font-semibold text-[#0B3D6D]">({item.rainfall}mm)</span>
                    <span className="text-[10px] font-medium text-slate-400">{item.lastUpdated || 'Updated now'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="flex items-center justify-end gap-1.5">
                  {item.floodWarning && (
                    <span className="text-[9px] font-bold text-[#7A1F1F] bg-[#7A1F1F]/10 px-1.5 py-0.5 border border-[#7A1F1F]">
                      FLOOD
                    </span>
                  )}
                  {item.landslideWarning && (
                    <span className="text-[9px] font-bold text-[#B45309] bg-amber-50 px-1.5 py-0.5 border border-amber-600">
                      LANDSLIDE
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(item.description || item.forecast24h) && (
              <p className="mt-2 text-[11px] text-slate-700 leading-relaxed">
                {item.description || item.forecast24h}
              </p>
            )}

            <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-600">
              <span className="flex items-center gap-1">
                <span>💨</span>
                <span>Wind: {item.windSpeed} km/h{item.windGust ? `, gusting to ${item.windGust} km/h` : ''}</span>
              </span>
              <span className="flex items-center gap-1">
                <span>💧</span>
                <span>Humidity: {item.humidity}%</span>
              </span>
              <span className="flex items-center gap-1">
                <span>👁️</span>
                <span>Visibility: {item.visibilityNote || `${item.visibility} km`}</span>
              </span>
              <span className="flex items-center gap-1">
                <span>🌊</span>
                <span>{item.riverLevel || 'Water level: normal'}</span>
              </span>
              {item.affectedSettlements && (
                <span className="flex items-center gap-1 sm:col-span-2">
                  <span>📍</span>
                  <span>Affected: {item.affectedSettlements}</span>
                </span>
              )}
            </div>

            {item.recommendedAction && (
              <p className="mt-2 pt-2 border-t border-slate-100 text-[10px] font-medium text-[#7A1F1F] leading-relaxed">
                ⚠ Recommended action: {item.recommendedAction}
              </p>
            )}

            {item.landslideWarning && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <DataProvenance
                  source="PREDICTED"
                  basis={`rainfall ${item.rainfall}mm/24h exceeds landslide trigger on ${item.state} terrain`}
                  updatedBy="Weather Telemetry"
                  updatedAt={item.lastUpdated || 'updated now'}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Source of the values in this panel */}
      {dataSourceLabel && (
        <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between gap-2">
          <DataProvenance
            source={dataSourceLabel.startsWith('live') ? 'LIVE API' : 'LOCAL FEED'}
            basis={`OpenWeatherMap endpoint ${dataSourceLabel.startsWith('live') ? 'reachable' : 'unavailable / no key'}`}
            updatedBy="Weather Service"
          />
        </div>
      )}
    </div>
  );
}

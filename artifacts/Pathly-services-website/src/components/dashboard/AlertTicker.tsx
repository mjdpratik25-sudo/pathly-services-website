// ============================================================
// AlertTicker: Horizontal scrolling marquee of real-time critical disruptions
// ============================================================

import React from 'react';
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { type LogisticsAlert } from '../../data/nerData';
import { Link, useLocation } from 'wouter';

interface AlertTickerProps {
  alerts: LogisticsAlert[];
}

export default function AlertTicker({ alerts }: AlertTickerProps) {
  const [, setLocation] = useLocation();
  const activeAlerts = alerts.filter(a => a.isActive);

  if (activeAlerts.length === 0) {
    return (
      <div className="border border-green-700 bg-green-50 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs text-green-900 flex-wrap">
        <span className="flex items-center gap-2 font-semibold min-w-0">
          <span className="w-2 h-2 rounded-full bg-green-700 flex-shrink-0"></span>
          <span className="min-w-0">All primary corridors open across the region. No major disruptions reported.</span>
        </span>
        <span className="text-[11px] text-green-800 font-semibold flex-shrink-0">Live Surveillance</span>
      </div>
    );
  }

  return (
    <div className="ticker-pause border border-[#7A1F1F] bg-[#7A1F1F] overflow-hidden relative flex items-center h-10 px-3 select-none text-white">
      {/* Live Badge */}
      <div className="flex items-center gap-1.5 bg-white text-[#7A1F1F] text-[10px] font-bold uppercase px-2.5 py-0.5 flex-shrink-0 z-10 mr-3 border border-[#7A1F1F]">
        <AlertCircle size={12} />
        <span>CRITICAL ALERTS ({activeAlerts.length})</span>
      </div>

      {/* Marquee Content */}
      <div className="flex-1 overflow-hidden whitespace-nowrap">
        <div className="inline-flex gap-8 animate-ticker">
          {activeAlerts.concat(activeAlerts).map((alert, idx) => (
            <button
              key={`${alert.id}-${idx}`}
              type="button"
              onClick={() => setLocation(`/alerts?alert=${alert.id}`)}
              className="inline-flex items-center gap-2 text-xs cursor-pointer rounded px-1.5 py-0.5 transition-colors hover:bg-white/15 hover:ring-1 hover:ring-white/30"
              title={`View details: ${alert.title}`}
            >
              <span className="text-amber-300 font-bold">[{alert.state}]</span>
              <span className="text-white font-semibold">{alert.title}</span>
              <span className="text-white/75 text-[11px]">({alert.estimatedClearTime})</span>
              <span className="text-white/50">•</span>
            </button>
          ))}
        </div>
      </div>

      {/* Vertical divider + gap before action link */}
      <div className="w-px h-6 bg-white/30 flex-shrink-0 ml-4 z-10" aria-hidden="true" />
      <Link href="/alerts" className="flex items-center gap-1.5 text-[11px] font-bold text-white hover:underline ml-3 flex-shrink-0 z-10">
        <span>View All</span>
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

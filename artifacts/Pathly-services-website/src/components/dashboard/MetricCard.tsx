// ============================================================
// MetricCard: High-impact KPI display for command center
// ============================================================

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    isGood?: boolean;
  };
  accentColor?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple';
  onClick?: () => void;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'blue',
  onClick
}: MetricCardProps) {
  const cardBg = {
    blue: 'border-b-2 border-b-[#0B3D6D]',
    emerald: 'border-b-2 border-b-[#138808]',
    amber: 'border-b-2 border-b-[#FF9933]',
    red: 'border-b-2 border-b-[#7A1F1F]',
    purple: 'border-b-2 border-b-[#4B0082]'
  }[accentColor];

  const indicatorBg = {
    blue: 'bg-[#0B3D6D]',
    emerald: 'bg-[#138808]',
    amber: 'bg-[#FF9933]',
    red: 'bg-[#7A1F1F]',
    purple: 'bg-[#4B0082]'
  }[accentColor];

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#b8c1ce] ${cardBg} p-4 flex flex-col justify-between cursor-pointer hover:border-[#0B3D6D] transition-colors`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">{title}</p>
          <h3 className="metric-value mt-1 text-2xl font-bold text-slate-900">{value}</h3>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className={`w-2 h-2 ${indicatorBg}`} />
          <div className="p-1.5 border border-slate-300 text-slate-500 bg-slate-50">
            {icon}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-start justify-between gap-2 text-xs">
        {subtitle && <span className="text-slate-600 min-w-0 leading-snug">{subtitle}</span>}
        {trend && (
          <span
            className={`flex items-center gap-0.5 font-medium ml-auto shrink-0 ${
              trend.isGood === undefined
                ? 'text-[#0B3D6D]'
                : trend.isGood
                ? 'text-green-700'
                : 'text-[#7A1F1F]'
            }`}
          >
            {trend.direction === 'up' && <ArrowUpRight size={14} />}
            {trend.direction === 'down' && <ArrowDownRight size={14} />}
            {trend.direction === 'neutral' && <Minus size={14} />}
            <span>{trend.value}</span>
          </span>
        )}
      </div>
    </div>
  );
}

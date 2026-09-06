// ============================================================
// Analytics: Logistics Bottlenecks & Connectivity Intelligence
// ============================================================

import React from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldCheck, 
  MapPin,
  Calendar
} from 'lucide-react';
import { 
  NER_STATES, 
  NER_DISTRICTS, 
  SUPPLY_CHAIN_METRICS, 
  PLATFORM_STATS 
} from '../data/nerData';

const STATE_CONNECTIVITY_DATA = [
  { state: 'Assam', score: 79, vehicles: 120, delays: 12 },
  { state: 'Tripura', score: 68, vehicles: 45, delays: 5 },
  { state: 'Meghalaya', score: 58, vehicles: 38, delays: 14 },
  { state: 'Nagaland', score: 54, vehicles: 28, delays: 8 },
  { state: 'Manipur', score: 46, vehicles: 25, delays: 11 },
  { state: 'Mizoram', score: 42, vehicles: 22, delays: 9 },
  { state: 'Arunachal', score: 32, vehicles: 18, delays: 15 },
  { state: 'Sikkim', score: 48, vehicles: 16, delays: 7 }
];

const DISRUPTION_CAUSES = [
  { name: 'Landslides & Debris Flow', value: 42, color: '#ef4444' },
  { name: 'River Floods & Waterlogging', value: 28, color: '#3b82f6' },
  { name: 'Bridge & PWD Repairs', value: 16, color: '#a855f7' },
  { name: 'Heavy Fog & Zero Visibility', value: 9, color: '#f59e0b' },
  { name: 'Accidents & Overturns', value: 5, color: '#10b981' }
];

const MONTHLY_TRENDS = [
  { month: 'Apr', rainfall: 80, delayHours: 2.1, onTimeRate: 88 },
  { month: 'May', rainfall: 140, delayHours: 3.4, onTimeRate: 82 },
  { month: 'Jun', rainfall: 280, delayHours: 5.8, onTimeRate: 68 },
  { month: 'Jul', rainfall: 340, delayHours: 6.9, onTimeRate: 61 },
  { month: 'Aug', rainfall: 310, delayHours: 6.2, onTimeRate: 64 },
  { month: 'Sep', rainfall: 210, delayHours: 4.5, onTimeRate: 74 },
  { month: 'Oct', rainfall: 95, delayHours: 2.8, onTimeRate: 85 }
];

export default function Analytics() {
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-400" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold">
              Regional Logistics Intelligence & Data Analytics
            </span>
          </div>
          <h2 className="text-xl font-black text-[hsl(var(--foreground))] mt-0.5">
            North Eastern Region Accessibility & Supply Chain Analytics
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Historical disruption patterns, state-wise infrastructure indexes, and seasonal bottleneck forecasting.
          </p>
        </div>

        <button
          onClick={() => alert('Generating Executive PDF Intelligence Report for Pathly Regional Command...')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all self-start md:self-auto"
        >
          <Download size={15} />
          <span>Export Regional Report (PDF)</span>
        </button>
      </div>

      {/* Top High-level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-card bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-semibold uppercase">Avg Transit Delay</p>
          <h3 className="metric-value text-blue-400 mt-1">4.2 Hours</h3>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingDown size={13} />
            <span>18% faster via Dynamic Rerouting</span>
          </p>
        </div>

        <div className="p-4 rounded-xl glass-card bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-semibold uppercase">Delivery Success Quota</p>
          <h3 className="metric-value text-emerald-400 mt-1">76.4%</h3>
          <p className="text-[11px] text-slate-400 mt-1">Target: &gt; 80% for hill sectors</p>
        </div>

        <div className="p-4 rounded-xl glass-card bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-semibold uppercase">Landslide Bottlenecks</p>
          <h3 className="metric-value text-rose-400 mt-1">42%</h3>
          <p className="text-[11px] text-rose-400 mt-1">Leading cause of delay in region</p>
        </div>

        <div className="p-4 rounded-xl glass-card bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-semibold uppercase">Active Field Inspectors</p>
          <h3 className="metric-value text-purple-400 mt-1">245 Officers</h3>
          <p className="text-[11px] text-slate-400 mt-1">Deployed across 80 districts</p>
        </div>
      </div>

      {/* Charts Grid 1: State Accessibility Bar + Disruption Cause Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* State-wise Connectivity Score */}
        <div className="p-5 rounded-xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
              State-wise Infrastructure & Connectivity Index (0–100)
            </h3>
            <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">Aug 2026</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={STATE_CONNECTIVITY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="state" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Accessibility Index" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Root Causes of Route Disruptions (Pie Chart) */}
        <div className="p-5 rounded-xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
              Root Causes of Regional Logistics Disruptions
            </h3>
            <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">Historical Telemetry Log</span>
          </div>

          <div className="h-[280px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DISRUPTION_CAUSES}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {DISRUPTION_CAUSES.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Grid 2: Rainfall vs. Travel Delays (Monsoon Curve) */}
      <div className="p-5 rounded-xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">
              Monsoon Impact Correlation: Monthly Rainfall vs. Average Fleet Travel Delay (Hours)
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Peak monsoon (June–August) creates a 3.2x increase in delivery turnaround time in hill corridors.
            </p>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MONTHLY_TRENDS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="rainfall" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Rainfall (mm)" />
              <Area type="monotone" dataKey="delayHours" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Avg Delay (Hours)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Analytics: Logistics Bottlenecks & Connectivity Intelligence
// ============================================================

import React, { useMemo } from 'react';
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
  ROAD_SEGMENTS, 
  SUPPLY_CHAIN_METRICS, 
  PLATFORM_STATS 
} from '../data/nerData';
import { requireAuthAction } from '../lib/authGate';

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

// Item 11 — seeded benchmark baseline (pre-Pathly).
// Each value is the known reference against which the live calculation is compared.
const BENCHMARKS = {
  avgDelayHours: 5.1,            // pre-Pathly regional average
  deliverySuccessPct: 80.0,      // government hill-sector target
  landslideSharePct: 18,         // national landslide disruption share
  officersPerDistrict: 1.2,      // coverage target
};

function computeKPIs() {
  // Avg Transit Delay — mean of segment delayMinutes, converted to hours.
  const segDelayTotal = ROAD_SEGMENTS.reduce((sum, s) => sum + (s.delayMinutes ?? 0), 0);
  const avgDelayHours = Math.round((segDelayTotal / ROAD_SEGMENTS.length / 60) * 10) / 10;

  // Delivery Success — weighted mean of commodity on-time rates (weighted by commodity volume proxy: inTransit count).
  const totalWeight = SUPPLY_CHAIN_METRICS.reduce((s, c) => s + c.inTransit, 0);
  const deliverySuccessPct =
    totalWeight > 0
      ? Math.round(
          SUPPLY_CHAIN_METRICS.reduce((s, c) => s + (c.onTimeRate * c.inTransit) / totalWeight, 0) * 10
        ) / 10
      : 0;

  // Landslide share — landslide disruption events as % of all disruption causes.
  const totalDisruptions = DISRUPTION_CAUSES.reduce((s, c) => s + c.value, 0);
  const landslidePct =
    totalDisruptions > 0
      ? Math.round((DISRUPTION_CAUSES.find((c) => c.name.startsWith('Landslide'))?.value ?? 0) / totalDisruptions * 100)
      : 0;

  // Field Inspector Coverage — officers per monitored district.
  const officersPerDistrict =
    NER_DISTRICTS.length > 0
      ? Math.round((PLATFORM_STATS.fieldOfficers / NER_DISTRICTS.length) * 100) / 100
      : 0;

  return { avgDelayHours, deliverySuccessPct, landslidePct, officersPerDistrict };
}

export default function Analytics() {
  const kpis = useMemo(computeKPIs, []);
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
          onClick={() => {
            if (!requireAuthAction('Export Regional Report')) return;
            alert('Generating Executive PDF Intelligence Report for Pathly Regional Command...');
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all self-start md:self-auto"
        >
          <Download size={15} />
          <span>Export Regional Report (PDF)</span>
        </button>
      </div>

      {/* Top High-level KPIs — calculated from real fixtures + inline method annotation */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-card bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-semibold uppercase">Avg Transit Delay</p>
          <h3 className="metric-value text-blue-400 mt-1">{kpis.avgDelayHours} Hours</h3>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingDown size={13} />
            <span>{Math.round((1 - kpis.avgDelayHours / BENCHMARKS.avgDelayHours) * 100)}% faster via dynamic rerouting</span>
          </p>
          <p className="text-[9px] text-slate-500 mt-1 font-mono leading-tight">
            = Σ(segment delay min) ÷ segments ÷ 60
          </p>
        </div>

        <div className="p-4 rounded-xl glass-card bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-semibold uppercase">Delivery Success Quota</p>
          <h3 className="metric-value text-emerald-400 mt-1">{kpis.deliverySuccessPct}%</h3>
          <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: kpis.deliverySuccessPct >= BENCHMARKS.deliverySuccessPct ? '#34d399' : '#f87171' }}>
            {kpis.deliverySuccessPct >= BENCHMARKS.deliverySuccessPct ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
            <span>{Math.abs(Math.round((kpis.deliverySuccessPct - BENCHMARKS.deliverySuccessPct) * 10) / 10)}pp {kpis.deliverySuccessPct >= BENCHMARKS.deliverySuccessPct ? 'above' : 'below'} hill-sector target</span>
          </p>
          <p className="text-[9px] text-slate-500 mt-1 font-mono leading-tight">
            = Σ(commodity on-time% × volume) ÷ total volume
          </p>
        </div>

        <div className="p-4 rounded-xl glass-card bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-semibold uppercase">Landslide Disruption Share</p>
          <h3 className="metric-value text-rose-400 mt-1">{kpis.landslidePct}%</h3>
          <p className="text-[11px] text-rose-400 mt-1">+{Math.max(0, kpis.landslidePct - BENCHMARKS.landslideSharePct)}pp vs national baseline ({BENCHMARKS.landslideSharePct}%)</p>
          <p className="text-[9px] text-slate-500 mt-1 font-mono leading-tight">
            = landslide disruption events ÷ total events × 100
          </p>
        </div>

        <div className="p-4 rounded-xl glass-card bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-semibold uppercase">Active Field Inspectors</p>
          <h3 className="metric-value text-purple-400 mt-1">{PLATFORM_STATS.fieldOfficers} Officers</h3>
          <p className="text-[11px] text-slate-400 mt-1">{kpis.officersPerDistrict} officers / district · {NER_DISTRICTS.length} monitored</p>
          <p className="text-[9px] text-slate-500 mt-1 font-mono leading-tight">
            = deployed officers ÷ monitored districts
          </p>
        </div>
      </div>

      {/* Item 11 — transparent calculation method & benchmark reference */}
      <div className="p-4 rounded-xl glass-panel bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">How These Metrics Are Calculated</h3>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Each indicator is computed from the fixtures above — not hard-coded. Benchmarks are seeded baselines for comparison.</p>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] px-2 py-1 bg-[hsl(var(--secondary))]">
            Transparency
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[640px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                <th className="py-2 pr-3 font-bold">Indicator</th>
                <th className="py-2 pr-3 font-bold">Live Value</th>
                <th className="py-2 pr-3 font-bold">Calculation Method</th>
                <th className="py-2 pr-3 font-bold">Benchmark</th>
                <th className="py-2 font-bold">Gap</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-3 font-semibold text-[hsl(var(--foreground))]">Avg Transit Delay</td>
                <td className="py-2 pr-3 font-mono">{kpis.avgDelayHours}h</td>
                <td className="py-2 pr-3 text-[hsl(var(--muted-foreground))]">Σ(delayMinutes across all segments) ÷ segment count ÷ 60</td>
                <td className="py-2 pr-3 font-mono">{BENCHMARKS.avgDelayHours}h (pre-Pathly)</td>
                <td className="py-2 font-mono text-emerald-400">{Math.round((1 - kpis.avgDelayHours / BENCHMARKS.avgDelayHours) * 100)}% faster</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-3 font-semibold text-[hsl(var(--foreground))]">Delivery Success</td>
                <td className="py-2 pr-3 font-mono">{kpis.deliverySuccessPct}%</td>
                <td className="py-2 pr-3 text-[hsl(var(--muted-foreground))]">Weighted mean of per-commodity on-time rate (weight = inTransit count)</td>
                <td className="py-2 pr-3 font-mono">{BENCHMARKS.deliverySuccessPct}% (hill-sector target)</td>
                <td className="py-2 font-mono" style={{ color: kpis.deliverySuccessPct >= BENCHMARKS.deliverySuccessPct ? '#34d399' : '#f87171' }}>
                  {Math.abs(Math.round((kpis.deliverySuccessPct - BENCHMARKS.deliverySuccessPct) * 10) / 10)}pp
                </td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-3 font-semibold text-[hsl(var(--foreground))]">Landslide Share</td>
                <td className="py-2 pr-3 font-mono">{kpis.landslidePct}%</td>
                <td className="py-2 pr-3 text-[hsl(var(--muted-foreground))]">Landslide disruption events ÷ total disruption events × 100</td>
                <td className="py-2 pr-3 font-mono">{BENCHMARKS.landslideSharePct}% (national avg)</td>
                <td className="py-2 font-mono text-rose-400">+{Math.max(0, kpis.landslidePct - BENCHMARKS.landslideSharePct)}pp above baseline</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-semibold text-[hsl(var(--foreground))]">Inspector Coverage</td>
                <td className="py-2 pr-3 font-mono">{kpis.officersPerDistrict} / district</td>
                <td className="py-2 pr-3 text-[hsl(var(--muted-foreground))]">Deployed officers ÷ monitored districts</td>
                <td className="py-2 pr-3 font-mono">{BENCHMARKS.officersPerDistrict} / district (target)</td>
                <td className="py-2 font-mono text-amber-700 dark:text-amber-400">{kpis.officersPerDistrict >= BENCHMARKS.officersPerDistrict ? 'At target' : 'Below target'}</td>
              </tr>
            </tbody>
          </table>
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

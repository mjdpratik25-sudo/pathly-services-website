// ============================================================
// DataProvenance: compact, honest data-source labelling
// ------------------------------------------------------------
// Rendered as a one-line metaline under any data point. It labels
// exactly where a value came from and who computed it. The badge
// colour is fixed per source type so users learn the visual grammar:
//   LIVE API      → green  (fetched from a live provider)
//   PREDICTED     → amber  (model / algorithm output)
//   FIELD REPORT  → blue   (geo-tagged observation from an officer)
//   DRILL FEED    → amber  (scripted drill / exercise sequence)
//   LOCAL FEED    → orange (regional fixture / aggregate data)
//   STANDBY       → slate  (uplink offline, awaiting connection)
//   MANUAL UPDATE → slate  (human-entered override)
// ============================================================

import React from 'react';

export type DataSourceKind = 'LIVE API' | 'PREDICTED' | 'FIELD REPORT' | 'DRILL FEED' | 'LOCAL FEED' | 'STANDBY' | 'MANUAL UPDATE';

const SOURCE_STYLES: Record<DataSourceKind, string> = {
  'LIVE API': 'text-green-800 bg-green-50 border border-green-700',
  'PREDICTED': 'text-[#B45309] bg-amber-50 border border-amber-600',
  'FIELD REPORT': 'text-[#0B3D6D] bg-blue-50 border border-[#0B3D6D]/60',
  'DRILL FEED': 'text-amber-800 bg-amber-100 border border-amber-600',
  'LOCAL FEED': 'text-[#7A1F1F] bg-orange-50 border border-orange-400',
  'STANDBY': 'text-slate-700 bg-slate-50 border border-slate-400',
  'MANUAL UPDATE': 'text-slate-700 bg-slate-100 border border-slate-400',
};

export interface DataProvenanceProps {
  source: DataSourceKind;
  basis?: string;
  confidence?: number;
  updatedBy?: string;
  updatedAt?: string;
  className?: string;
}

export function DataSourceBadge({ source }: { source: DataSourceKind }) {
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border shrink-0 ${SOURCE_STYLES[source]}`}>
      {source}
    </span>
  );
}

export default function DataProvenance({
  source,
  basis,
  confidence,
  updatedBy,
  updatedAt,
  className = '',
}: DataProvenanceProps) {
  const parts: string[] = [];
  if (basis) parts.push(`basis: ${basis}`);
  if (confidence !== undefined) parts.push(`confidence ${Math.round(confidence)}%`);
  if (updatedBy) parts.push(`by ${updatedBy}`);
  if (updatedAt) parts.push(updatedAt);

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono ${className}`}>
      <DataSourceBadge source={source} />
      {parts.length > 0 && (
        <span className="text-[9px] text-slate-400 truncate">
          {parts.join(' · ')}
        </span>
      )}
    </span>
  );
}
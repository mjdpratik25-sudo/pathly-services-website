// ============================================================
// StatusBadge: Reusable pill badges for roads, connectivity, severity & vehicles
// ============================================================

import React from 'react';
import { 
  RoadStatus, 
  ConnectivityScore, 
  AlertSeverity, 
  VehicleStatus,
  ReportStatus 
} from '../../data/nerData';

interface StatusBadgeProps {
  type: 'road' | 'connectivity' | 'severity' | 'vehicle' | 'report' | 'custom';
  value: string;
  className?: string;
  dot?: boolean;
}

export default function StatusBadge({ type, value, className = '', dot = true }: StatusBadgeProps) {
  let label = value.replace('_', ' ');
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-400';
  let dotColor = 'bg-slate-500';

  if (type === 'road') {
    const status = value as RoadStatus;
    switch (status) {
      case 'open':
        colorStyles = 'bg-green-50 text-green-800 border-green-700';
        dotColor = 'bg-green-700';
        label = 'Road Open';
        break;
      case 'partially_blocked':
        colorStyles = 'bg-amber-50 text-amber-800 border-amber-600';
        dotColor = 'bg-amber-600';
        label = 'Partially Blocked';
        break;
      case 'blocked':
        colorStyles = 'bg-[#7A1F1F] text-white border-[#7A1F1F]';
        dotColor = 'bg-white';
        label = 'Road Blocked';
        break;
      case 'under_repair':
        colorStyles = 'bg-purple-50 text-purple-800 border-purple-700';
        dotColor = 'bg-purple-700';
        label = 'Under Repair';
        break;
    }
  } else if (type === 'connectivity') {
    const status = value as ConnectivityScore;
    switch (status) {
      case 'excellent':
        colorStyles = 'bg-green-50 text-green-800 border-green-700';
        dotColor = 'bg-green-700';
        label = 'Excellent';
        break;
      case 'good':
        colorStyles = 'bg-teal-50 text-teal-800 border-teal-700';
        dotColor = 'bg-teal-700';
        label = 'Good';
        break;
      case 'moderate':
        colorStyles = 'bg-amber-50 text-amber-800 border-amber-600';
        dotColor = 'bg-amber-600';
        label = 'Moderate';
        break;
      case 'poor':
        colorStyles = 'bg-orange-50 text-orange-800 border-orange-600';
        dotColor = 'bg-orange-600';
        label = 'Poor';
        break;
      case 'critical':
        colorStyles = 'bg-[#7A1F1F] text-white border-[#7A1F1F]';
        dotColor = 'bg-white';
        label = 'Critical Risk';
        break;
    }
  } else if (type === 'severity') {
    const sev = value as AlertSeverity;
    switch (sev) {
      case 'critical':
        colorStyles = 'bg-[#7A1F1F] text-white border-[#7A1F1F]';
        dotColor = 'bg-white';
        label = 'CRITICAL';
        break;
      case 'warning':
        colorStyles = 'bg-amber-50 text-amber-800 border-amber-600';
        dotColor = 'bg-amber-600';
        label = 'WARNING';
        break;
      case 'info':
        colorStyles = 'bg-[#0B3D6D]/10 text-[#0B3D6D] border-[#0B3D6D]';
        dotColor = 'bg-[#0B3D6D]';
        label = 'INFO';
        break;
    }
  } else if (type === 'vehicle') {
    const status = value as VehicleStatus;
    switch (status) {
      case 'in_transit':
        colorStyles = 'bg-[#0B3D6D]/10 text-[#0B3D6D] border-[#0B3D6D]';
        dotColor = 'bg-[#0B3D6D]';
        label = 'In Transit';
        break;
      case 'delayed':
        colorStyles = 'bg-amber-50 text-amber-800 border-amber-600';
        dotColor = 'bg-amber-600';
        label = 'Delayed';
        break;
      case 'delivered':
        colorStyles = 'bg-green-50 text-green-800 border-green-700';
        dotColor = 'bg-green-700';
        label = 'Delivered';
        break;
      case 'stopped':
        colorStyles = 'bg-[#7A1F1F] text-white border-[#7A1F1F]';
        dotColor = 'bg-white';
        label = 'Stopped';
        break;
      case 'loading':
        colorStyles = 'bg-cyan-50 text-cyan-800 border-cyan-700';
        dotColor = 'bg-cyan-700';
        label = 'Loading';
        break;
      case 'returning':
        colorStyles = 'bg-purple-50 text-purple-800 border-purple-700';
        dotColor = 'bg-purple-700';
        label = 'Returning';
        break;
    }
  } else if (type === 'report') {
    const status = value as ReportStatus;
    switch (status) {
      case 'submitted':
        colorStyles = 'bg-[#0B3D6D]/10 text-[#0B3D6D] border-[#0B3D6D]';
        dotColor = 'bg-[#0B3D6D]';
        label = 'Submitted';
        break;
      case 'under_review':
        colorStyles = 'bg-amber-50 text-amber-800 border-amber-600';
        dotColor = 'bg-amber-600';
        label = 'Under Review';
        break;
      case 'verified':
        colorStyles = 'bg-teal-50 text-teal-800 border-teal-700';
        dotColor = 'bg-teal-700';
        label = 'Verified';
        break;
      case 'action_taken':
        colorStyles = 'bg-indigo-50 text-indigo-800 border-indigo-700';
        dotColor = 'bg-indigo-700';
        label = 'Action Taken';
        break;
      case 'resolved':
        colorStyles = 'bg-green-50 text-green-800 border-green-700';
        dotColor = 'bg-green-700';
        label = 'Resolved';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold border tracking-wide uppercase ${colorStyles} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      <span>{label}</span>
    </span>
  );
}

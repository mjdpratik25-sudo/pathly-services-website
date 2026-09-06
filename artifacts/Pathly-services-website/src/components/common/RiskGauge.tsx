// ============================================================
// RiskGauge: Circular gauge indicating terrain/disruption risk (0-100)
// ============================================================

import React from 'react';

interface RiskGaugeProps {
  score: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  showPercent?: boolean;
}

export default function RiskGauge({
  score,
  size = 80,
  strokeWidth = 7,
  label,
  showPercent = true
}: RiskGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  let strokeColor = '#138808'; // green (safe)
  let statusText = 'Low Risk';
  let textColor = 'text-green-700';

  if (clampedScore >= 75) {
    strokeColor = '#7A1F1F'; // maroon (critical)
    statusText = 'Critical';
    textColor = 'text-[#7A1F1F]';
  } else if (clampedScore >= 50) {
    strokeColor = '#FF9933'; // saffron
    statusText = 'Elevated';
    textColor = 'text-[#B45309]';
  } else if (clampedScore >= 25) {
    strokeColor = '#0B3D6D'; // navy (moderate)
    statusText = 'Moderate';
    textColor = 'text-[#0B3D6D]';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-[hsl(var(--muted))]"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`font-bold text-sm lg:text-base leading-none ${textColor}`}>
            {clampedScore}{showPercent ? '%' : ''}
          </span>
        </div>
      </div>
      {label && (
        <div className="mt-1 text-center">
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-medium tracking-wider">{label}</p>
          <p className={`text-[11px] font-semibold ${textColor}`}>{statusText}</p>
        </div>
      )}
    </div>
  );
}

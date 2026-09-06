import React from 'react';

interface PathlyLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const PathlyLogoMark: React.FC<{ size?: number; className?: string; strokeColor?: string }> = ({
  size = 36,
  className = '',
  strokeColor = '#0B3D6D',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none flex-shrink-0 ${className}`}
    >
      {/* Stylized P (flat navy) */}
      <path
        d="M 36 122 L 36 26 C 36 26 84 20 84 56 C 84 90 36 90 36 90"
        fill="none"
        stroke={strokeColor}
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dotted Navigation Trail */}
      <path
        d="M 68 90 C 86 98 98 94 108 82"
        fill="none"
        stroke="#FF9933"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray="1 11"
      />

      {/* Navigation Pin (flat) */}
      <path
        d="M 120 40 C 133 40 144 51 144 64 C 144 80 120 106 120 106 C 120 106 96 80 96 64 C 96 51 107 40 120 40 Z"
        fill="#138808"
      />
      {/* Inner Pin Dot */}
      <circle cx="120" cy="63" r="6" fill="#FFFFFF" />
    </svg>
  );
};

export default function PathlyLogo({ size = 36, className = '', showText = true }: PathlyLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <PathlyLogoMark size={size} />
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-none">
            Pathly
          </span>
          <span className="text-[10px] tracking-wide text-[hsl(var(--muted-foreground))] font-medium mt-0.5">
            Logistics & Route Intelligence
          </span>
        </div>
      )}
    </div>
  );
}

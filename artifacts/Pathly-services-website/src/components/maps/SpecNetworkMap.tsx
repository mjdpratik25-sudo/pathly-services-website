import React from 'react';

interface SpecNetworkMapProps {
  mode?: 'dashboard' | 'route_optimization' | 'vehicle_tracking';
  selectedRoute?: 'recommended' | 'alternate';
  vehiclePosition?: { x: number; y: number; label: string };
  height?: number | string;
}

export default function SpecNetworkMap({
  mode = 'dashboard',
  selectedRoute = 'recommended',
  vehiclePosition = { x: 375, y: 155, label: 'live position' },
  height = 360
}: SpecNetworkMapProps) {
  // Topological Node Coordinates on SVG Canvas (Width 600, Height 320)
  const nodes = {
    guwahati: { x: 95, y: 120, label: mode === 'vehicle_tracking' ? 'Guwahati (origin)' : 'Guwahati' },
    midJunction: { x: 200, y: 140, label: '' },
    northBypass: { x: 300, y: 125, label: '' },
    eastBypass: { x: 380, y: 170, label: '' },
    nongpoh: { x: 230, y: 205, label: 'Nongpoh' },
    shillong: { x: 350, y: 220, label: mode === 'vehicle_tracking' ? 'Shillong (dest)' : 'Shillong' }
  };

  return (
    <div className="relative w-full rounded-xl bg-[#edf0eb]/60 border border-slate-200 overflow-hidden flex flex-col justify-between p-4 select-none" style={{ minHeight: height }}>
      <svg viewBox="0 0 460 270" className="w-full h-full">
        {/* DASHBOARD MODE: Full Network View */}
        {mode === 'dashboard' && (
          <>
            {/* Open Green Corridors */}
            <line x1={nodes.guwahati.x} y1={nodes.guwahati.y} x2={nodes.midJunction.x} y2={nodes.midJunction.y} stroke="#4d7c0f" strokeWidth="3" />
            <line x1={nodes.midJunction.x} y1={nodes.midJunction.y} x2={nodes.northBypass.x} y2={nodes.northBypass.y} stroke="#4d7c0f" strokeWidth="3" />
            <line x1={nodes.northBypass.x} y1={nodes.northBypass.y} x2={nodes.eastBypass.x} y2={nodes.eastBypass.y} stroke="#4d7c0f" strokeWidth="3" />
            
            {/* At-Risk Yellow/Orange Corridors */}
            <line x1={nodes.midJunction.x} y1={nodes.midJunction.y} x2={nodes.nongpoh.x} y2={nodes.nongpoh.y} stroke="#ca8a04" strokeWidth="3" />
            <line x1={nodes.eastBypass.x} y1={nodes.eastBypass.y} x2={nodes.shillong.x} y2={nodes.shillong.y} stroke="#ca8a04" strokeWidth="3" />

            {/* Blocked Red Dashed Segment */}
            <line x1={nodes.nongpoh.x} y1={nodes.nongpoh.y} x2={nodes.shillong.x} y2={nodes.shillong.y} stroke="#dc2626" strokeWidth="3" strokeDasharray="5,5" />

            {/* Network Nodes */}
            <circle cx={nodes.guwahati.x} cy={nodes.guwahati.y} r="5" fill="#111827" />
            <circle cx={nodes.midJunction.x} cy={nodes.midJunction.y} r="4" fill="#365314" />
            <circle cx={nodes.northBypass.x} cy={nodes.northBypass.y} r="4" fill="#365314" />
            <circle cx={nodes.eastBypass.x} cy={nodes.eastBypass.y} r="4" fill="#365314" />
            <circle cx={nodes.nongpoh.x} cy={nodes.nongpoh.y} r="5" fill="#111827" />
            <circle cx={nodes.shillong.x} cy={nodes.shillong.y} r="5" fill="#0284c7" />
          </>
        )}

        {/* ROUTE OPTIMIZATION MODE */}
        {mode === 'route_optimization' && (
          <>
            {/* Recommended Blue Path */}
            <polyline
              points={`${nodes.guwahati.x},${nodes.guwahati.y} ${nodes.midJunction.x},${nodes.midJunction.y} ${nodes.northBypass.x},${nodes.northBypass.y} ${nodes.eastBypass.x},${nodes.eastBypass.y} ${nodes.shillong.x},${nodes.shillong.y}`}
              fill="none"
              stroke="#0284c7"
              strokeWidth={selectedRoute === 'recommended' ? "4.5" : "2"}
              opacity={selectedRoute === 'recommended' ? 1 : 0.4}
            />

            {/* Alternate Blocked Direct Path */}
            <polyline
              points={`${nodes.midJunction.x},${nodes.midJunction.y} ${nodes.nongpoh.x},${nodes.nongpoh.y} ${nodes.shillong.x},${nodes.shillong.y}`}
              fill="none"
              stroke="#dc2626"
              strokeWidth={selectedRoute === 'alternate' ? "4.5" : "2.5"}
              strokeDasharray="5,5"
              opacity={selectedRoute === 'alternate' ? 1 : 0.5}
            />

            {/* Nodes */}
            <circle cx={nodes.guwahati.x} cy={nodes.guwahati.y} r="5.5" fill="#111827" />
            <circle cx={nodes.midJunction.x} cy={nodes.midJunction.y} r="4" fill="#0284c7" />
            <circle cx={nodes.northBypass.x} cy={nodes.northBypass.y} r="4" fill="#0284c7" />
            <circle cx={nodes.eastBypass.x} cy={nodes.eastBypass.y} r="4" fill="#0284c7" />
            <circle cx={nodes.nongpoh.x} cy={nodes.nongpoh.y} r="4" fill="#dc2626" />
            <circle cx={nodes.shillong.x} cy={nodes.shillong.y} r="5.5" fill="#111827" />
          </>
        )}

        {/* VEHICLE TRACKING MODE */}
        {mode === 'vehicle_tracking' && (
          <>
            {/* Completed Path in Blue */}
            <polyline
              points={`${nodes.guwahati.x},${nodes.guwahati.y} ${nodes.midJunction.x},${nodes.midJunction.y} ${nodes.northBypass.x},${nodes.northBypass.y} 270,147`}
              fill="none"
              stroke="#0284c7"
              strokeWidth="4"
            />
            {/* Remaining Path in Light Grey */}
            <polyline
              points={`270,147 ${nodes.eastBypass.x},${nodes.eastBypass.y} ${nodes.shillong.x},${nodes.shillong.y}`}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="3"
            />

            {/* Origin & Destination Nodes */}
            <circle cx={nodes.guwahati.x} cy={nodes.guwahati.y} r="5.5" fill="#111827" />
            <circle cx={nodes.midJunction.x} cy={nodes.midJunction.y} r="4" fill="#0284c7" />
            <circle cx={nodes.northBypass.x} cy={nodes.northBypass.y} r="4" fill="#0284c7" />
            <circle cx={nodes.eastBypass.x} cy={nodes.eastBypass.y} r="4" fill="#94a3b8" />
            <circle cx={nodes.shillong.x} cy={nodes.shillong.y} r="5.5" fill="#111827" />

            {/* Live Orange Ping Marker */}
            <circle cx="270" cy="147" r="6" fill="#ea580c" />
            <circle cx="270" cy="147" r="12" fill="#ea580c" opacity="0.25" className="animate-ping" />
            <text x="270" y="134" textAnchor="middle" fill="#ea580c" fontSize="9.5" fontWeight="600">
              live position
            </text>
          </>
        )}

        {/* Text Labels */}
        <text x={nodes.guwahati.x - 10} y={nodes.guwahati.y - 12} fill="#111827" fontSize="10.5" fontWeight="600">
          {nodes.guwahati.label}
        </text>

        {mode !== 'vehicle_tracking' && (
          <text x={nodes.nongpoh.x - 20} y={nodes.nongpoh.y + 16} fill="#4b5563" fontSize="9.5" fontWeight="500">
            {nodes.nongpoh.label}
          </text>
        )}

        <text x={nodes.shillong.x - 15} y={nodes.shillong.y + 18} fill="#111827" fontSize="10.5" fontWeight="600">
          {nodes.shillong.label}
        </text>
      </svg>

      {/* Legend Footer (Dashboard Mode) */}
      {mode === 'dashboard' && (
        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium px-1">
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-[2px] bg-[#4d7c0f]"></span> open
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-[2px] bg-[#ca8a04]"></span> at-risk
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3.5 h-[2px] border-b-2 border-dashed border-[#dc2626]"></span> blocked
          </span>
        </div>
      )}
    </div>
  );
}

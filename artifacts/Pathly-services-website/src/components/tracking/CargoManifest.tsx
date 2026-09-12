// ============================================================
// CargoManifest: Detailed modal/drawer showing vehicle manifest, timeline & geofence
// ============================================================

import React from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Fuel, 
  ShieldAlert, 
  CheckCircle, 
  Phone, 
  Navigation, 
  Package,
  X,
  AlertTriangle,
  Smartphone,
  Check,
  Crosshair,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { type Vehicle, getCargoIcon } from '../../data/nerData';
import StatusBadge from '../common/StatusBadge';
import { dispatchDriverSms } from '../../lib/smsService';
import { lockScroll, unlockScroll } from '../../lib/scrollLock';
import { syncPlace, ensurePlace, type PlaceDescriptor } from '../../lib/placeNames';
import { requireAuthAction } from '../../lib/authGate';
import { getAssignedRouteForOrder } from '../../lib/orderRouteStore';

interface CargoManifestProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onReroute?: (vehicle: Vehicle) => void;
}

export default function CargoManifest({ vehicle, onClose, onReroute }: CargoManifestProps) {
  const [smsSent, setSmsSent] = React.useState(false);
  const [nearPlace, setNearPlace] = React.useState<PlaceDescriptor | null>(null);
  const assignedRoute = vehicle?.orderToken ? getAssignedRouteForOrder(vehicle.orderToken) : null;

  // Reverse-geocoded place name beside the GPS coordinates — matches the
  // map popup so both panels always show the same "Near:" location.
  React.useEffect(() => {
    if (!vehicle) return;
    const { currentLat, currentLng } = vehicle;
    setNearPlace(syncPlace(currentLat, currentLng));
    let active = true;
    ensurePlace(currentLat, currentLng).then((up) => {
      if (active) setNearPlace(up);
    });
    return () => {
      active = false;
    };
  }, [vehicle?.currentLat, vehicle?.currentLng]);

  // Lock background scroll while the cargo drawer is open (shared with other overlays)
  React.useEffect(() => {
    if (!vehicle) return;
    lockScroll();
    return () => unlockScroll();
  }, [vehicle]);

  if (!vehicle) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in touch-none overscroll-contain"
    >
      <div className="w-full max-w-md bg-[hsl(var(--card))] border-l border-[hsl(var(--border))] h-full flex flex-col shadow-2xl animate-slide-in-right overflow-y-auto overscroll-contain touch-auto">
        {/* Header */}
        <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between sticky top-0 bg-[hsl(var(--card))]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-xl">
              {getCargoIcon(vehicle.cargoType)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-sm text-[hsl(var(--foreground))]">{vehicle.registrationNo}</h3>
                <StatusBadge type="vehicle" value={vehicle.status} />
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">{vehicle.type.replace('_', ' ')} • {vehicle.priority} priority</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 flex-1">
          {/* Status Alert if delayed */}
          {vehicle.status === 'delayed' && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Vehicle Delayed on Route</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300/80 mt-0.5">
                  Transit speed reduced due to heavy rains/debris on {vehicle.route}. Estimated delay: +45 minutes.
                </p>
              </div>
            </div>
          )}

          {/* Assigned Optimal Route from Route Planner */}
          {assignedRoute ? (
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                  <Sparkles size={14} className="text-amber-400" />
                  <span className="uppercase tracking-wider font-mono">Assigned Route Plan</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                  {assignedRoute.status === 'assigned_fleet' ? 'FLEET ASSIGNED' : 'DISPATCHED'}
                </span>
              </div>
              
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-[hsl(var(--foreground))]">{assignedRoute.routeName}</h5>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  Corridor: <span className="font-mono text-blue-300 font-semibold">{assignedRoute.corridorSummary}</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-500/20 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">PLANNED DIST</span>
                  <span className="font-bold text-[hsl(var(--foreground))]">{assignedRoute.totalDistanceKm} km</span>
                </div>
                <div>
                  <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">EST TIME</span>
                  <span className="font-bold text-blue-400">{assignedRoute.estimatedTimeHours} hrs</span>
                </div>
                <div>
                  <span className="text-[9px] text-[hsl(var(--muted-foreground))] block">RISK SCORE</span>
                  <span className={`font-bold ${assignedRoute.riskScore >= 70 ? 'text-red-400' : assignedRoute.riskScore >= 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {assignedRoute.riskScore}/100
                  </span>
                </div>
              </div>

              {assignedRoute.avoidanceNotice && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 flex items-center gap-1.5 font-bold">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{assignedRoute.avoidanceNotice}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                <span>Dispatched: {assignedRoute.dispatchedAt}</span>
                <a 
                  href={`/planner?order=${encodeURIComponent(vehicle.orderToken)}`}
                  className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Re-plan Route</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-[hsl(var(--muted))]/30 border border-[hsl(var(--border))] flex items-center justify-between text-xs">
              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Order: <strong className="font-mono text-blue-400">{vehicle.orderToken}</strong></span>
              <a 
                href={`/planner?order=${encodeURIComponent(vehicle.orderToken)}`}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-bold"
              >
                <Sparkles size={12} />
                <span>Plan Route for Order →</span>
              </a>
            </div>
          )}

          {/* Route & Progress */}
          <div className="p-3.5 rounded-xl bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))] space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[hsl(var(--muted-foreground))] font-semibold uppercase">Transit Progress</span>
              <span className="font-mono font-bold text-blue-400">{vehicle.progress}%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${vehicle.progress}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-[hsl(var(--border))]/50">
              <div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-mono">Origin</p>
                <p className="font-bold text-[hsl(var(--foreground))]">{vehicle.origin}</p>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{vehicle.departureTime}</p>
              </div>
              <div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-mono">Destination</p>
                <p className="font-bold text-[hsl(var(--foreground))]">{vehicle.destination}</p>
                <p className="text-[10px] text-emerald-400 font-mono">ETA: {vehicle.eta}</p>
              </div>
            </div>
          </div>

          {/* Cargo Manifest Specs */}
          <div className="p-3.5 rounded-xl bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))] space-y-2">
            <h4 className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Cargo Details</h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{vehicle.cargoDescription}</p>
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-blue-400" />
                <span>Weight: <strong>{vehicle.cargoWeight} Tons</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Fuel size={14} className="text-emerald-400" />
                <span>Fuel: <strong className="font-mono">{Math.round(vehicle.fuelLevel)}%</strong></span>
              </div>
            </div>
          </div>

          {/* Telemetry & Driver */}
          <div className="p-3.5 rounded-xl bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))] space-y-2.5">
            <h4 className="text-xs font-bold text-[hsl(var(--foreground))] uppercase tracking-wider">Driver & Telemetry</h4>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">Driver Name:</span>
              <span className="font-semibold text-[hsl(var(--foreground))]">{vehicle.driverName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">Contact Number:</span>
              <a
                href={`tel:${vehicle.driverPhone}`}
                className="flex items-center gap-1 text-blue-400 font-mono hover:underline"
              >
                <Phone size={12} />
                <span>+91 {vehicle.driverPhone}</span>
              </a>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">Current GPS Coordinates:</span>
              <span className="font-mono text-[11px] text-emerald-400">
                {vehicle.currentLat.toFixed(4)}°N, {vehicle.currentLng.toFixed(4)}°E
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">Near:</span>
              <span className="font-mono text-[11px] text-emerald-400/90 text-right">
                {nearPlace ? nearPlace.formatted : 'Resolving nearest place…'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!requireAuthAction('View Exact Location on Map')) return;
                window.dispatchEvent(new CustomEvent('pathly_navigate_vehicle', { detail: vehicle }));
                onClose();
              }}
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Crosshair size={13} />
              <span>View Exact Location on Map</span>
            </button>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[hsl(var(--muted-foreground))]">Current Speed:</span>
              <span className="font-mono font-bold text-blue-400">{vehicle.speed} km/h</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[hsl(var(--border))] flex items-center gap-2 sticky bottom-0 bg-[hsl(var(--card))] flex-wrap">
          <button
            onClick={() => {
              if (!requireAuthAction('Alternate Corridor')) return;
              onReroute?.(vehicle);
            }}
            className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20 whitespace-nowrap"
          >
            <Navigation size={14} />
            <span>Alternate Corridor</span>
          </button>
          <button
            onClick={async () => {
              if (!requireAuthAction('SMS Driver')) return;
              setSmsSent(true);
              await dispatchDriverSms({
                recipientPhone: vehicle.driverPhone,
                driverName: vehicle.driverName,
                vehicleNo: vehicle.registrationNo,
                hazardType: 'reroute_advisory',
                location: `${vehicle.currentLat.toFixed(2)}°N, ${vehicle.currentLng.toFixed(2)}°E`,
                recommendedCorridor: 'NH-6 Alternate Bypass',
                language: 'en'
              });
              setTimeout(() => setSmsSent(false), 3000);
            }}
            className="py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20 whitespace-nowrap"
          >
            {smsSent ? <Check size={14} className="text-emerald-300" /> : <Smartphone size={14} />}
            <span>{smsSent ? 'SMS Dispatched' : 'SMS Driver'}</span>
          </button>
          <button
            onClick={onClose}
            className="py-2 px-3 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 text-[hsl(var(--foreground))] text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

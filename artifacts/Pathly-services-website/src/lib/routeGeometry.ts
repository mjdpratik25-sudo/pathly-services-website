// ============================================================
// routeGeometry: resolves fleet origin/destination towns to
// coordinates and builds the synthetic "planned route" for a
// vehicle as two polylines (traveled / remaining) so the map can
// show how far along its journey a consignment actually is.
// ============================================================

import { NER_DISTRICTS, type Vehicle } from '../data/nerData';

// Towns used in the fleet registry that are not NER_DISTRICTS
// major towns (or that need a more precise coordinate than the
// aggregated district centroid).
const CITY_HUB_OVERRIDES: Record<string, [number, number]> = {
  'Numaligarh Refinery': [26.63, 93.72],
  'Guwahati': [26.1445, 91.7362],
  'Tezpur': [26.6332, 92.7928],
  'Silchar': [24.8333, 92.7789],
  'Shillong': [25.5788, 91.8933],
  'Dimapur': [25.9, 93.7333],
};

export function resolveTownCoords(name: string): { lat: number; lng: number } | null {
  const key = name.trim();
  if (!key) return null;

  const ov = CITY_HUB_OVERRIDES[key];
  if (ov) return { lat: ov[0], lng: ov[1] };

  const lower = key.toLowerCase();
  const found = NER_DISTRICTS.find(
    (d) => d.majorTown.toLowerCase() === lower || d.name.toLowerCase() === lower
  );
  if (found) return { lat: found.lat, lng: found.lng };

  return null;
}

// Introduce two gentle side bends so the straight line between the
// hubs reads as a plausible road corridor instead of a ruler line.
function bendPath(a: { lat: number; lng: number }, b: { lat: number; lng: number }): Array<[number, number]> {
  const midLat = (a.lat + b.lat) / 2;
  const midLng = (a.lng + b.lng) / 2;
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  const len = Math.max(Math.hypot(dLat, dLng), 1e-6);
  const off = Math.min(0.22, len * 0.16);
  const nLat = -dLng / len;
  const nLng = dLat / len;

  return [
    [a.lat, a.lng],
    [midLat + nLat * off, midLng + nLng * off],
    [midLat - nLat * off * 0.6, midLng - nLng * off * 0.6],
    [b.lat, b.lng],
  ] as Array<[number, number]>;
}

export interface VehicleRoute {
  traveled: Array<[number, number]>;
  remaining: Array<[number, number]>;
}

// The traveled leg runs from the origin hub to the vehicle's current
// GPS fix; the remaining leg continues from that same fix to the
// destination hub — so the vehicle marker sits exactly on the joint
// between the two visually distinct halves of the route.
export function buildVehicleRoute(veh: Vehicle): VehicleRoute | null {
  const origin = resolveTownCoords(veh.origin);
  const dest = resolveTownCoords(veh.destination);
  if (!origin || !dest) return null;

  const current = { lat: veh.currentLat, lng: veh.currentLng };

  return {
    traveled: bendPath(origin, current),
    remaining: bendPath(current, dest),
  };
}
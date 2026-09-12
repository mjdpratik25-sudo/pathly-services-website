// ============================================================
// placeNames: human-readable name alongside raw GPS coordinates.
// Priority order when resolving a point:
//   1. Google Geocoder (the provider already rendering the Google map)
//   2. Nominatim reverse geocode (used elsewhere in the app)
//   3. Nearest known NER locality / district (instant, offline)
// Results are cached per rounded coordinate so the 5s telemetry tick
// never re-fires network lookups for the same position.
// ============================================================

import { NER_LOCALITIES, NER_DISTRICTS } from '../data/nerData';
import { reverseGeocode } from './geocodeService';

export interface PlaceDescriptor {
  primary: string;
  formatted: string;
  source: 'google' | 'nominatim' | 'locality' | 'district';
}

const resolvedCache = new Map<string, PlaceDescriptor>();
const pendingCache = new Map<string, Promise<PlaceDescriptor | null>>();

function keyFor(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Instant, offline fallback: nearest named NER locality within ~25 km,
// otherwise the nearest district. Never throws and never leaves the point
// unnamed, so remote stretches of road still get a place reference.
export function nearestKnownPlace(lat: number, lng: number): PlaceDescriptor {
  let bestLoc: (typeof NER_LOCALITIES)[number] | null = null;
  let bestLocDist = Infinity;
  for (const loc of NER_LOCALITIES) {
    const d = haversineKm(lat, lng, loc.lat, loc.lng);
    if (d < bestLocDist) {
      bestLocDist = d;
      bestLoc = loc;
    }
  }
  if (bestLoc && bestLocDist <= 25) {
    const area = bestLoc.city === bestLoc.name ? bestLoc.name : `${bestLoc.name}, ${bestLoc.city}`;
    return {
      primary: bestLoc.name,
      formatted: `${area}, ${bestLoc.district}, ${bestLoc.state}`,
      source: 'locality',
    };
  }

  let bestDist: (typeof NER_DISTRICTS)[number] | null = null;
  let bestDistKm = Infinity;
  for (const d of NER_DISTRICTS) {
    const km = haversineKm(lat, lng, d.lat, d.lng);
    if (km < bestDistKm) {
      bestDistKm = km;
      bestDist = d;
    }
  }
  if (bestDist) {
    return { primary: bestDist.name, formatted: `${bestDist.name} District`, source: 'district' };
  }

  return { primary: 'Unknown location', formatted: 'Near NER corridor', source: 'district' };
}

async function resolvePlaceName(lat: number, lng: number): Promise<PlaceDescriptor | null> {
  // 1. Google Geocoder (same provider as the Google map behind this popup)
  const google = (window as any)?.google?.maps;
  if (google?.Geocoder) {
    try {
      const geocoder = new google.Geocoder();
      const result = await new Promise<any>((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, resolve);
      });
      const address = result?.results?.[0]?.formatted_address;
      if (typeof address === 'string' && address.trim()) {
        return { primary: address.split(',')[0].trim(), formatted: address, source: 'google' };
      }
    } catch {
      /* fall through */
    }
  }

  // 2. Nominatim reverse geocode (already used by the app's geocode service)
  try {
    const nom = await reverseGeocode(lat, lng);
    if (nom?.formattedAddress?.trim()) {
      return {
        primary: nom.name || nom.formattedAddress.split(',')[0].trim(),
        formatted: nom.formattedAddress,
        source: 'nominatim',
      };
    }
  } catch {
    /* fall through */
  }

  return null;
}

// Synchronous lookup for rendering: returns the resolved descriptor when
// available, otherwise an instant local fallback AND kicks off the async
// upgrade (Google/Nominatim) in the background so callers can refresh.
export function syncPlace(lat: number, lng: number): PlaceDescriptor {
  const key = keyFor(lat, lng);
  const hit = resolvedCache.get(key);
  if (hit) return hit;

  const provisional = nearestKnownPlace(lat, lng);
  resolvedCache.set(key, provisional);

  if (!pendingCache.has(key)) {
    const p = resolvePlaceName(lat, lng)
      .then((result) => {
        if (result) {
          resolvedCache.set(key, result);
          return result;
        }
        return provisional;
      })
      .catch(() => provisional)
      .finally(() => {
        pendingCache.delete(key);
      });
    pendingCache.set(key, p);
  }
  return provisional;
}

// Awaits the (possibly in-flight) upgrade chain and always returns a usable
// descriptor. Safe to call repeatedly — cheap once resolved.
export async function ensurePlace(lat: number, lng: number): Promise<PlaceDescriptor> {
  const key = keyFor(lat, lng);
  const pending = pendingCache.get(key);
  if (pending) return (await pending) ?? resolvedCache.get(key) ?? nearestKnownPlace(lat, lng);
  return syncPlace(lat, lng);
}

// Compact short name for tight on-map labels.
export function shortPlaceName(desc: PlaceDescriptor, max = 16): string {
  const name = desc.primary.trim();
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}
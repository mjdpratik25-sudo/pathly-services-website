import { NER_LOCALITIES, NER_DISTRICTS, GIS_INFRASTRUCTURE } from '../data/nerData';

export interface GeocodingResult {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId?: string;
  types?: string[];
  category?: string;
  elevation?: number;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/**
 * Forward geocode: address/place name → coordinates
 * Checks high-precision NER localities and infrastructure first, then fallback to Nominatim.
 */
export async function geocodeAddress(query: string): Promise<GeocodingResult | null> {
  const qClean = query.trim().toLowerCase();
  if (!qClean) return null;

  // 1. Check local NER localities
  const localMatch = NER_LOCALITIES.find(loc => 
    loc.name.toLowerCase().includes(qClean) ||
    qClean.includes(loc.name.toLowerCase()) ||
    `${loc.name} ${loc.city}`.toLowerCase().includes(qClean)
  );

  if (localMatch) {
    return {
      name: localMatch.name,
      formattedAddress: `${localMatch.name}, ${localMatch.city}, ${localMatch.district}, ${localMatch.state} (PIN: ${localMatch.pincode})`,
      lat: localMatch.lat,
      lng: localMatch.lng,
      placeId: localMatch.id,
      category: localMatch.category,
      elevation: localMatch.elevation,
    };
  }

  // 2. Check local NER districts
  const distMatch = NER_DISTRICTS.find(d =>
    d.name.toLowerCase().includes(qClean) ||
    d.majorTown.toLowerCase().includes(qClean) ||
    qClean.includes(d.name.toLowerCase()) ||
    qClean.includes(d.majorTown.toLowerCase())
  );

  if (distMatch) {
    return {
      name: distMatch.name,
      formattedAddress: `${distMatch.name} (${distMatch.majorTown}), ${distMatch.state}, India`,
      lat: distMatch.lat,
      lng: distMatch.lng,
      placeId: distMatch.id,
      elevation: distMatch.elevation,
    };
  }

  // 3. Fallback to OpenStreetMap Nominatim with NER Viewbox priority
  try {
    const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&countrycodes=in&viewbox=88.0,29.5,97.5,21.5`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'PathlyServices/1.0' },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const item = data[0];
      return {
        name: item.display_name?.split(',')[0] || query,
        formattedAddress: item.display_name || query,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        placeId: item.osm_id?.toString(),
        types: item.type ? [item.type] : [],
      };
    }
    return null;
  } catch (err) {
    console.warn('Nominatim forward geocode error:', err);
    return null;
  }
}

/**
 * Reverse geocode: coordinates → address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'PathlyServices/1.0' },
    });
    const data = await res.json();
    if (data && data.display_name) {
      return {
        name: data.address?.village || data.address?.suburb || data.address?.neighbourhood || data.address?.town || data.address?.city || data.display_name.split(',')[0],
        formattedAddress: data.display_name,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        placeId: data.osm_id?.toString(),
      };
    }
    return null;
  } catch (err) {
    console.warn('Nominatim reverse geocode error:', err);
    return null;
  }
}

/**
 * Autocomplete search suggestions (combines instant local NER localities + Nominatim)
 */
export async function searchSuggestions(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 1) return [];
  const qLower = query.trim().toLowerCase();

  const results: GeocodingResult[] = [];

  // A. Instant match in NER Localities
  NER_LOCALITIES.forEach(loc => {
    if (
      loc.name.toLowerCase().includes(qLower) ||
      loc.city.toLowerCase().includes(qLower) ||
      loc.district.toLowerCase().includes(qLower) ||
      loc.pincode.includes(qLower)
    ) {
      results.push({
        name: loc.name,
        formattedAddress: `${loc.name}, ${loc.city}, ${loc.state} • Elevation: ${loc.elevation}m`,
        lat: loc.lat,
        lng: loc.lng,
        placeId: loc.id,
        category: loc.category,
        elevation: loc.elevation,
      });
    }
  });

  // B. Instant match in Strategic GIS Infrastructure
  GIS_INFRASTRUCTURE.forEach(gis => {
    if (
      gis.name.toLowerCase().includes(qLower) ||
      gis.district.toLowerCase().includes(qLower) ||
      gis.state.toLowerCase().includes(qLower)
    ) {
      results.push({
        name: gis.name,
        formattedAddress: `${gis.name} [${gis.type.replace('_', ' ')}] • ${gis.district}, ${gis.state}`,
        lat: gis.lat,
        lng: gis.lng,
        placeId: gis.id,
        category: 'landmark',
        elevation: gis.elevation,
      });
    }
  });

  // C. Instant match in Districts
  NER_DISTRICTS.forEach(d => {
    if (
      d.name.toLowerCase().includes(qLower) ||
      d.majorTown.toLowerCase().includes(qLower) ||
      d.state.toLowerCase().includes(qLower)
    ) {
      // Avoid duplicate if city already added
      if (!results.some(r => r.name === d.name || r.name === d.majorTown)) {
        results.push({
          name: `${d.majorTown} (${d.name})`,
          formattedAddress: `${d.name} District, ${d.state}, India • Elevation: ${d.elevation}m`,
          lat: d.lat,
          lng: d.lng,
          placeId: d.id,
          elevation: d.elevation,
        });
      }
    }
  });

  // D. If local results are fewer than 5, query Nominatim for exact streets/custom localities
  if (results.length < 5 && query.trim().length >= 2) {
    try {
      const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=in&viewbox=88.0,29.5,97.5,21.5`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'PathlyServices/1.0' },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          const itemLat = parseFloat(item.lat);
          const itemLng = parseFloat(item.lon);
          // Deduplicate
          if (!results.some(r => Math.abs(r.lat - itemLat) < 0.005 && Math.abs(r.lng - itemLng) < 0.005)) {
            results.push({
              name: item.display_name?.split(',')[0] || query,
              formattedAddress: item.display_name || '',
              lat: itemLat,
              lng: itemLng,
              placeId: item.osm_id?.toString(),
              types: item.type ? [item.type] : [],
            });
          }
        });
      }
    } catch (err) {
      console.warn('Nominatim suggestions error:', err);
    }
  }

  return results.slice(0, 8);
}

/**
 * Free routing via OSRM (OpenStreetMap Routing Machine)
 * Returns polyline coordinates for the route between two points.
 */
export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] pairs
  distanceKm: number;
  durationMinutes: number;
  summary: string;
}

export async function getRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteResult | null> {
  try {
    // OSRM uses lng,lat order
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // OSRM returns [lng, lat], convert to [lat, lng]
      const coordinates: [number, number][] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      );
      return {
        coordinates,
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMinutes: Math.round(route.duration / 60),
        summary: route.legs?.[0]?.summary || `${Math.round(route.distance / 1000)} km route`,
      };
    }
    return null;
  } catch (err) {
    console.warn('OSRM routing error:', err);
    return null;
  }
}

/**
 * Snap GPS points to nearest road via OSRM
 */
export async function snapToRoad(lat: number, lng: number): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code === 'Ok' && data.waypoints && data.waypoints.length > 0) {
      const wp = data.waypoints[0];
      return { lat: wp.location[1], lng: wp.location[0] };
    }
    return null;
  } catch (err) {
    console.warn('OSRM snap-to-road error:', err);
    return null;
  }
}

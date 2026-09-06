// ============================================================
// useUserLocation: Real location detection for the logged-in user
// Uses browser geolocation and maps GPS coords to the nearest NER
// district (offline, client-side reverse geocode) to derive a
// realistic "State Jurisdiction" / region. Falls back gracefully
// when geolocation is unavailable or denied.
// ============================================================

import { useEffect, useState } from 'react';
import { NER_DISTRICTS, type NERState } from '../data/nerData';

export interface UserLocationResult {
  status: 'detected' | 'failed';
  lat?: number;
  lng?: number;
  districtName?: string;
  majorTown?: string;
  state?: NERState;
  label?: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function useUserLocation(): UserLocationResult {
  const [result, setResult] = useState<UserLocationResult>({ status: 'failed' });

  useEffect(() => {
    let cancelled = false;
    if (!('geolocation' in navigator)) {
      setResult({ status: 'failed' });
      return;
    }

    const finish = (latitude: number, longitude: number) => {
      if (cancelled) return;
      let nearest = NER_DISTRICTS[0];
      let best = Infinity;
      for (const d of NER_DISTRICTS) {
        const dist = haversineKm(latitude, longitude, d.lat, d.lng);
        if (dist < best) {
          best = dist;
          nearest = d;
        }
      }
      setResult({
        status: 'detected',
        lat: latitude,
        lng: longitude,
        districtName: nearest.name,
        majorTown: nearest.majorTown,
        state: nearest.state,
        label: `${nearest.majorTown || nearest.name}, ${nearest.state}`,
      });
    };

    const onSuccess = (pos: GeolocationPosition) => finish(pos.coords.latitude, pos.coords.longitude);
    const onError = () => {
      if (!cancelled) setResult({ status: 'failed' });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 600000,
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return result;
}

// ============================================================
// demoConfig: Central API-key detection & demo-mode flag
// Every external service adapter checks this to decide whether
// to call a real API or return deterministic fixture data.
// ============================================================

/**
 * Returns true when no external API key is configured.
 * The app is fully functional without keys — all data is local
 * fixture data and any SMS/OTP is simulated in-memory.
 */
export function isDemoMode(): boolean {
  const owm = (import.meta.env.VITE_OPENWEATHERMAP_API_KEY || '').trim();
  const gm  = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const f2s = (import.meta.env.VITE_FAST2SMS_API_KEY  || '').trim();
  const mbx = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '').trim();
  return !owm && !gm && !f2s && !mbx;
}

/**
 * Returns a list of which external services are unavailable.
 */
export function getUnavailableServices(): string[] {
  const unavailable: string[] = [];
  if (!(import.meta.env.VITE_OPENWEATHERMAP_API_KEY || '').trim()) unavailable.push('OpenWeatherMap');
  if (!(import.meta.env.VITE_GOOGLE_MAPS_API_KEY   || '').trim()) unavailable.push('Google Maps');
  if (!(import.meta.env.VITE_FAST2SMS_API_KEY      || '').trim()) unavailable.push('Fast2SMS');
  if (!(import.meta.env.VITE_MAPBOX_ACCESS_TOKEN   || '').trim()) unavailable.push('Mapbox');
  return unavailable;
}

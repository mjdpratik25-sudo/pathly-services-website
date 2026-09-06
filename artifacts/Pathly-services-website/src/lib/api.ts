// ============================================================
// Pathly: Production Client-side API Service
// Connects UI to Live Backend Endpoints (IMD, ML Risk, A* Route, GPS Telemetry)
// ============================================================

export interface BackendSummary {
  success: boolean;
  platform: string;
  version: string;
  region: string;
  activeFleet: number;
  monitoredDistricts: number;
  activeWeatherWarnings: number;
  systemHealth: string;
  timestamp: string;
}

export interface LiveWeatherResponse {
  success: boolean;
  count: number;
  data: any[];
  source: string;
  timestamp: string;
}

const API_BASE_URL = '/api';

/**
 * Fetch live system telemetry summary from the backend
 */
export async function getLiveSummary(): Promise<BackendSummary | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/logistics/summary`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch real IMD / Open-Meteo observations for NER
 */
export async function getLiveWeather(): Promise<LiveWeatherResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/logistics/weather/live`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Request server-side A* route optimization
 */
export async function requestServerRouteOptimization(params: {
  origin: string;
  destination: string;
  cargoType: string;
  priority: string;
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/logistics/routes/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend route optimizer fallback active', err);
    return null;
  }
}

/**
 * Push offline field reports batch to server
 */
export async function syncFieldReportsToServer(reports: any[]) {
  try {
    const res = await fetch(`${API_BASE_URL}/field-reports/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reports }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Send real GPS ping from a vehicle tracker
 */
export async function transmitGPSPing(ping: {
  vehicleId: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  fuelPercent?: number;
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/telemetry/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ping),
      signal: AbortSignal.timeout(4000),
    });
    return await res.json();
  } catch {
    return null;
  }
}

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
export async function syncFieldReportsToServer(reports: any[]): Promise<FieldReportSyncResult | null> {
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

/**
 * Pull the server-authoritative field report history & analytics (Item 7).
 */
export interface FieldReportSyncResult {
  success: boolean;
  syncedCount: number;
  conflicts: number;
  serverSyncedIds: string[];
  totalStored: number;
}

export interface FieldStats {
  success: boolean;
  total: number;
  last24h: number;
  pending: number;
  resolutionRate: number;
  byCategory: Record<string, number>;
  byState: Record<string, number>;
}

export async function getLiveFieldReports(): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/field-reports`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.success ? json.reports : null;
  } catch {
    return null;
  }
}

export async function getLiveFieldStats(): Promise<FieldStats | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/field-reports/stats`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.success ? json : null;
  } catch {
    return null;
  }
}

export async function getLiveTelemetry(): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/telemetry/live`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

// ============================================================
// Live GPS fleet pipeline (ingestion + read APIs)
// ============================================================

export interface FleetVehicle {
  id: string;
  registrationNo: string;
  driverName: string;
  currentLat: number;
  currentLng: number;
  speed: number;
  heading: number;
  status: string;
  telemetryStatus: string;
  eta: string;
  progress: number;
  signalAgeMs: number;
  source: string;
  sourceLabel: string;
  distanceTodayKm: number;
  distanceTripKm: number;
  fuelLevel?: number;
  lastPing?: { lat: number; lng: number; speed: number; heading: number } | null;
}

export async function getFleetVehicles(): Promise<FleetVehicle[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/fleet/vehicles`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.success ? (json.vehicles as FleetVehicle[]) : null;
  } catch {
    return null;
  }
}

/**
 * Send a real browser Geolocation ping for Driver Mode. Tagged
 * 'driver_mobile' so the backend never mistakes it for the simulator.
 */
export async function transmitDriverMobilePing(ping: {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy?: number | null;
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/telemetry/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ping, ignitionStatus: true, source: 'driver_mobile', deviceLabel: 'Browser Geolocation (Driver Mode)' }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getFleetSummary(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/fleet/summary`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.success ? json : null;
  } catch {
    return null;
  }
}

export interface FleetAlertItem {
  id: number;
  alert_key: string;
  vehicle_id: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  lat: number;
  lng: number;
  source: string;
  sourceLabel?: string;
  is_active: 0 | 1;
  created_at: number;
}

export async function getFleetAlerts(limit = 40): Promise<FleetAlertItem[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/fleet/alerts?limit=${limit}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.success ? (json.alerts as FleetAlertItem[]) : null;
  } catch {
    return null;
  }
}

export async function getVehicleHistory(vehicleId: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/history`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const json = await res.json();
    return json.success ? json.points : [];
  } catch {
    return null;
  }
}

export async function getVehicleTrips(vehicleId: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/trips`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const json = await res.json();
    return json.success ? json.trips : [];
  } catch {
    return null;
  }
}

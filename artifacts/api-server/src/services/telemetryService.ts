// ============================================================
// NER-SAIL: Real GPS Tracker Hardware Telemetry Ingestion Pipeline
// Supports AIS-140 / Teltonika / Queclink & Mobile GPS Pings
// ============================================================

export interface GPSPingPayload {
  vehicleId: string;
  imei?: string;
  lat: number;
  lng: number;
  speed: number; // km/h
  heading: number; // 0-360 degrees
  altitude?: number;
  fuelPercent?: number;
  batteryVoltage?: number;
  engineStatus?: boolean;
  timestamp?: string;
}

export interface GPSPingResponse {
  success: boolean;
  vehicleId: string;
  status: 'in_transit' | 'delayed' | 'stopped' | 'geofence_breach';
  speedKmh: number;
  geofenceAlert: boolean;
  message: string;
  processedAt: string;
}

// In-Memory Live State Cache for Ultra-Fast Telemetry Stream
const activeTelemetryCache = new Map<string, GPSPingPayload & { lastPing: Date; status: string }>();

/**
 * Ingests and validates hardware GPS pings from vehicles.
 */
export function processGPSPing(payload: GPSPingPayload): GPSPingResponse {
  if (!payload.vehicleId || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
    throw new Error('Invalid GPS ping payload: missing vehicleId or coordinates');
  }

  // Determine state based on speed and heading
  let status: GPSPingResponse['status'] = 'in_transit';
  if (payload.speed < 3) {
    status = 'stopped';
  } else if (payload.speed < 20) {
    status = 'delayed'; // Heavy traffic / mountain slowdown
  }

  // Check geofence boundary (North East India bounding box: Lat 21.5 to 29.5, Lng 88.0 to 97.5)
  const isInsideNER = (
    payload.lat >= 21.5 && payload.lat <= 29.5 &&
    payload.lng >= 88.0 && payload.lng <= 97.5
  );

  const geofenceAlert = !isInsideNER;
  if (geofenceAlert) {
    status = 'geofence_breach';
  }

  activeTelemetryCache.set(payload.vehicleId, {
    ...payload,
    lastPing: new Date(),
    status,
  });

  return {
    success: true,
    vehicleId: payload.vehicleId,
    status,
    speedKmh: Math.round(payload.speed),
    geofenceAlert,
    message: geofenceAlert
      ? 'WARNING: Vehicle exited designated North East corridor boundary.'
      : 'Telemetry ping synchronized successfully.',
    processedAt: new Date().toISOString(),
  };
}

export function getAllActiveTelemetry() {
  return Array.from(activeTelemetryCache.values());
}

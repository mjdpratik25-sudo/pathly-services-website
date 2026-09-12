// ============================================================
// NER-SAIL: Real GPS Tracker Hardware Telemetry Ingestion Pipeline
// Supports AIS-140 / Teltonika / Queclink & Mobile GPS Pings
// ------------------------------------------------------------
// All telemetry is now persisted through the SQLite pipeline in
// gpsPipeline (ingest → storage → derived trips/stops → geofencing).
// These legacy entrypoints keep their previous call signatures so
// existing routes keep working while data flows to the real store.
// ============================================================

import {
  ingestLocationPing,
  getAllActiveTelemetryForLegacy,
  type LocationPing,
} from './gpsPipeline';

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
  source: string;
  sourceLabel: string;
}

/**
 * Ingests and validates hardware GPS pings from vehicles.
 * (Persisted through the real pipeline — trips/stops/alerts are derived.)
 */
export function processGPSPing(payload: GPSPingPayload): GPSPingResponse {
  const ping: LocationPing = {
    vehicleId: payload.vehicleId,
    latitude: payload.lat,
    longitude: payload.lng,
    speed: payload.speed,
    heading: payload.heading,
    timestamp: payload.timestamp,
    imei: payload.imei,
    source: payload.imei ? 'real' : 'simulator',
  };
  const result = ingestLocationPing(ping);

  const insideNER =
    result.lastKnown.lat >= 21.5 && result.lastKnown.lat <= 29.5 &&
    result.lastKnown.lng >= 88.0 && result.lastKnown.lng <= 97.5;
  const geofenceAlert = !insideNER;
  const mappedStatus = result.status === 'delivered' ? 'stopped' : result.status;

  return {
    success: true,
    vehicleId: payload.vehicleId,
    status: geofenceAlert ? 'geofence_breach' : mappedStatus,
    speedKmh: Math.round(result.lastKnown.speed),
    geofenceAlert,
    message: geofenceAlert
      ? 'WARNING: Vehicle exited designated North East corridor boundary.'
      : 'Telemetry ping synchronized and persisted successfully.',
    processedAt: result.receivedAt,
    source: result.source,
    sourceLabel: result.sourceLabel,
  };
}

export function getAllActiveTelemetry() {
  return getAllActiveTelemetryForLegacy();
}
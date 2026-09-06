// ============================================================
// NER-SAIL: Production-Grade PostgreSQL Database Schema
// Geospatial Tables for Districts, OSM Roads, Incidents, GPS Fleet & Weather
// ============================================================

import { pgTable, text, serial, integer, doublePrecision, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// 1. Monitored Districts
export const districtsTable = pgTable("districts", {
  id: text("id").primaryKey(), // e.g. "AS-KAM"
  name: text("name").notNull(),
  state: text("state").notNull(),
  majorTown: text("major_town").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  elevation: integer("elevation").notNull(), // meters ASL
  terrain: text("terrain").notNull(), // mountains, hills, valley, plains, riverine
  population: integer("population").notNull(),
  avgRainfall: integer("avg_rainfall").notNull(), // mm annual
  nhConnected: jsonb("nh_connected").notNull().$type<string[]>(),
  railConnected: boolean("rail_connected").default(false),
  airportNearby: boolean("airport_nearby").default(false),
  connectivityScore: integer("connectivity_score").default(70),
  landslideRisk: text("landslide_risk").default("low"), // low, medium, high
  floodRisk: text("flood_risk").default("low"), // low, medium, high
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Road Network Segments (OSM / National Highways)
export const roadSegmentsTable = pgTable("road_segments", {
  id: text("id").primaryKey(), // e.g. "SEG-NH44-01"
  name: text("name").notNull(), // "NH-44 Guwahati-Shillong Expressway"
  type: text("type").notNull(), // "NH", "SH", "MDR", "PMGSY"
  fromTown: text("from_town").notNull(),
  toTown: text("to_town").notNull(),
  fromLat: doublePrecision("from_lat").notNull(),
  fromLng: doublePrecision("from_lng").notNull(),
  toLat: doublePrecision("to_lat").notNull(),
  toLng: doublePrecision("to_lng").notNull(),
  distanceKm: doublePrecision("distance_km").notNull(),
  status: text("status").default("open"), // open, partially_blocked, blocked, under_repair
  conditionScore: integer("condition_score").default(85), // 0-100
  terrain: text("terrain").notNull(),
  bridgeCount: integer("bridge_count").default(0),
  riskScore: integer("risk_score").default(20),
  maxLoadTons: doublePrecision("max_load_tons").default(40.0),
  lastInspected: timestamp("last_inspected").defaultNow(),
  osmWayId: text("osm_way_id"),
  geometry: jsonb("geometry").$type<[number, number][]>(), // Detailed polyline coordinates
});

// 3. Logistics Disruptions & Incidents (PWD / SDRF / BRO)
export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  incidentCode: text("incident_code").unique().notNull(), // "ALT-001"
  title: text("title").notNull(),
  category: text("category").notNull(), // landslide, flood, bridge_closure, road_damage, accident
  severity: text("severity").notNull(), // critical, warning, info
  state: text("state").notNull(),
  district: text("district").notNull(),
  location: text("location").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  description: text("description").notNull(),
  reportedBy: text("reported_by").notNull(),
  reportedAt: timestamp("reported_at").defaultNow(),
  estimatedClearTime: text("estimated_clear_time").notNull(),
  affectedRoutes: jsonb("affected_routes").$type<string[]>(),
  isActive: boolean("is_active").default(true),
  acknowledged: boolean("acknowledged").default(false),
  verifiedBy: text("verified_by"),
});

// 4. Tracked Fleet Vehicles (GPS-Equipped Transporters)
export const vehiclesTable = pgTable("vehicles", {
  id: text("id").primaryKey(), // "VEH-001"
  registrationNo: text("registration_no").unique().notNull(),
  driverName: text("driver_name").notNull(),
  driverPhone: text("driver_phone").notNull(),
  type: text("type").notNull(), // truck, heavy_trailer, mini_truck, refrigerated_van
  cargoType: text("cargo_type").notNull(), // medicines, food_supplies, construction, agricultural, fuel, general
  cargoDescription: text("cargo_description").notNull(),
  cargoWeight: doublePrecision("cargo_weight").notNull(), // tons
  priority: text("priority").default("normal"), // normal, high, emergency
  currentLat: doublePrecision("current_lat").notNull(),
  currentLng: doublePrecision("current_lng").notNull(),
  speed: doublePrecision("speed").default(0),
  heading: doublePrecision("heading").default(0),
  fuelLevel: doublePrecision("fuel_level").default(100),
  progress: doublePrecision("progress").default(0),
  status: text("status").default("in_transit"), // in_transit, delayed, stopped, delivered, loading
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  route: text("route").notNull(),
  departureTime: text("departure_time").notNull(),
  eta: text("eta").notNull(),
  lastPingAt: timestamp("last_ping_at").defaultNow(),
});

// 5. Raw GPS Tracker Telemetry Ingestion (AIS-140 / Hardware Tracker Pings)
export const telemetryLogsTable = pgTable("telemetry_logs", {
  id: serial("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull(),
  imei: text("imei"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  speed: doublePrecision("speed").notNull(),
  heading: doublePrecision("heading").notNull(),
  altitude: doublePrecision("altitude"),
  fuelPercent: doublePrecision("fuel_percent"),
  batteryVoltage: doublePrecision("battery_voltage"),
  engineStatus: boolean("engine_status").default(true),
  timestamp: timestamp("timestamp").defaultNow(),
});

// 6. Real IMD / Open-Meteo Weather Observations
export const weatherObservationsTable = pgTable("weather_observations", {
  id: serial("id").primaryKey(),
  district: text("district").notNull(),
  state: text("state").notNull(),
  temperature: doublePrecision("temperature").notNull(),
  humidity: integer("humidity").notNull(),
  rainfall24h: doublePrecision("rainfall_24h").notNull(), // mm
  windSpeed: doublePrecision("wind_speed").notNull(), // km/h
  visibilityKm: doublePrecision("visibility_km").notNull(),
  condition: text("condition").notNull(),
  forecastSummary: text("forecast_summary").notNull(),
  landslideWarning: boolean("landslide_warning").default(false),
  floodWarning: boolean("flood_warning").default(false),
  source: text("source").default("IMD_OPEN_METEO"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});

// 7. Field Officer Offline-Synced Incident Reports
export const fieldReportsTable = pgTable("field_reports", {
  id: text("id").primaryKey(), // "FR-2026-001"
  officerId: text("officer_id").notNull(),
  officerName: text("officer_name").notNull(),
  district: text("district").notNull(),
  state: text("state").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  photoUrl: text("photo_url"),
  status: text("status").default("submitted"), // submitted, under_review, verified, action_taken, resolved
  syncStatus: text("sync_status").default("synced"),
  clientTimestamp: text("client_timestamp").notNull(),
  actionNote: text("action_note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod Validation Schemas
export const insertDistrictSchema = createInsertSchema(districtsTable);
export const insertRoadSegmentSchema = createInsertSchema(roadSegmentsTable);
export const insertIncidentSchema = createInsertSchema(incidentsTable);
export const insertVehicleSchema = createInsertSchema(vehiclesTable);
export const insertTelemetryLogSchema = createInsertSchema(telemetryLogsTable);
export const insertWeatherObservationSchema = createInsertSchema(weatherObservationsTable);
export const insertFieldReportSchema = createInsertSchema(fieldReportsTable);

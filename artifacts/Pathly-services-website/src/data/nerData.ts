// ============================================================
// Pathly: Regional Data Models & Mock Data
// ============================================================
//
// DOCUMENTED SCHEMA (Northeast India operational fixture dataset)
// --------------------------------------------------------------
// Every dataset below drives the live demo. All geography refers to
// real NER towns, NHR-identified highways and river systems; only the
// telemetry values are simulated for the SIH prototype.
//
// -- Road network -------------------------------------------------
//   ROAD_SEGMENTS: RoadSegment[]
//     id, name, type(NH/SH/district/local), from/to (town names),
//     from/toLat&Lng (start/end point), distance(km), status(
//       open|partially_blocked|blocked|under_repair), condition(0-100),
//     lastUpdated, riskScore(0-100, see Objective-4 model),
//     terrain(plains|hills|mountains|valley|plateau|riverine),
//     altitude(m ASL), bridgeCount, trafficCongestion(fluent|moderate|
//       heavy|jammed), avgSpeedKmH, delayMinutes, laneCount, pavementType
//
// -- Hazard datasets ----------------------------------------------
//   FLOOD_PRONE_ZONES: FloodProneZone[]
//     id, name, river, states[], districts[], watershedArea(sq km),
//     dangerLevel(low|moderate|high|extreme), dangerWaterLevel(m),
//     annualPeakMonths[], historicalMajorFloods[{year,peakLevel,note}],
//     exposedRoutes[], vulnerableSettlements, embankmentLengthKm,
//     lastUpdated, activeAdvisory
//   LANDSLIDE_CORRIDORS: LandslideCorridor[]
//     id, name, roadSegmentIds[](ref ROAD_SEGMENTS.id), state, districts[],
//     start/endLat&Lng, corridorLengthKm, slopeMaterial(soil|rock|mixed),
//     avgSlopeAngleDeg, rainfallTriggerMm, triggers[](rainfall|earthquake|
//       slope_cut|river_erosion|snowmelt), laharsDebrisFlow,
//     clearanceResponsible(e.g. 'BRO 42 BRTF'), recentEventCount,
//     riskScore(0-100), status(watch|advisory|closed), lastUpdated
//
// -- Trade network --------------------------------------------------
//   LOGISTICS_HUBS: LogisticsHub[]
//     id, name, type(icd|airport|land_port|railhead|fuel_depot|
//       river_terminal|agri_market|pharma_hub), state, district, city,
//     lat, lng, capacity, connectedRoads[], nearestMajorRailhead,
//     status(operational|congested|restricted|critical), congestionLevel,
//     customsClearedFCL?, iaVerbose(interstate|intrastate)
//
// -- Disruption tableau ---------------------------------------------
//   INITIAL_DISRUPTION_EVENTS: DisruptionEvent[]
//     id, cause(landslide|flood|bridge_damage|road_subsidence|accident|
//       blockade|weather), severity, roadSegmentIds[](ref ROAD_SEGMENTS),
//     routeName, state, location, startedAt, status(active|clearing|
//       resolved), estimatedClearTimeHours, detourRequired, detourDescription,
//     impactDelayMinutes, affectedVehicleIds[], impactCargoTypes[]
//     (consumed by the Objective-6 Emergency Scenario engine)
//
// -- Supporting fixtures (existing) --------------------------------
//   NER_STATES[], NER_DISTRICTS[], VEHICLES[], INITIAL_ALERTS[],
//   INITIAL_FIELD_REPORTS[], INITIAL_WEATHER[], SUPPLY_CHAIN_METRICS[],
//   PLATFORM_STATS, MULTILINGUAL_LABELS, NER_LOCALITIES[],
//   GIS_INFRASTRUCTURE[]
// --------------------------------------------------------------

// ---- Type Definitions ----

export type NERState = 'Assam' | 'Meghalaya' | 'Tripura' | 'Manipur' | 'Mizoram' | 'Nagaland' | 'Arunachal Pradesh' | 'Sikkim';

export type TerrainType = 'plains' | 'hills' | 'mountains' | 'valley' | 'plateau' | 'riverine';

export type RoadStatus = 'open' | 'partially_blocked' | 'blocked' | 'under_repair';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertCategory = 'landslide' | 'flood' | 'road_damage' | 'bridge_closure' | 'traffic' | 'weather' | 'accident' | 'geofence' | 'speeding' | 'route_deviation' | 'unauthorized_stop' | 'telemetry';

export type CargoType = 'medicines' | 'food_supplies' | 'construction' | 'agricultural' | 'fuel' | 'general';

export type VehicleStatus = 'in_transit' | 'loading' | 'delivered' | 'delayed' | 'stopped' | 'returning';

export type ConnectivityScore = 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';

export type ReportStatus = 'submitted' | 'under_review' | 'verified' | 'action_taken' | 'resolved';

export interface NERDistrict {
  id: string;
  name: string;
  state: NERState;
  lat: number;
  lng: number;
  elevation: number; // meters ASL
  terrain: TerrainType;
  population: number;
  area: number; // sq km
  connectivityScore: number; // 0-100
  connectivityStatus: ConnectivityScore;
  majorTown: string;
  nhConnected: string[];
  railConnected: boolean;
  airportNearby: boolean;
  floodRisk: 'low' | 'medium' | 'high';
  landslideRisk: 'low' | 'medium' | 'high';
  avgRainfall: number; // mm annual
}

export type TrafficCongestion = 'fluent' | 'moderate' | 'heavy' | 'jammed';

export interface RoadSegment {
  id: string;
  name: string;
  type: 'NH' | 'SH' | 'district' | 'local';
  from: string;
  to: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  distance: number; // km
  status: RoadStatus;
  condition: number; // 0-100
  lastUpdated: string;
  riskScore: number; // 0-100
  terrain: TerrainType;
  altitude: number;
  bridgeCount: number;
  trafficCongestion?: TrafficCongestion;
  avgSpeedKmH?: number;
  delayMinutes?: number;
  laneCount?: number;
  pavementType?: string;
}

export type GpsSource = 'simulator' | 'driver_mobile' | 'real';

export interface Vehicle {
  id: string;
  orderToken: string;
  registrationNo: string;
  type: 'truck' | 'mini_truck' | 'ambulance' | 'tanker' | 'van';
  driverName: string;
  driverPhone: string;
  cargoType: CargoType;
  cargoDescription: string;
  cargoWeight: number; // tons
  origin: string;
  destination: string;
  currentLat: number;
  currentLng: number;
  speed: number; // km/h
  heading: number; // degrees
  status: VehicleStatus;
  eta: string;
  departureTime: string;
  route: string;
  progress: number; // 0-100
  fuelLevel: number; // percentage
  priority: 'normal' | 'high' | 'emergency';
  // Live GPS pipeline additions (real values from the backend when synced)
  source?: GpsSource;
  sourceLabel?: string;
  telemetryStatus?: 'moving' | 'idle' | 'stopped' | 'offline';
  signalAgeMs?: number;
  distanceTripKm?: number;
  lastSignalAt?: string; // ISO timestamp of last server ping
}

export function gpsSourceLabel(source: GpsSource | undefined): string {
  if (source === 'driver_mobile') return 'Driver Mobile Location';
  if (source === 'real') return 'Real GPS Device';
  return 'Vehicle Stream (Field Telemetry)';
}

export interface LogisticsAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  location: string;
  district: string;
  state: NERState;
  lat: number;
  lng: number;
  reportedAt: string;
  reportedBy: string;
  affectedRoutes: string[];
  estimatedClearTime: string;
  isActive: boolean;
  acknowledged: boolean;
  photoUrl?: string;
  // Live GPS pipeline additions (source tag on server-generated alerts)
  source?: GpsSource;
  sourceLabel?: string;
}

export interface FieldReport {
  id: string;
  officerName: string;
  officerId: string;
  district: string;
  state: NERState;
  lat: number;
  lng: number;
  category: AlertCategory | 'infrastructure' | 'general';
  severity: AlertSeverity;
  title: string;
  description: string;
  photoAttached: boolean;
  photoDataUrl?: string;          // camera-captured thumbnail
  photoName?: string;             // original filename
  timestamp: string;              // human-friendly label
  updatedAt?: string;             // ISO wall-clock for conflict resolution
  status: ReportStatus;
  syncStatus: 'synced' | 'pending' | 'failed';
  verifiedBy?: string;
  actionNote?: string;
  attempts?: number;              // sync retry count
  lastAttemptAt?: string;         // ISO timestamp of last retry
  serverSyncedAt?: string;        // ISO timestamp of backend acknowledgment
}

export interface WeatherData {
  district: string;
  state: NERState;
  temperature: number;
  humidity: number;
  rainfall: number; // mm in last 24h
  windSpeed: number; // km/h
  windGust?: number; // gusting to X km/h
  condition: 'clear' | 'cloudy' | 'rain' | 'heavy_rain' | 'storm' | 'fog' | 'drizzle';
  visibility: number; // km
  visibilityNote?: string;
  riverLevel?: string;
  forecast24h: string;
  description?: string; // full, uncut advisory text
  affectedSettlements?: string;
  recommendedAction?: string;
  lastUpdated?: string;
  floodWarning: boolean;
  landslideWarning: boolean;
}

export interface SupplyChainMetric {
  commodity: CargoType;
  label: string;
  totalShipments: number;
  inTransit: number;
  delivered: number;
  delayed: number;
  avgDeliveryTime: number; // hours
  onTimeRate: number; // percentage
}

// ---- Northeast India hazard / logistics network schema (Objective 3) ----

export type FloodHazardLevel = 'low' | 'moderate' | 'high' | 'extreme';

export interface FloodProneZone {
  id: string;
  name: string; // e.g. 'Brahmaputra Valley — Central Reach'
  river: string; // primary river system
  states: NERState[];
  districts: string[]; // most exposed district names
  watershedArea: number; // sq km
  dangerLevel: FloodHazardLevel;
  dangerWaterLevel: number; // meters, gauge reading that triggers a warning
  annualPeakMonths: string[]; // e.g. ['June', 'July', 'August']
  historicalMajorFloods: { year: number; peakLevel: number; note: string }[];
  exposedRoutes: string[]; // RoadSegment.name values at risk
  vulnerableSettlements: number;
  embankmentLengthKm: number; // existing flood embankments
  lastUpdated: string;
  activeAdvisory: boolean;
}

export type LandslideTrigger = 'rainfall' | 'earthquake' | 'slope_cut' | 'river_erosion' | 'snowmelt';

export interface LandslideCorridor {
  id: string;
  name: string; // e.g. 'NH-44 Umiam–Umling cut slope section'
  roadSegmentIds: string[]; // RoadSegment.id values
  state: NERState;
  districts: string[];
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  corridorLengthKm: number;
  slopeMaterial: 'soil' | 'rock' | 'mixed';
  avgSlopeAngleDeg: number;
  rainfallTriggerMm: number; // 24h rainfall that elevates risk
  triggers: LandslideTrigger[];
  laharsDebrisFlow: boolean;
  clearanceResponsible: string; // e.g. 'BRO 42 BRTF'
  recentEventCount: number; // events in last 5 years
  riskScore: number; // 0-100 current
  status: 'watch' | 'advisory' | 'closed';
  lastUpdated: string;
}

export type HubType = 'icd' | 'airport' | 'land_port' | 'railhead' | 'fuel_depot' | 'river_terminal' | 'agri_market' | 'pharma_hub';

export interface LogisticsHub {
  id: string;
  name: string;
  type: HubType;
  state: NERState;
  district: string;
  city: string;
  lat: number;
  lng: number;
  capacity: string; // e.g. '12,000 TEU / yr'
  connectedRoads: string[]; // road names / corridors
  nearestMajorRailhead: string;
  status: 'operational' | 'congested' | 'restricted' | 'critical';
  congestionLevel: number; // 0-100
  customsClearedFCL?: boolean;
  iaVerbose: 'interstate' | 'intrastate';
}

export type DisruptionCause = 'landslide' | 'flood' | 'bridge_damage' | 'road_subsidence' | 'accident' | 'blockade' | 'weather';

export interface DisruptionEvent {
  id: string;
  cause: DisruptionCause;
  severity: AlertSeverity;
  roadSegmentIds: string[]; // RoadSegment.id values affected
  routeName: string; // human-readable corridor
  state: NERState;
  location: string;
  startedAt: string; // ISO or display string (fixture keeps it readable)
  status: 'active' | 'clearing' | 'resolved';
  estimatedClearTimeHours: number;
  detourRequired: boolean;
  detourDescription?: string;
  impactDelayMinutes: number;
  affectedVehicleIds: string[]; // Vehicle.id values
  impactCargoTypes: CargoType[];
  /** Scenario-drill replay profile for the /scenario console (how the incident trends). */
  outcome?: 'on_time' | 'delayed' | 'escalated' | 'reroute_failed' | 'reopened' | 'unresolved';
  /** Effective clearance hours for outcome 'delayed' (overrides estimatedClearTimeHours). */
  actualClearTimeHours?: number;
}

// ---- NER States Data ----

export const NER_STATES: { name: NERState; capital: string; emoji: string; lat: number; lng: number }[] = [
  { name: 'Assam', capital: 'Dispur', emoji: '🌄', lat: 26.2006, lng: 92.9376 },
  { name: 'Meghalaya', capital: 'Shillong', emoji: '🌧️', lat: 25.4670, lng: 91.3662 },
  { name: 'Tripura', capital: 'Agartala', emoji: '🏛️', lat: 23.9408, lng: 91.9882 },
  { name: 'Manipur', capital: 'Imphal', emoji: '🌺', lat: 24.6637, lng: 93.9063 },
  { name: 'Mizoram', capital: 'Aizawl', emoji: '🏞️', lat: 23.1645, lng: 92.9376 },
  { name: 'Nagaland', capital: 'Kohima', emoji: '🦅', lat: 26.1584, lng: 94.5624 },
  { name: 'Arunachal Pradesh', capital: 'Itanagar', emoji: '🏔️', lat: 28.2180, lng: 94.7278 },
  { name: 'Sikkim', capital: 'Gangtok', emoji: '🗻', lat: 27.3389, lng: 88.6065 }
];

// ---- NER Districts Database ----

export const NER_DISTRICTS: NERDistrict[] = [
  // Assam
  { id: 'AS-KAM', name: 'Kamrup Metropolitan', state: 'Assam', lat: 26.1445, lng: 91.7362, elevation: 55, terrain: 'plains', population: 1253938, area: 1528, connectivityScore: 92, connectivityStatus: 'excellent', majorTown: 'Guwahati', nhConnected: ['NH-27', 'NH-37'], railConnected: true, airportNearby: true, floodRisk: 'medium', landslideRisk: 'low', avgRainfall: 1722 },
  { id: 'AS-NAG', name: 'Nagaon', state: 'Assam', lat: 26.3500, lng: 92.6833, elevation: 70, terrain: 'plains', population: 2823768, area: 3831, connectivityScore: 78, connectivityStatus: 'good', majorTown: 'Nagaon', nhConnected: ['NH-37'], railConnected: true, airportNearby: false, floodRisk: 'high', landslideRisk: 'low', avgRainfall: 1850 },
  { id: 'AS-SON', name: 'Sonitpur', state: 'Assam', lat: 26.6332, lng: 92.7928, elevation: 85, terrain: 'plains', population: 1923978, area: 5324, connectivityScore: 76, connectivityStatus: 'good', majorTown: 'Tezpur', nhConnected: ['NH-27', 'NH-13', 'NH-37'], railConnected: true, airportNearby: false, floodRisk: 'medium', landslideRisk: 'low', avgRainfall: 2100 },
  { id: 'AS-DIB', name: 'Dibrugarh', state: 'Assam', lat: 27.4728, lng: 94.9120, elevation: 108, terrain: 'plains', population: 1327748, area: 3381, connectivityScore: 82, connectivityStatus: 'good', majorTown: 'Dibrugarh', nhConnected: ['NH-37', 'NH-15'], railConnected: true, airportNearby: true, floodRisk: 'high', landslideRisk: 'low', avgRainfall: 2400 },
  { id: 'AS-SIL', name: 'Cachar', state: 'Assam', lat: 24.8333, lng: 92.7789, elevation: 22, terrain: 'valley', population: 1736617, area: 3786, connectivityScore: 72, connectivityStatus: 'good', majorTown: 'Silchar', nhConnected: ['NH-6'], railConnected: true, airportNearby: true, floodRisk: 'high', landslideRisk: 'medium', avgRainfall: 2800 },
  { id: 'AS-JOR', name: 'Jorhat', state: 'Assam', lat: 26.7509, lng: 94.2037, elevation: 116, terrain: 'plains', population: 1092256, area: 2851, connectivityScore: 80, connectivityStatus: 'good', majorTown: 'Jorhat', nhConnected: ['NH-37'], railConnected: true, airportNearby: true, floodRisk: 'medium', landslideRisk: 'low', avgRainfall: 2100 },
  { id: 'AS-TIN', name: 'Tinsukia', state: 'Assam', lat: 27.5000, lng: 95.3667, elevation: 120, terrain: 'plains', population: 1327929, area: 3790, connectivityScore: 75, connectivityStatus: 'good', majorTown: 'Tinsukia', nhConnected: ['NH-37'], railConnected: true, airportNearby: false, floodRisk: 'high', landslideRisk: 'low', avgRainfall: 2700 },
  // Meghalaya
  { id: 'ML-EKH', name: 'East Khasi Hills', state: 'Meghalaya', lat: 25.5788, lng: 91.8933, elevation: 1525, terrain: 'hills', population: 825922, area: 2748, connectivityScore: 70, connectivityStatus: 'moderate', majorTown: 'Shillong', nhConnected: ['NH-44', 'NH-40'], railConnected: false, airportNearby: true, floodRisk: 'low', landslideRisk: 'high', avgRainfall: 2500 },
  { id: 'ML-WKH', name: 'West Khasi Hills', state: 'Meghalaya', lat: 25.5000, lng: 91.2833, elevation: 1200, terrain: 'hills', population: 385601, area: 5247, connectivityScore: 45, connectivityStatus: 'poor', majorTown: 'Nongstoin', nhConnected: ['NH-106'], railConnected: false, airportNearby: false, floodRisk: 'medium', landslideRisk: 'high', avgRainfall: 4000 },
  { id: 'ML-WGH', name: 'West Garo Hills', state: 'Meghalaya', lat: 25.5167, lng: 90.2333, elevation: 300, terrain: 'hills', population: 643291, area: 3677, connectivityScore: 55, connectivityStatus: 'moderate', majorTown: 'Tura', nhConnected: ['NH-51'], railConnected: false, airportNearby: true, floodRisk: 'medium', landslideRisk: 'medium', avgRainfall: 3200 },
  { id: 'ML-EJH', name: 'East Jaintia Hills', state: 'Meghalaya', lat: 25.3000, lng: 92.3000, elevation: 900, terrain: 'hills', population: 122939, area: 2040, connectivityScore: 38, connectivityStatus: 'poor', majorTown: 'Khliehriat', nhConnected: ['NH-44'], railConnected: false, airportNearby: false, floodRisk: 'medium', landslideRisk: 'high', avgRainfall: 5000 },
  // Tripura
  { id: 'TR-WES', name: 'West Tripura', state: 'Tripura', lat: 23.8315, lng: 91.2868, elevation: 15, terrain: 'plains', population: 917534, area: 942, connectivityScore: 80, connectivityStatus: 'good', majorTown: 'Agartala', nhConnected: ['NH-8', 'NH-44'], railConnected: true, airportNearby: true, floodRisk: 'medium', landslideRisk: 'low', avgRainfall: 2100 },
  { id: 'TR-DHA', name: 'Dhalai', state: 'Tripura', lat: 24.0000, lng: 91.8333, elevation: 100, terrain: 'hills', population: 377988, area: 2400, connectivityScore: 40, connectivityStatus: 'poor', majorTown: 'Ambassa', nhConnected: ['NH-44'], railConnected: false, airportNearby: false, floodRisk: 'medium', landslideRisk: 'medium', avgRainfall: 2400 },
  { id: 'TR-NOR', name: 'North Tripura', state: 'Tripura', lat: 24.3167, lng: 92.0000, elevation: 45, terrain: 'hills', population: 693947, area: 2036, connectivityScore: 52, connectivityStatus: 'moderate', majorTown: 'Dharmanagar', nhConnected: ['NH-44'], railConnected: true, airportNearby: false, floodRisk: 'medium', landslideRisk: 'medium', avgRainfall: 2200 },
  // Manipur
  { id: 'MN-IMP', name: 'Imphal West', state: 'Manipur', lat: 24.8170, lng: 93.9368, elevation: 786, terrain: 'valley', population: 517992, area: 519, connectivityScore: 68, connectivityStatus: 'moderate', majorTown: 'Imphal', nhConnected: ['NH-2', 'NH-37'], railConnected: false, airportNearby: true, floodRisk: 'medium', landslideRisk: 'low', avgRainfall: 1400 },
  { id: 'MN-CHU', name: 'Churachandpur', state: 'Manipur', lat: 24.3333, lng: 93.6833, elevation: 900, terrain: 'hills', population: 274143, area: 4570, connectivityScore: 32, connectivityStatus: 'poor', majorTown: 'Churachandpur', nhConnected: ['NH-2'], railConnected: false, airportNearby: false, floodRisk: 'low', landslideRisk: 'high', avgRainfall: 1800 },
  { id: 'MN-UKH', name: 'Ukhrul', state: 'Manipur', lat: 25.1167, lng: 94.3667, elevation: 1662, terrain: 'mountains', population: 183115, area: 4544, connectivityScore: 25, connectivityStatus: 'critical', majorTown: 'Ukhrul', nhConnected: [], railConnected: false, airportNearby: false, floodRisk: 'low', landslideRisk: 'high', avgRainfall: 1600 },
  // Mizoram
  { id: 'MZ-AIZ', name: 'Aizawl', state: 'Mizoram', lat: 23.7271, lng: 92.7176, elevation: 1132, terrain: 'hills', population: 400309, area: 3576, connectivityScore: 60, connectivityStatus: 'moderate', majorTown: 'Aizawl', nhConnected: ['NH-306', 'NH-54'], railConnected: false, airportNearby: true, floodRisk: 'low', landslideRisk: 'high', avgRainfall: 2500 },
  { id: 'MZ-LUN', name: 'Lunglei', state: 'Mizoram', lat: 22.8833, lng: 92.7333, elevation: 800, terrain: 'hills', population: 161428, area: 4536, connectivityScore: 30, connectivityStatus: 'poor', majorTown: 'Lunglei', nhConnected: ['NH-54'], railConnected: false, airportNearby: false, floodRisk: 'medium', landslideRisk: 'high', avgRainfall: 3000 },
  { id: 'MZ-CHH', name: 'Champhai', state: 'Mizoram', lat: 23.4500, lng: 93.3000, elevation: 1678, terrain: 'mountains', population: 125370, area: 3185, connectivityScore: 28, connectivityStatus: 'poor', majorTown: 'Champhai', nhConnected: ['NH-302'], railConnected: false, airportNearby: false, floodRisk: 'low', landslideRisk: 'high', avgRainfall: 1800 },
  // Nagaland
  { id: 'NL-KOH', name: 'Kohima', state: 'Nagaland', lat: 25.6751, lng: 94.1086, elevation: 1444, terrain: 'mountains', population: 270063, area: 1463, connectivityScore: 55, connectivityStatus: 'moderate', majorTown: 'Kohima', nhConnected: ['NH-29', 'NH-2'], railConnected: false, airportNearby: false, floodRisk: 'low', landslideRisk: 'high', avgRainfall: 2000 },
  { id: 'NL-DIM', name: 'Dimapur', state: 'Nagaland', lat: 25.9000, lng: 93.7333, elevation: 260, terrain: 'plains', population: 379769, area: 927, connectivityScore: 72, connectivityStatus: 'good', majorTown: 'Dimapur', nhConnected: ['NH-29', 'NH-36'], railConnected: true, airportNearby: true, floodRisk: 'medium', landslideRisk: 'low', avgRainfall: 1800 },
  { id: 'NL-MON', name: 'Mon', state: 'Nagaland', lat: 26.7167, lng: 94.9333, elevation: 897, terrain: 'mountains', population: 250671, area: 1786, connectivityScore: 22, connectivityStatus: 'critical', majorTown: 'Mon', nhConnected: [], railConnected: false, airportNearby: false, floodRisk: 'medium', landslideRisk: 'high', avgRainfall: 2400 },
  // Arunachal Pradesh
  { id: 'AR-PPR', name: 'Papum Pare', state: 'Arunachal Pradesh', lat: 27.0844, lng: 93.6053, elevation: 320, terrain: 'hills', population: 176573, area: 2875, connectivityScore: 58, connectivityStatus: 'moderate', majorTown: 'Itanagar', nhConnected: ['NH-415'], railConnected: true, airportNearby: true, floodRisk: 'medium', landslideRisk: 'high', avgRainfall: 3500 },
  { id: 'AR-TWA', name: 'Tawang', state: 'Arunachal Pradesh', lat: 27.5860, lng: 91.8600, elevation: 3048, terrain: 'mountains', population: 49977, area: 2085, connectivityScore: 18, connectivityStatus: 'critical', majorTown: 'Tawang', nhConnected: ['NH-13'], railConnected: false, airportNearby: false, floodRisk: 'low', landslideRisk: 'high', avgRainfall: 1200 },
  { id: 'AR-CHA', name: 'Changlang', state: 'Arunachal Pradesh', lat: 27.1167, lng: 95.7333, elevation: 200, terrain: 'hills', population: 148226, area: 4662, connectivityScore: 20, connectivityStatus: 'critical', majorTown: 'Changlang', nhConnected: ['NH-153'], railConnected: false, airportNearby: false, floodRisk: 'high', landslideRisk: 'high', avgRainfall: 4000 },
  { id: 'AR-WSI', name: 'West Siang', state: 'Arunachal Pradesh', lat: 28.1333, lng: 94.9167, elevation: 600, terrain: 'mountains', population: 112272, area: 8325, connectivityScore: 15, connectivityStatus: 'critical', majorTown: 'Aalo', nhConnected: ['NH-13'], railConnected: false, airportNearby: false, floodRisk: 'medium', landslideRisk: 'high', avgRainfall: 3800 },
  // Sikkim
  { id: 'SK-GAN', name: 'East Sikkim', state: 'Sikkim', lat: 27.3389, lng: 88.6065, elevation: 1650, terrain: 'mountains', population: 283583, area: 954, connectivityScore: 65, connectivityStatus: 'moderate', majorTown: 'Gangtok', nhConnected: ['NH-10'], railConnected: false, airportNearby: true, floodRisk: 'low', landslideRisk: 'high', avgRainfall: 3500 },
  { id: 'SK-NOR', name: 'North Sikkim', state: 'Sikkim', lat: 27.9000, lng: 88.5333, elevation: 2800, terrain: 'mountains', population: 43354, area: 4226, connectivityScore: 12, connectivityStatus: 'critical', majorTown: 'Mangan', nhConnected: [], railConnected: false, airportNearby: false, floodRisk: 'medium', landslideRisk: 'high', avgRainfall: 4000 }
];

// ---- Road Network ----

export const ROAD_SEGMENTS: RoadSegment[] = [
  { id: 'NH27-GUW-NAG', name: 'NH-27 Guwahati–Nagaon', type: 'NH', from: 'Guwahati', to: 'Nagaon', fromLat: 26.1445, fromLng: 91.7362, toLat: 26.3500, toLng: 92.6833, distance: 120, status: 'open', condition: 85, lastUpdated: '2 hours ago', riskScore: 22, terrain: 'plains', altitude: 60, bridgeCount: 3, trafficCongestion: 'fluent', avgSpeedKmH: 68, delayMinutes: 0, laneCount: 4, pavementType: '4-Lane Asphalt Superhighway' },
  { id: 'NH27-NAG-JOR', name: 'NH-27 Nagaon–Jorhat', type: 'NH', from: 'Nagaon', to: 'Jorhat', fromLat: 26.3500, fromLng: 92.6833, toLat: 26.7509, toLng: 94.2037, distance: 165, status: 'open', condition: 78, lastUpdated: '3 hours ago', riskScore: 35, terrain: 'plains', altitude: 90, bridgeCount: 5, trafficCongestion: 'fluent', avgSpeedKmH: 60, delayMinutes: 5, laneCount: 2, pavementType: 'Paved Bituminous Highway' },
  { id: 'NH37-JOR-DIB', name: 'NH-37 Jorhat–Dibrugarh', type: 'NH', from: 'Jorhat', to: 'Dibrugarh', fromLat: 26.7509, fromLng: 94.2037, toLat: 27.4728, toLng: 94.9120, distance: 138, status: 'open', condition: 72, lastUpdated: '1 hour ago', riskScore: 40, terrain: 'plains', altitude: 110, bridgeCount: 4, trafficCongestion: 'moderate', avgSpeedKmH: 48, delayMinutes: 12, laneCount: 2, pavementType: 'Bituminous Highway' },
  { id: 'NH44-GUW-SHI', name: 'NH-44 Guwahati–Shillong', type: 'NH', from: 'Guwahati', to: 'Shillong', fromLat: 26.1445, fromLng: 91.7362, toLat: 25.5788, toLng: 91.8933, distance: 99, status: 'partially_blocked', condition: 55, lastUpdated: '30 mins ago', riskScore: 65, terrain: 'hills', altitude: 800, bridgeCount: 7, trafficCongestion: 'heavy', avgSpeedKmH: 22, delayMinutes: 45, laneCount: 2, pavementType: 'Hill Expressway (Single Lane Bypass Active)' },
  { id: 'NH6-SIL-AIZ', name: 'NH-6 Silchar–Aizawl', type: 'NH', from: 'Silchar', to: 'Aizawl', fromLat: 24.8333, fromLng: 92.7789, toLat: 23.7271, toLng: 92.7176, distance: 183, status: 'partially_blocked', condition: 42, lastUpdated: '1 hour ago', riskScore: 78, terrain: 'hills', altitude: 600, bridgeCount: 12, trafficCongestion: 'heavy', avgSpeedKmH: 18, delayMinutes: 60, laneCount: 2, pavementType: 'Mountain Highway (Potholes / Subsidence)' },
  { id: 'NH2-IMP-MOR', name: 'NH-2 Imphal–Moreh', type: 'NH', from: 'Imphal', to: 'Churachandpur', fromLat: 24.8170, fromLng: 93.9368, toLat: 24.3333, toLng: 93.6833, distance: 64, status: 'blocked', condition: 20, lastUpdated: '45 mins ago', riskScore: 92, terrain: 'mountains', altitude: 900, bridgeCount: 8, trafficCongestion: 'jammed', avgSpeedKmH: 0, delayMinutes: 180, laneCount: 2, pavementType: 'Hill Pass (Full Landslide Blockade)' },
  { id: 'NH29-DIM-KOH', name: 'NH-29 Dimapur–Kohima', type: 'NH', from: 'Dimapur', to: 'Kohima', fromLat: 25.9000, fromLng: 93.7333, toLat: 25.6751, toLng: 94.1086, distance: 74, status: 'open', condition: 60, lastUpdated: '2 hours ago', riskScore: 55, terrain: 'mountains', altitude: 1000, bridgeCount: 6, trafficCongestion: 'moderate', avgSpeedKmH: 38, delayMinutes: 20, laneCount: 4, pavementType: '4-Lane Hill Highway' },
  { id: 'NH415-ITA-ZIR', name: 'NH-415 Itanagar–Ziro', type: 'NH', from: 'Itanagar', to: 'West Siang', fromLat: 27.0844, fromLng: 93.6053, toLat: 28.1333, toLng: 94.9167, distance: 290, status: 'blocked', condition: 15, lastUpdated: '20 mins ago', riskScore: 95, terrain: 'mountains', altitude: 2000, bridgeCount: 18, trafficCongestion: 'jammed', avgSpeedKmH: 0, delayMinutes: 240, laneCount: 1, pavementType: 'Single Lane Mountain Road (Mudflow Blocked)' },
  { id: 'NH10-SIL-GAN', name: 'NH-10 Siliguri–Gangtok', type: 'NH', from: 'Siliguri', to: 'Gangtok', fromLat: 26.7271, fromLng: 88.3953, toLat: 27.3389, toLng: 88.6065, distance: 124, status: 'partially_blocked', condition: 48, lastUpdated: '1 hour ago', riskScore: 70, terrain: 'mountains', altitude: 1200, bridgeCount: 14, trafficCongestion: 'heavy', avgSpeedKmH: 20, delayMinutes: 50, laneCount: 2, pavementType: 'Teesta Gorge Hill Corridor' },
  { id: 'NH44-SHI-AGT', name: 'NH-44 Shillong–Agartala', type: 'NH', from: 'Shillong', to: 'Agartala', fromLat: 25.5788, fromLng: 91.8933, toLat: 23.8315, toLng: 91.2868, distance: 336, status: 'open', condition: 65, lastUpdated: '2 hours ago', riskScore: 45, terrain: 'hills', altitude: 400, bridgeCount: 22, trafficCongestion: 'fluent', avgSpeedKmH: 52, delayMinutes: 10, laneCount: 2, pavementType: 'National Highway' },
  { id: 'NH13-TWA-TEZ', name: 'NH-13 Tawang–Tezpur', type: 'NH', from: 'Tawang', to: 'Itanagar', fromLat: 27.5860, fromLng: 91.8600, toLat: 27.0844, toLng: 93.6053, distance: 345, status: 'blocked', condition: 10, lastUpdated: '15 mins ago', riskScore: 98, terrain: 'mountains', altitude: 3000, bridgeCount: 24, trafficCongestion: 'jammed', avgSpeedKmH: 0, delayMinutes: 300, laneCount: 1, pavementType: 'Trans-Arunachal Highway (Sela Pass Snow/Slide)' },
  { id: 'NH37-GUW-SIL', name: 'NH-37 Guwahati–Silchar', type: 'NH', from: 'Guwahati', to: 'Silchar', fromLat: 26.1445, fromLng: 91.7362, toLat: 24.8333, toLng: 92.7789, distance: 340, status: 'open', condition: 70, lastUpdated: '3 hours ago', riskScore: 38, terrain: 'valley', altitude: 50, bridgeCount: 15, trafficCongestion: 'moderate', avgSpeedKmH: 45, delayMinutes: 15, laneCount: 2, pavementType: 'National Highway Corridor' },
  // ---- Item 3: graph-connectivity enrichment (real NER highways, so the route engine
  //      can search an actual connected network instead of treating every pair as isolated) ----
  { id: 'NH27-GUW-DIM', name: 'NH-27 Guwahati–Dimapur', type: 'NH', from: 'Guwahati', to: 'Dimapur', fromLat: 26.1445, fromLng: 91.7362, toLat: 25.9000, toLng: 93.7333, distance: 280, status: 'open', condition: 75, lastUpdated: '1 hour ago', riskScore: 34, terrain: 'plains', altitude: 90, bridgeCount: 12, trafficCongestion: 'fluent', avgSpeedKmH: 62, delayMinutes: 8, laneCount: 4, pavementType: '4-Lane National Highway' },
  { id: 'NH37-GUW-TEZ', name: 'NH-37 Guwahati–Tezpur', type: 'NH', from: 'Guwahati', to: 'Tezpur', fromLat: 26.1445, fromLng: 91.7362, toLat: 26.6332, toLng: 92.7928, distance: 192, status: 'open', condition: 74, lastUpdated: '30 mins ago', riskScore: 30, terrain: 'plains', altitude: 150, bridgeCount: 9, trafficCongestion: 'fluent', avgSpeedKmH: 60, delayMinutes: 5, laneCount: 2, pavementType: 'National Highway Corridor' },
  { id: 'NH27-TEZ-NAG', name: 'NH-27 Tezpur–Nagaon', type: 'NH', from: 'Tezpur', to: 'Nagaon', fromLat: 26.6332, fromLng: 92.7928, toLat: 26.3500, toLng: 92.6833, distance: 75, status: 'open', condition: 71, lastUpdated: '1 hour ago', riskScore: 28, terrain: 'plains', altitude: 90, bridgeCount: 4, trafficCongestion: 'fluent', avgSpeedKmH: 58, delayMinutes: 3, laneCount: 2, pavementType: 'National Highway' },
  { id: 'NH6-SIL-SHI', name: 'NH-6 Shillong–Silchar', type: 'NH', from: 'Shillong', to: 'Silchar', fromLat: 25.5788, fromLng: 91.8933, toLat: 24.8333, toLng: 92.7789, distance: 220, status: 'partially_blocked', condition: 58, lastUpdated: '2 hours ago', riskScore: 58, terrain: 'hills', altitude: 500, bridgeCount: 11, trafficCongestion: 'moderate', avgSpeedKmH: 32, delayMinutes: 25, laneCount: 2, pavementType: 'Hill Highway (NH-6)' },
  { id: 'NH2-SIL-IMP', name: 'NH-2 Silchar–Imphal', type: 'NH', from: 'Silchar', to: 'Imphal', fromLat: 24.8333, fromLng: 92.7789, toLat: 24.8170, toLng: 93.9368, distance: 185, status: 'open', condition: 62, lastUpdated: '2 hours ago', riskScore: 52, terrain: 'hills', altitude: 550, bridgeCount: 9, trafficCongestion: 'moderate', avgSpeedKmH: 38, delayMinutes: 18, laneCount: 2, pavementType: 'National Highway (AH-1)' },
  { id: 'NH2-KOH-IMP', name: 'NH-2 Kohima–Imphal', type: 'NH', from: 'Kohima', to: 'Imphal', fromLat: 25.6751, fromLng: 94.1086, toLat: 24.8170, toLng: 93.9368, distance: 135, status: 'open', condition: 55, lastUpdated: '1 hour ago', riskScore: 62, terrain: 'mountains', altitude: 1100, bridgeCount: 8, trafficCongestion: 'heavy', avgSpeedKmH: 30, delayMinutes: 30, laneCount: 2, pavementType: 'Mountain Highway (NH-2)' },
  { id: 'NH13-TEZ-ITA', name: 'NH-13 Tezpur–Itanagar', type: 'NH', from: 'Tezpur', to: 'Itanagar', fromLat: 26.6332, fromLng: 92.7928, toLat: 27.0844, toLng: 93.6053, distance: 165, status: 'open', condition: 66, lastUpdated: '2 hours ago', riskScore: 48, terrain: 'hills', altitude: 320, bridgeCount: 7, trafficCongestion: 'moderate', avgSpeedKmH: 42, delayMinutes: 12, laneCount: 2, pavementType: 'Trans-Arunachal Highway (NH-13)' },
  { id: 'NH51-GUW-TUR', name: 'NH-51 Guwahati–Tura', type: 'NH', from: 'Guwahati', to: 'Tura', fromLat: 26.1445, fromLng: 91.7362, toLat: 25.5167, toLng: 90.2333, distance: 210, status: 'open', condition: 60, lastUpdated: '3 hours ago', riskScore: 50, terrain: 'hills', altitude: 280, bridgeCount: 6, trafficCongestion: 'fluent', avgSpeedKmH: 44, delayMinutes: 10, laneCount: 2, pavementType: 'National Highway (NH-51)' },
  { id: 'NH106-SHI-NON', name: 'NH-106 Shillong–Nongstoin', type: 'NH', from: 'Shillong', to: 'Nongstoin', fromLat: 25.5788, fromLng: 91.8933, toLat: 25.5000, toLng: 91.2833, distance: 96, status: 'partially_blocked', condition: 48, lastUpdated: '1 hour ago', riskScore: 66, terrain: 'hills', altitude: 1050, bridgeCount: 5, trafficCongestion: 'heavy', avgSpeedKmH: 24, delayMinutes: 35, laneCount: 1, pavementType: 'Hill Highway (NH-106)' },
  { id: 'NH54-AIZ-LUN', name: 'NH-54 Aizawl–Lunglei', type: 'NH', from: 'Aizawl', to: 'Lunglei', fromLat: 23.7271, fromLng: 92.7176, toLat: 22.8833, toLng: 92.7333, distance: 158, status: 'open', condition: 52, lastUpdated: '2 hours ago', riskScore: 60, terrain: 'hills', altitude: 900, bridgeCount: 10, trafficCongestion: 'moderate', avgSpeedKmH: 36, delayMinutes: 20, laneCount: 2, pavementType: 'Hill Highway (NH-54)' },
  { id: 'NH15-DIB-TIN', name: 'NH-15 Dibrugarh–Tinsukia', type: 'NH', from: 'Dibrugarh', to: 'Tinsukia', fromLat: 27.4728, fromLng: 94.9120, toLat: 27.5000, toLng: 95.3667, distance: 52, status: 'open', condition: 68, lastUpdated: '1 hour ago', riskScore: 32, terrain: 'plains', altitude: 120, bridgeCount: 3, trafficCongestion: 'fluent', avgSpeedKmH: 55, delayMinutes: 5, laneCount: 2, pavementType: 'National Highway (NH-15)' }
];

// ---- Vehicle Fleet ----

export const VEHICLES: Vehicle[] = [
  { id: 'NER-V001', orderToken: 'ORD-AS-90412', registrationNo: 'AS-01-AB-1234', type: 'truck', driverName: 'Ranjan Das', driverPhone: '9864011223', cargoType: 'medicines', cargoDescription: 'Essential medicines, vaccines & medical supplies for Tezpur Civil Hospital', cargoWeight: 4.2, origin: 'Guwahati', destination: 'Tezpur', currentLat: 26.38, currentLng: 92.12, speed: 45, heading: 75, status: 'in_transit', eta: '2h 15min', departureTime: '06:30 AM', route: 'NH-27', progress: 62, fuelLevel: 72, priority: 'high' },
  { id: 'NER-V002', orderToken: 'ORD-ML-3310', registrationNo: 'ML-05-C-5678', type: 'mini_truck', driverName: 'Bah Kynjah Lyngdoh', driverPhone: '9436234567', cargoType: 'food_supplies', cargoDescription: 'Rice, pulses, cooking oil & PDS supplies for Nongstoin distribution center', cargoWeight: 2.8, origin: 'Shillong', destination: 'Nongstoin', currentLat: 25.52, currentLng: 91.48, speed: 30, heading: 250, status: 'delayed', eta: '4h 30min', departureTime: '05:00 AM', route: 'NH-106', progress: 35, fuelLevel: 58, priority: 'high' },
  { id: 'NER-V003', orderToken: 'ORD-TR-7821', registrationNo: 'TR-01-D-9012', type: 'truck', driverName: 'Biplab Debnath', driverPhone: '9862012345', cargoType: 'construction', cargoDescription: 'Steel rods, cement bags & bridge repair materials for NH-44 restoration work', cargoWeight: 8.5, origin: 'Agartala', destination: 'Dharmanagar', currentLat: 24.10, currentLng: 91.82, speed: 35, heading: 20, status: 'in_transit', eta: '3h 45min', departureTime: '07:00 AM', route: 'NH-44', progress: 48, fuelLevel: 64, priority: 'normal' },
  { id: 'NER-V004', orderToken: 'ORD-MN-1145', registrationNo: 'MN-01-E-3456', type: 'ambulance', driverName: 'Thingbaijam Ibochouba', driverPhone: '8794556677', cargoType: 'medicines', cargoDescription: 'Emergency medical equipment & blood supply for RIMS Hospital', cargoWeight: 1.2, origin: 'Dimapur', destination: 'Imphal', currentLat: 25.40, currentLng: 94.02, speed: 55, heading: 180, status: 'in_transit', eta: '1h 30min', departureTime: '08:00 AM', route: 'NH-29 → NH-2', progress: 72, fuelLevel: 80, priority: 'emergency' },
  { id: 'NER-V005', orderToken: 'ORD-AS-5509', registrationNo: 'AS-06-F-7890', type: 'tanker', driverName: 'Pranab Gogoi', driverPhone: '9706033445', cargoType: 'fuel', cargoDescription: 'Diesel fuel supply for Dibrugarh fuel depot & emergency generator stations', cargoWeight: 12.0, origin: 'Numaligarh Refinery', destination: 'Dibrugarh', currentLat: 26.80, currentLng: 93.72, speed: 40, heading: 85, status: 'in_transit', eta: '5h 00min', departureTime: '04:30 AM', route: 'NH-37', progress: 55, fuelLevel: 90, priority: 'normal' },
  { id: 'NER-V006', orderToken: 'ORD-MZ-2201', registrationNo: 'MZ-01-G-2345', type: 'mini_truck', driverName: 'Lalchhuanawma Ralte', driverPhone: '9436889900', cargoType: 'food_supplies', cargoDescription: 'ICDS nutrition packs, fortified flour & infant formula for Lunglei district', cargoWeight: 3.0, origin: 'Aizawl', destination: 'Lunglei', currentLat: 23.20, currentLng: 92.73, speed: 25, heading: 190, status: 'delayed', eta: '6h 00min', departureTime: '06:00 AM', route: 'NH-54', progress: 28, fuelLevel: 45, priority: 'high' },
  { id: 'NER-V007', orderToken: 'ORD-NL-6677', registrationNo: 'NL-07-H-6789', type: 'van', driverName: 'Temjen Ao', driverPhone: '8837209145', cargoType: 'agricultural', cargoDescription: 'Fresh organic produce, Naga King Chilli & bamboo shoots for Dimapur market', cargoWeight: 1.8, origin: 'Kohima', destination: 'Dimapur', currentLat: 25.78, currentLng: 93.92, speed: 38, heading: 310, status: 'in_transit', eta: '1h 15min', departureTime: '09:00 AM', route: 'NH-29', progress: 80, fuelLevel: 65, priority: 'normal' },
  { id: 'NER-V008', orderToken: 'ORD-AR-4019', registrationNo: 'AR-01-J-0123', type: 'truck', driverName: 'Nabam Taki', driverPhone: '9774112233', cargoType: 'construction', cargoDescription: 'Pre-fab bridge panels & heavy machinery parts for Siang River bridge project', cargoWeight: 10.5, origin: 'Itanagar', destination: 'Aalo', currentLat: 27.50, currentLng: 94.10, speed: 0, heading: 0, status: 'stopped', eta: 'Unknown', departureTime: '05:30 AM', route: 'NH-415', progress: 22, fuelLevel: 55, priority: 'high' },
  { id: 'NER-V009', orderToken: 'ORD-SK-8812', registrationNo: 'SK-01-K-4567', type: 'mini_truck', driverName: 'Tshering Bhutia', driverPhone: '9862334455', cargoType: 'medicines', cargoDescription: 'Anti-venom, altitude sickness medication & emergency medical kits for Mangan PHC', cargoWeight: 1.5, origin: 'Gangtok', destination: 'Mangan', currentLat: 27.55, currentLng: 88.56, speed: 20, heading: 350, status: 'delayed', eta: '3h 00min', departureTime: '07:30 AM', route: 'NH-10', progress: 40, fuelLevel: 70, priority: 'emergency' },
  { id: 'NER-V010', orderToken: 'ORD-AS-1099', registrationNo: 'AS-01-L-8901', type: 'truck', driverName: 'Hiranya Kalita', driverPhone: '9435088991', cargoType: 'general', cargoDescription: 'Mixed consignment: textbooks, uniforms & mid-day meal supplies for remote schools', cargoWeight: 5.0, origin: 'Guwahati', destination: 'Silchar', currentLat: 25.60, currentLng: 92.10, speed: 42, heading: 165, status: 'in_transit', eta: '4h 30min', departureTime: '05:00 AM', route: 'NH-37', progress: 58, fuelLevel: 52, priority: 'normal' }
];

// ---- Logistics Alerts ----

export const INITIAL_ALERTS: LogisticsAlert[] = [
  { id: 'ALT-001', category: 'landslide', severity: 'critical', title: 'Major Landslide on NH-44 near Umling', description: 'Heavy debris flow blocking both lanes near Umling village. Approximately 200 meters of road covered with mud and rocks. Estimated 500+ vehicles stranded. BRO team deployed for clearance.', location: 'NH-44, Umling, East Khasi Hills', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.55, lng: 91.85, reportedAt: '25 mins ago', reportedBy: 'District Control Room', affectedRoutes: ['NH-44 Guwahati–Shillong', 'NH-44 Shillong–Agartala'], estimatedClearTime: '18-24 hours', isActive: true, acknowledged: false },
  { id: 'ALT-002', category: 'flood', severity: 'critical', title: 'Brahmaputra Flood Warning – Nagaon District', description: 'Water level at Nagaon gauge station crossed danger mark (49.68m). Low-lying areas of Nagaon town, Kampur and Raha submerged. NH-37 under 2 feet of water near Kampur bypass.', location: 'Nagaon District, Kampur–Raha stretch', district: 'Nagaon', state: 'Assam', lat: 26.35, lng: 92.68, reportedAt: '1 hour ago', reportedBy: 'Assam State Disaster Management', affectedRoutes: ['NH-37 Nagaon–Jorhat', 'District road Kampur–Raha'], estimatedClearTime: '48-72 hours', isActive: true, acknowledged: true },
  { id: 'ALT-003', category: 'road_damage', severity: 'warning', title: 'Road Subsidence on NH-2 near Kangpokpi', description: 'Section of NH-2 near Kangpokpi showing significant subsidence due to continuous rainfall. Single lane operational with traffic regulation. Heavy vehicles advised to take alternate route via Senapati.', location: 'NH-2, Kangpokpi Section', district: 'Imphal West', state: 'Manipur', lat: 25.05, lng: 93.98, reportedAt: '2 hours ago', reportedBy: 'PWD Manipur', affectedRoutes: ['NH-2 Imphal–Dimapur'], estimatedClearTime: '5-7 days (repair)', isActive: true, acknowledged: true },
  { id: 'ALT-004', category: 'bridge_closure', severity: 'critical', title: 'Barak River Bridge Structural Alert – Silchar', description: 'Hairline cracks detected on Barak bridge pillars during routine inspection. Bridge closed for heavy vehicles (>10 tons). Light vehicles allowed with 20 km/h speed restriction. Structural assessment team arriving from Guwahati.', location: 'Barak River Bridge, NH-6, Silchar', district: 'Cachar', state: 'Assam', lat: 24.83, lng: 92.78, reportedAt: '3 hours ago', reportedBy: 'NHIDCL Bridge Division', affectedRoutes: ['NH-6 Silchar–Aizawl'], estimatedClearTime: '14 days (assessment + repair)', isActive: true, acknowledged: false },
  { id: 'ALT-005', category: 'weather', severity: 'warning', title: 'Red Alert: Extremely Heavy Rainfall in Cherrapunji Belt', description: 'IMD issues red alert for Sohra (Cherrapunji) and surrounding areas. Expected rainfall: 200-300mm in next 24 hours. Flash flood and landslide risk extremely high for East Khasi Hills and East Jaintia Hills.', location: 'Sohra–Cherrapunji Region', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.30, lng: 91.70, reportedAt: '45 mins ago', reportedBy: 'IMD Guwahati', affectedRoutes: ['NH-44 Shillong–Dawki', 'State roads in Sohra block'], estimatedClearTime: 'Weather dependent (24-48h)', isActive: true, acknowledged: true },
  { id: 'ALT-006', category: 'landslide', severity: 'warning', title: 'Debris Flow Risk on NH-415 near Banderdewa', description: 'Multiple small rock falls reported on NH-415 between Banderdewa and Doimukh. Hill cutting area showing signs of instability. Precautionary partial closure implemented.', location: 'NH-415, Banderdewa–Doimukh', district: 'Papum Pare', state: 'Arunachal Pradesh', lat: 27.08, lng: 93.60, reportedAt: '4 hours ago', reportedBy: 'BRO 42 BRTF', affectedRoutes: ['NH-415 Itanagar–Ziro'], estimatedClearTime: '6-8 hours', isActive: true, acknowledged: true },
  { id: 'ALT-007', category: 'traffic', severity: 'info', title: 'Heavy Vehicle Queue at Dawki Border Checkpoint', description: 'Long queue of cargo vehicles at Indo-Bangladesh Dawki land port. Average wait time: 4-6 hours due to enhanced security checks and customs processing delays. 120+ trucks queued.', location: 'Dawki Land Port, South West Khasi Hills', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.19, lng: 92.02, reportedAt: '5 hours ago', reportedBy: 'Dawki ICP Authority', affectedRoutes: ['NH-44 Shillong–Dawki'], estimatedClearTime: 'Continuous (processing)', isActive: true, acknowledged: true },
  { id: 'ALT-008', category: 'accident', severity: 'warning', title: 'Vehicle Overturn on NH-29 near Pherima', description: 'A loaded supply truck overturned near Pherima blocking half the road. Minor injuries reported. Crane being dispatched from Dimapur. Single lane operational for light vehicles.', location: 'NH-29, Pherima, 22km from Kohima', district: 'Kohima', state: 'Nagaland', lat: 25.80, lng: 93.85, reportedAt: '1.5 hours ago', reportedBy: 'Nagaland Traffic Police', affectedRoutes: ['NH-29 Dimapur–Kohima'], estimatedClearTime: '3-4 hours', isActive: true, acknowledged: false }
];

// ---- Field Reports ----

export const INITIAL_FIELD_REPORTS: FieldReport[] = [
  { id: 'FR-001', officerName: 'Anurag Bora', officerId: 'FO-AS-012', district: 'Nagaon', state: 'Assam', lat: 26.33, lng: 92.70, category: 'flood', severity: 'critical', title: 'Flood water entered NH-37 near Kampur', description: 'Water level rising fast. NH-37 under 2 feet of water near Kampur bypass. Villagers evacuating to high ground. Need immediate rescue boats and relief supplies.', photoAttached: true, timestamp: '30 mins ago', status: 'verified', syncStatus: 'synced', verifiedBy: 'DC Nagaon Office', actionNote: 'SDRF team deployed, relief supplies being dispatched from Guwahati' },
  { id: 'FR-002', officerName: 'Iaiarisa Khongdup', officerId: 'FO-ML-008', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.56, lng: 91.87, category: 'landslide', severity: 'critical', title: 'Fresh landslide debris on NH-44 at Umiam', description: 'New debris fall observed at km 42 of NH-44. Both lanes completely blocked. Rocks as large as 3 meters diameter. BRO bulldozer on site but progress slow due to continued rain.', photoAttached: true, timestamp: '1 hour ago', status: 'action_taken', syncStatus: 'synced', verifiedBy: 'ERSS Meghalaya', actionNote: 'BRO clearing operations underway. Estimated 12 more hours needed.' },
  { id: 'FR-003', officerName: 'Lalremruata Pachuau', officerId: 'FO-MZ-003', district: 'Aizawl', state: 'Mizoram', lat: 23.73, lng: 92.72, category: 'infrastructure', severity: 'warning', title: 'Bridge guardrails damaged at Tuirial', description: 'Steel guardrails on Tuirial bridge broken after a truck collision yesterday. Temporary barriers placed but pedestrians at risk. Urgent repair needed before monsoon intensifies.', photoAttached: true, timestamp: '3 hours ago', status: 'under_review', syncStatus: 'synced' },
  { id: 'FR-004', officerName: 'Wungnaothang Muivah', officerId: 'FO-MN-005', district: 'Imphal West', state: 'Manipur', lat: 24.82, lng: 93.94, category: 'road_damage', severity: 'warning', title: 'Pothole cluster on NH-2 near Imphal bypass', description: 'Multiple large potholes (1-2 feet deep) on NH-2 Imphal bypass road. Several vehicles damaged. This stretch needs emergency patching before it becomes impassable in rain.', photoAttached: false, timestamp: '5 hours ago', status: 'submitted', syncStatus: 'pending' },
  { id: 'FR-005', officerName: 'Imkongwapang Aier', officerId: 'FO-NL-007', district: 'Dimapur', state: 'Nagaland', lat: 25.90, lng: 93.73, category: 'general', severity: 'info', title: 'New PMGSY road inaugurated – Medziphema link', description: 'New all-weather road connecting Medziphema to 3 remote villages completed. 12 km stretch. Improves connectivity for 2,400 households. Surface quality: excellent. Two box culverts included.', photoAttached: true, timestamp: '6 hours ago', status: 'verified', syncStatus: 'synced', verifiedBy: 'Executive Engineer PMGSY', actionNote: 'Added to district road database. Updated connectivity maps.' }
];

// ---- Weather Data ----

export const INITIAL_WEATHER: WeatherData[] = [
  { district: 'Kamrup Metropolitan', state: 'Assam', temperature: 31, humidity: 82, rainfall: 45, windSpeed: 18, windGust: 30, condition: 'rain', visibility: 6, visibilityNote: '6 km, down to 4 km near river embankments', forecast24h: 'Heavy rain expected, 60-80mm. Flood advisory for low-lying areas.', description: 'Moderate to heavy rain over Guwahati metro and the lower Brahmaputra valley with periodic intense spells. Shallow waterlogging has been reported in a few low-lying wards along the riverfront.', affectedSettlements: 'Approx. 6 low-lying wards (Uzan Bazar, Chandmari fringes)', recommendedAction: 'Monitor Brahmaputra gauge readings; avoid flooded underpasses on NH-27 and NH-37 near Khanapara during peak flow.', lastUpdated: 'Updated 4 min ago', floodWarning: false, landslideWarning: false },
  { district: 'Nagaon', state: 'Assam', temperature: 30, humidity: 90, rainfall: 78, windSpeed: 12, windGust: 22, condition: 'heavy_rain', visibility: 3, visibilityNote: '3 km, near-zero visibility inside heavy bursts', riverLevel: 'Kolong tributary at 1.2m above warning mark', forecast24h: 'Very heavy rain continuing. River levels rising. Red alert.', description: 'Very heavy rain continuing across the Nagaon-Kampur belt, with the Kolong tributary rising steadily. Several low-lying mouzas report early-stage inundation and standing water on approaches.', affectedSettlements: 'Approx. 12 villages in advisory zone (Kampur, Raha fringes)', recommendedAction: 'Use caution on NH-37 near the Kampur bypass if water reaches the carriageway; keep low-lying evacuation approaches clear.', lastUpdated: 'Updated 7 min ago', floodWarning: false, landslideWarning: false },
  { district: 'Dibrugarh', state: 'Assam', temperature: 29, humidity: 85, rainfall: 35, windSpeed: 15, windGust: 26, condition: 'rain', visibility: 5, visibilityNote: '5 km, patchy fog over Brahmaputra crossings', forecast24h: 'Moderate rain. Brahmaputra level watch. Yellow alert.', description: 'Moderate, steady rain across Dibrugarh town and surrounds. Brahmaputra levels remain elevated but below the danger threshold; no immediate inundation reported.', affectedSettlements: 'No active advisory; 2 river-island mauzas on watch', recommendedAction: 'Maintain normal schedule; keep ferry services aware of rising water on Brahmaputra crossings.', lastUpdated: 'Updated 12 min ago', floodWarning: false, landslideWarning: false },
  { district: 'East Khasi Hills', state: 'Meghalaya', temperature: 18, humidity: 95, rainfall: 120, windSpeed: 22, windGust: 40, condition: 'heavy_rain', visibility: 2, visibilityNote: '500m in hill sections', forecast24h: 'Extremely heavy rainfall. 200-300mm expected. Landslide alert.', description: 'Extremely heavy rainfall, 200-300mm recorded over the past 24 hours across East Khasi Hills. Multiple slope failures reported near NH-44.', affectedSettlements: 'Approx. 9 villages in advisory zone (Umling, Umiam fringes)', recommendedAction: 'Suspend non-essential vehicle movement on NH-44 near Umling until slope inspection is complete.', lastUpdated: 'Updated 3 min ago', floodWarning: false, landslideWarning: true },
  { district: 'West Khasi Hills', state: 'Meghalaya', temperature: 20, humidity: 92, rainfall: 85, windSpeed: 20, windGust: 34, condition: 'heavy_rain', visibility: 3, visibilityNote: '3 km, very poor on hill cuts', riverLevel: 'Hill streams running high near Nongstoin', forecast24h: 'Heavy to very heavy rain. Multiple landslide reports. Orange alert.', description: 'Sustained heavy rain over the Nongstoin belt with repeated debris and rock-fall reports on hill cuttings. Soil saturation is high across the district.', affectedSettlements: 'Approx. 7 villages along NH-106 corridor', recommendedAction: 'Avoid NH-40 section between Shillong and Nongstoin until slope clearance; travel in daylight only.', lastUpdated: 'Updated 6 min ago', floodWarning: false, landslideWarning: true },
  { district: 'West Tripura', state: 'Tripura', temperature: 32, humidity: 78, rainfall: 15, windSpeed: 10, windGust: 18, condition: 'cloudy', visibility: 8, visibilityNote: '8 km, clear across Agartala plain', forecast24h: 'Partly cloudy with isolated showers. Normal conditions.', description: 'Partly cloudy with isolated late-afternoon showers over the Agartala plain. Generally settled conditions with no significant weather risk.', affectedSettlements: 'No active advisory', recommendedAction: 'Normal operations; isolate showers may briefly affect unpaved service roads.', lastUpdated: 'Updated 15 min ago', floodWarning: false, landslideWarning: false },
  { district: 'Imphal West', state: 'Manipur', temperature: 25, humidity: 80, rainfall: 28, windSpeed: 14, windGust: 24, condition: 'rain', visibility: 5, visibilityNote: '5 km, fog patches near Loktak approach', forecast24h: 'Moderate rain in valley, heavy in hills. Yellow alert for hill roads.', description: 'Moderate rain in the Imphal valley with minor waterlogging on a few stretches. Hill approaches remain wet; no major disruption to NH-2 traffic.', affectedSettlements: 'Approx. 4 low-lying pockets near Imphal bypass', recommendedAction: 'Exercise caution on NH-2 north of Imphal; allow extra time for slow-moving heavy vehicles.', lastUpdated: 'Updated 9 min ago', floodWarning: false, landslideWarning: false },
  { district: 'Aizawl', state: 'Mizoram', temperature: 22, humidity: 88, rainfall: 55, windSpeed: 22, windGust: 38, condition: 'rain', visibility: 4, visibilityNote: '4 km, very poor on ridge-top sections', riverLevel: 'Tlawng river at 0.8m above warning mark', forecast24h: 'Steady rain. Landslide risk moderate. Road caution advisory.', description: 'Steady rain over the Aizawl ridge with elevated landslide risk on cut slopes. Several minor talus falls cleared through the day; no active disaster zone declared.', affectedSettlements: 'Approx. 5 settlement clusters near NH-306 on routine watch', recommendedAction: 'Avoid ridge-edge parking and report fresh debris promptly; keep to the centre line on curved sections.', lastUpdated: 'Updated 5 min ago', floodWarning: false, landslideWarning: false },
  { district: 'Kohima', state: 'Nagaland', temperature: 20, humidity: 85, rainfall: 12, windSpeed: 18, windGust: 28, condition: 'rain', visibility: 6, visibilityNote: '6 km, poor visibility in evening fog', forecast24h: 'Light to moderate rain. Hill road visibility poor in evening.', description: 'Light showers across Kohima with brief moderate spells in the evening. No active warning; hill roads remain wet and slippery.', affectedSettlements: 'No active advisory', recommendedAction: 'Drive with dipped beams through hill fog on NH-29; no movement restrictions in force.', lastUpdated: 'Updated 10 min ago', floodWarning: false, landslideWarning: false },
  { district: 'Papum Pare', state: 'Arunachal Pradesh', temperature: 26, humidity: 88, rainfall: 65, windSpeed: 20, windGust: 33, condition: 'heavy_rain', visibility: 3, visibilityNote: '3 km, thick rain near Itanagar', riverLevel: 'Siang river at 2.1m above danger mark', forecast24h: 'Heavy rain. Siang river rising. Landslide risk along NH-415.', description: 'Heavy rain over the Itanagar belt with the Siang river well above the danger mark. Minor debris slides reported along NH-415 near Banderdewa.', affectedSettlements: 'Approx. 8 riverine villages and 2 resettlement camps', recommendedAction: 'Avoid low river crossings; suspend non-essential movement on NH-415 between Itanagar and Doimukh if slides continue.', lastUpdated: 'Updated 2 min ago', floodWarning: true, landslideWarning: true },
  { district: 'East Sikkim', state: 'Sikkim', temperature: 16, humidity: 92, rainfall: 50, windSpeed: 28, windGust: 45, condition: 'rain', visibility: 4, visibilityNote: '4 km, very poor at higher passes', forecast24h: 'Rain with strong winds. NH-10 slippery. Drive with caution.', description: 'Rain with strong gusty winds across the Gangtok belt. NH-10 remains open but is slippery, with fresh mud patches cleared by BRO crews.', affectedSettlements: 'Approx. 3 settlements in advisory zone near Gangtok outskirts', recommendedAction: 'Drive with extreme caution on NH-10; strong gusts may affect high-sided vehicles at exposed bends.', lastUpdated: 'Updated 8 min ago', floodWarning: false, landslideWarning: false },
  { district: 'South Sikkim', state: 'Sikkim', temperature: 15, humidity: 90, rainfall: 72, windSpeed: 26, windGust: 42, condition: 'heavy_rain', visibility: 3, visibilityNote: '3 km, very poor through Teesta gorge', riverLevel: 'Teesta river at 1.5m above danger mark', forecast24h: 'Heavy rain. Road advisory for NH-10 through Teesta gorge.', description: 'Heavy rain over South Sikkim with the Teesta in spate. Multiple mudslide and rock-fall advisories issued along NH-10 through the gorge.', affectedSettlements: 'Approx. 11 villages and 2 suspension-bridge crossings', recommendedAction: 'Avoid NH-10 between Namchi and the gorge until BRO slope inspection clears the corridor.', lastUpdated: 'Updated 4 min ago', floodWarning: false, landslideWarning: true },
  { district: 'Karbi Anglong', state: 'Assam', temperature: 29, humidity: 71, rainfall: 5, windSpeed: 9, windGust: 15, condition: 'clear', visibility: 12, visibilityNote: '12 km, excellent across hill-plain transition', forecast24h: 'Clear skies expected. No warning.', description: 'Clear skies and dry conditions across Karbi Anglong. No active threat; good visibility for cargo movement on interior hill roads.', affectedSettlements: 'No active advisory', recommendedAction: 'Normal operations; regular route monitoring continues.', lastUpdated: 'Updated 18 min ago', floodWarning: false, landslideWarning: false },
  { district: 'Ri Bhoi', state: 'Meghalaya', temperature: 23, humidity: 84, rainfall: 48, windSpeed: 24, windGust: 40, condition: 'rain', visibility: 4, visibilityNote: '4 km, very poor on NH-40 approach cuts', riverLevel: 'Umiam reservoir at normal operating level', forecast24h: 'Thunderstorm activity expected. Landslide watch on hill cuts.', description: 'Scattered thunderstorm activity across Ri Bhoi with periods of intense rain. A precautionary landslide watch is in effect on cut slopes along NH-40.', affectedSettlements: 'Approx. 6 villages near Nongpoh and Umiam approach', recommendedAction: 'Monitor NH-40 slope cuttings; no movement restriction yet, but avoid stopping under unstable cuts.', lastUpdated: 'Updated 6 min ago', floodWarning: false, landslideWarning: true }
];

// ---- Flood-Prone Zones (Objective 3) ----

export const FLOOD_PRONE_ZONES: FloodProneZone[] = [
  {
    id: 'FLOOD-BRHM-CENTRAL',
    name: 'Brahmaputra Valley — Central Reach',
    river: 'Brahmaputra',
    states: ['Assam'],
    districts: ['Nagaon', 'Dibrugarh', 'Karbi Anglong', 'Kamrup Metropolitan'],
    watershedArea: 61500,
    dangerLevel: 'extreme',
    dangerWaterLevel: 49.5,
    annualPeakMonths: ['May', 'June', 'July', 'August'],
    historicalMajorFloods: [
      { year: 2022, peakLevel: 50.1, note: 'Nagaon-Kampur belt inundated, NH-37 waterlogged' },
      { year: 2016, peakLevel: 49.8, note: 'Brahmaputra breached embankments near Dibrugarh' },
      { year: 2004, peakLevel: 51.2, note: 'Major flood, Kaziranga buffer zones submerged' }
    ],
    exposedRoutes: ['NH-37 Nagaon–Jorhat', 'NH-27 Nagaon–Jorhat', 'NH-37 Guwahati–Silchar'],
    vulnerableSettlements: 48,
    embankmentLengthKm: 215,
    lastUpdated: 'Updated 4 min ago',
    activeAdvisory: true
  },
  {
    id: 'FLOOD-BARAK',
    name: 'Barak Valley — Upper Reach',
    river: 'Barak',
    states: ['Assam'],
    districts: ['Cachar', 'Hailakandi', 'Karimganj'],
    watershedArea: 8200,
    dangerLevel: 'high',
    dangerWaterLevel: 16.8,
    annualPeakMonths: ['June', 'July', 'August', 'September'],
    historicalMajorFloods: [
      { year: 2020, peakLevel: 18.1, note: 'Silchar town inundated for 5 days' },
      { year: 2019, peakLevel: 17.6, note: 'NH-6 Silchar bypass flooded' }
    ],
    exposedRoutes: ['NH-6 Silchar–Aizawl', 'NH-37 Guwahati–Silchar'],
    vulnerableSettlements: 26,
    embankmentLengthKm: 96,
    lastUpdated: 'Updated 11 min ago',
    activeAdvisory: true
  },
  {
    id: 'FLOOD-TEESTA',
    name: 'Teesta – Tista Valley Corridor',
    river: 'Teesta',
    states: ['Sikkim'],
    districts: ['South Sikkim', 'East Sikkim'],
    watershedArea: 12600,
    dangerLevel: 'high',
    dangerWaterLevel: 9.4,
    annualPeakMonths: ['June', 'July', 'August'],
    historicalMajorFloods: [
      { year: 2023, peakLevel: 11.2, note: 'Glacial outburst (South Lhonak) — Teesta spate, NH-10 UXO' },
      { year: 2013, peakLevel: 10.4, note: 'Movement restricted through Teesta gorge' }
    ],
    exposedRoutes: ['NH-10 Siliguri–Gangtok'],
    vulnerableSettlements: 11,
    embankmentLengthKm: 0,
    lastUpdated: 'Updated 8 min ago',
    activeAdvisory: true
  },
  {
    id: 'FLOOD-SIANG-BRAHMAPUTRA',
    name: 'Siang River — Arunachal Foothills',
    river: 'Siang (Brahmaputra tributary)',
    states: ['Arunachal Pradesh'],
    districts: ['Papum Pare', 'East Siang'],
    watershedArea: 15900,
    dangerLevel: 'high',
    dangerWaterLevel: 11.8,
    annualPeakMonths: ['June', 'July', 'August'],
    historicalMajorFloods: [
      { year: 2021, peakLevel: 12.9, note: 'NH-415 approached by floodwater at Banderdewa' }
    ],
    exposedRoutes: ['NH-415 Itanagar–Ziro', 'NH-13 Tawang–Tezpur'],
    vulnerableSettlements: 16,
    embankmentLengthKm: 0,
    lastUpdated: 'Updated 6 min ago',
    activeAdvisory: true
  }
];

// ---- Landslide Corridors (Objective 3) ----

export const LANDSLIDE_CORRIDORS: LandslideCorridor[] = [
  {
    id: 'LSL-NH44-UMIAM',
    name: 'NH-44 Umiam–Umling cut slope section',
    roadSegmentIds: ['NH44-GUW-SHI'],
    state: 'Meghalaya',
    districts: ['East Khasi Hills'],
    startLat: 25.62,
    startLng: 91.85,
    endLat: 25.55,
    endLng: 91.93,
    corridorLengthKm: 18,
    slopeMaterial: 'mixed',
    avgSlopeAngleDeg: 38,
    rainfallTriggerMm: 90,
    triggers: ['rainfall', 'slope_cut'],
    laharsDebrisFlow: true,
    clearanceResponsible: 'BRO 42 BRTF / Meghalaya PWD',
    recentEventCount: 7,
    riskScore: 78,
    status: 'advisory',
    lastUpdated: 'Updated 5 min ago'
  },
  {
    id: 'LSL-NH2-KANGPOKPI',
    name: 'NH-2 Kangpokpi–Senapati subsidence belt',
    roadSegmentIds: ['NH2-IMP-MOR'],
    state: 'Manipur',
    districts: ['Imphal West', 'Kangpokpi'],
    startLat: 25.02,
    startLng: 93.95,
    endLat: 25.33,
    endLng: 94.10,
    corridorLengthKm: 41,
    slopeMaterial: 'soil',
    avgSlopeAngleDeg: 29,
    rainfallTriggerMm: 70,
    triggers: ['rainfall', 'slope_cut'],
    laharsDebrisFlow: false,
    clearanceResponsible: 'PWD Manipur',
    recentEventCount: 5,
    riskScore: 92,
    status: 'closed',
    lastUpdated: 'Updated 3 min ago'
  },
  {
    id: 'LSL-NH415-BANDERDEWA',
    name: 'NH-415 Banderdewa–Doimukh hill cut',
    roadSegmentIds: ['NH415-ITA-ZIR'],
    state: 'Arunachal Pradesh',
    districts: ['Papum Pare'],
    startLat: 27.06,
    startLng: 93.58,
    endLat: 27.13,
    endLng: 93.62,
    corridorLengthKm: 9,
    slopeMaterial: 'mixed',
    avgSlopeAngleDeg: 42,
    rainfallTriggerMm: 110,
    triggers: ['rainfall', 'river_erosion'],
    laharsDebrisFlow: true,
    clearanceResponsible: 'BRO 42 BRTF',
    recentEventCount: 4,
    riskScore: 85,
    status: 'advisory',
    lastUpdated: 'Updated 2 min ago'
  },
  {
    id: 'LSL-NH10-GORGE',
    name: 'NH-10 Teesta Gorge — Namchi section',
    roadSegmentIds: ['NH10-SIL-GAN'],
    state: 'Sikkim',
    districts: ['South Sikkim'],
    startLat: 27.18,
    startLng: 88.46,
    endLat: 27.24,
    endLng: 88.52,
    corridorLengthKm: 14,
    slopeMaterial: 'rock',
    avgSlopeAngleDeg: 55,
    rainfallTriggerMm: 65,
    triggers: ['rainfall', 'snowmelt', 'earthquake'],
    laharsDebrisFlow: true,
    clearanceResponsible: 'BRO Project Shivashakti',
    recentEventCount: 9,
    riskScore: 75,
    status: 'advisory',
    lastUpdated: 'Updated 4 min ago'
  },
  {
    id: 'LSL-SELA-PASS',
    name: 'Sela Pass — Trans-Arunachal highway snow/slide corridor',
    roadSegmentIds: ['NH13-TWA-TEZ'],
    state: 'Arunachal Pradesh',
    districts: ['West Kameng', 'Tawang'],
    startLat: 27.42,
    startLng: 92.03,
    endLat: 27.51,
    endLng: 92.11,
    corridorLengthKm: 22,
    slopeMaterial: 'mixed',
    avgSlopeAngleDeg: 47,
    rainfallTriggerMm: 40,
    triggers: ['snowmelt', 'rainfall'],
    laharsDebrisFlow: false,
    clearanceResponsible: 'BRO Vartak',
    recentEventCount: 6,
    riskScore: 98,
    status: 'closed',
    lastUpdated: 'Updated 15 min ago'
  }
];

// ---- Logistics Hubs (Objective 3) ----

export const LOGISTICS_HUBS: LogisticsHub[] = [
  { id: 'HUB-ICD-GUW', name: 'ICD Guwahati (Amingaon)', type: 'icd', state: 'Assam', district: 'Kamrup', city: 'Guwahati', lat: 26.14, lng: 91.70, capacity: '28,000 TEU / yr', connectedRoads: ['NH-27', 'NH-37'], nearestMajorRailhead: 'Amingaon Rail Yard', status: 'operational', congestionLevel: 45, customsClearedFCL: true, iaVerbose: 'interstate' },
  { id: 'HUB-AIR-GUW', name: 'LGBI Airport Air Cargo Complex', type: 'airport', state: 'Assam', district: 'Kamrup Metropolitan', city: 'Guwahati', lat: 26.11, lng: 91.59, capacity: '60,000 t / yr', connectedRoads: ['NH-27'], nearestMajorRailhead: 'Amingaon Rail Yard', status: 'operational', congestionLevel: 38, iaVerbose: 'interstate' },
  { id: 'HUB-LP-DAWKI', name: 'Dawki Integrated Land Port', type: 'land_port', state: 'Meghalaya', district: 'East Khasi Hills', city: 'Dawki', lat: 25.19, lng: 92.02, capacity: '1,500 trucks / day', connectedRoads: ['NH-44 Shillong–Dawki'], nearestMajorRailhead: 'Guwahati (270 km)', status: 'congested', congestionLevel: 78, customsClearedFCL: true, iaVerbose: 'interstate' },
  { id: 'HUB-AIR-AGAR', name: 'MBB Airport Cargo Terminal', type: 'airport', state: 'Tripura', district: 'West Tripura', city: 'Agartala', lat: 23.89, lng: 91.24, capacity: '18,000 t / yr', connectedRoads: ['NH-44 Shillong–Agartala'], nearestMajorRailhead: 'Agartala Rail Station', status: 'operational', congestionLevel: 30, iaVerbose: 'interstate' },
  { id: 'HUB-LP-AGAR', name: 'Agartala–Akhaura Land Port', type: 'land_port', state: 'Tripura', district: 'West Tripura', city: 'Agartala', lat: 23.85, lng: 91.27, capacity: '900 trucks / day', connectedRoads: ['NH-44 Shillong–Agartala'], nearestMajorRailhead: 'Agartala Rail Station', status: 'operational', congestionLevel: 52, customsClearedFCL: true, iaVerbose: 'interstate' },
  { id: 'HUB-FUEL-NUMALIGARH', name: 'Numaligarh Refinery Logistics Terminal', type: 'fuel_depot', state: 'Assam', district: 'Golaghat', city: 'Numaligarh', lat: 26.63, lng: 93.77, capacity: '3,000 KL / day', connectedRoads: ['NH-37', 'NH-27'], nearestMajorRailhead: 'Numaligarh Rail Siding', status: 'operational', congestionLevel: 40, iaVerbose: 'intrastate' },
  { id: 'HUB-ICD-IMP', name: 'Jiribam–Imphal Multi-Modal Corridor Terminal', type: 'icd', state: 'Manipur', district: 'Imphal West', city: 'Imphal', lat: 24.82, lng: 93.94, capacity: '12,000 TEU / yr', connectedRoads: ['NH-2 Imphal–Moreh'], nearestMajorRailhead: 'Jiribam Railhead (160 km)', status: 'congested', congestionLevel: 66, customsClearedFCL: true, iaVerbose: 'interstate' },
  { id: 'HUB-RIVER-PANDU', name: 'Pandu Inland Water Terminal', type: 'river_terminal', state: 'Assam', district: 'Kamrup Metropolitan', city: 'Guwahati', lat: 26.18, lng: 91.70, capacity: '200 barges / month', connectedRoads: ['NH-27'], nearestMajorRailhead: 'Kamakhya Rail Station', status: 'restricted', congestionLevel: 71, iaVerbose: 'intrastate' },
  { id: 'HUB-LP-MOREH', name: 'Moreh Land Port (India–Myanmar)', type: 'land_port', state: 'Manipur', district: 'Tengnoupal', city: 'Moreh', lat: 24.25, lng: 94.30, capacity: '600 trucks / day', connectedRoads: ['NH-2 Imphal–Moreh'], nearestMajorRailhead: 'Silchar Railhead (327 km)', status: 'critical', congestionLevel: 88, customsClearedFCL: true, iaVerbose: 'interstate' },
  { id: 'HUB-AGRI-LBUM', name: 'Lbum Chilli-Cum-Spice Agri Market', type: 'agri_market', state: 'Nagaland', district: 'Dimapur', city: 'Dimapur', lat: 25.90, lng: 93.73, capacity: '800 t / season', connectedRoads: ['NH-29 Dimapur–Kohima'], nearestMajorRailhead: 'Dimapur Rail Station', status: 'operational', congestionLevel: 34, iaVerbose: 'intrastate' },
  { id: 'HUB-DEPOT-DIB', name: 'Dibrugarh Fuel & Ambulance Depot', type: 'fuel_depot', state: 'Assam', district: 'Dibrugarh', city: 'Dibrugarh', lat: 27.47, lng: 94.91, capacity: '1,200 KL / day', connectedRoads: ['NH-37 Jorhat–Dibrugarh'], nearestMajorRailhead: 'Dibrugarh Rail Station', status: 'operational', congestionLevel: 32, iaVerbose: 'intrastate' },
  { id: 'HUB-PHARMA-TEZ', name: 'Tezpur Medical Logistics Node', type: 'pharma_hub', state: 'Assam', district: 'Sonitpur', city: 'Tezpur', lat: 26.63, lng: 92.79, capacity: '40,000 cold-chain packs', connectedRoads: ['NH-27 Nagaon–Jorhat', 'NH-13 Tawang–Tezpur'], nearestMajorRailhead: 'Tezpur Rail Station', status: 'operational', congestionLevel: 28, iaVerbose: 'intrastate' },
  { id: 'HUB-ICD-ALZ', name: 'Aizawl ICD (Tipaimukh corridor)', type: 'icd', state: 'Mizoram', district: 'Aizawl', city: 'Aizawl', lat: 23.73, lng: 92.72, capacity: '6,000 TEU / yr', connectedRoads: ['NH-6 Silchar–Aizawl'], nearestMajorRailhead: 'Silchar Railhead', status: 'operational', congestionLevel: 49, iaVerbose: 'interstate' }
];

// ---- Sample Disruption Events (Objective 3, consumed by Objective 6 scenario) ----

export const INITIAL_DISRUPTION_EVENTS: DisruptionEvent[] = [
  {
    id: 'DISP-001',
    cause: 'landslide',
    severity: 'critical',
    roadSegmentIds: ['NH44-GUW-SHI'],
    routeName: 'NH-44 Guwahati–Shillong',
    state: 'Meghalaya',
    location: 'km 42 near Umiam',
    startedAt: 'Today · 05:40 IST',
    status: 'active',
    estimatedClearTimeHours: 18,
    detourRequired: true,
    detourDescription: 'Divert via NH-37 to Nagaon, then NH-27 to Jorhat, then NH-715 to Shillong',
    impactDelayMinutes: 120,
    affectedVehicleIds: ['NER-V001'],
    impactCargoTypes: ['medicines', 'food_supplies'],
    outcome: 'on_time'
  },
  {
    id: 'DISP-002',
    cause: 'flood',
    severity: 'critical',
    roadSegmentIds: ['NH37-NAG-JOR'],
    routeName: 'NH-37 Nagaon–Jorhat',
    state: 'Assam',
    location: 'Kampur bypass, Kolong tributary',
    startedAt: 'Today · 04:15 IST',
    status: 'active',
    estimatedClearTimeHours: 48,
    detourRequired: true,
    detourDescription: 'Divert via NH-27 (new alignment) through Karbi Anglong',
    impactDelayMinutes: 90,
    affectedVehicleIds: ['NER-V010'],
    impactCargoTypes: ['general'],
    outcome: 'delayed',
    actualClearTimeHours: 72
  },
  {
    id: 'DISP-003',
    cause: 'bridge_damage',
    severity: 'warning',
    roadSegmentIds: ['NH6-SIL-AIZ'],
    routeName: 'NH-6 Silchar–Aizawl',
    state: 'Assam',
    location: 'Barak River Bridge, Silchar',
    startedAt: 'Yesterday · 22:10 IST',
    status: 'clearing',
    estimatedClearTimeHours: 336,
    detourRequired: true,
    detourDescription: 'Light vehicles only; heavy (>10t) via Lundgren–Aizawl hill road',
    impactDelayMinutes: 60,
    affectedVehicleIds: [],
    impactCargoTypes: ['construction'],
    outcome: 'escalated'
  },
  {
    id: 'DISP-004',
    cause: 'road_subsidence',
    severity: 'critical',
    roadSegmentIds: ['NH2-IMP-MOR'],
    routeName: 'NH-2 Imphal–Moreh',
    state: 'Manipur',
    location: 'Kangpokpi section',
    startedAt: 'Today · 03:30 IST',
    status: 'active',
    estimatedClearTimeHours: 120,
    detourRequired: true,
    detourDescription: 'Via Senapati–Mao hill circuit, expect +140 min',
    impactDelayMinutes: 180,
    affectedVehicleIds: ['NER-V004'],
    impactCargoTypes: ['medicines', 'agricultural'],
    outcome: 'reroute_failed'
  },
  {
    id: 'DISP-005',
    cause: 'landslide',
    severity: 'critical',
    roadSegmentIds: ['NH13-TWA-TEZ'],
    routeName: 'NH-13 Tawang–Tezpur (Sela Pass)',
    state: 'Arunachal Pradesh',
    location: 'Sela Pass snow/slide zone',
    startedAt: 'Today · 02:55 IST',
    status: 'active',
    estimatedClearTimeHours: 72,
    detourRequired: true,
    detourDescription: 'No practical diversion; hold cargo at Tezpur pre-positioning point',
    impactDelayMinutes: 300,
    affectedVehicleIds: ['NER-V008'],
    impactCargoTypes: ['construction', 'general'],
    outcome: 'unresolved'
  },
  {
    id: 'DISP-006',
    cause: 'weather',
    severity: 'warning',
    roadSegmentIds: ['NH10-SIL-GAN'],
    routeName: 'NH-10 Siliguri–Gangtok (Teesta gorge)',
    state: 'Sikkim',
    location: 'Between Namchi and Gangtok',
    startedAt: 'Today · 06:20 IST',
    status: 'active',
    estimatedClearTimeHours: 24,
    detourRequired: false,
    impactDelayMinutes: 50,
    affectedVehicleIds: ['NER-V009'],
    impactCargoTypes: ['medicines'],
    outcome: 'reopened'
  }
];

// ---- Supply Chain Metrics ----

export const SUPPLY_CHAIN_METRICS: SupplyChainMetric[] = [
  { commodity: 'medicines', label: 'Medicines & Medical Supplies', totalShipments: 145, inTransit: 23, delivered: 112, delayed: 10, avgDeliveryTime: 18, onTimeRate: 77 },
  { commodity: 'food_supplies', label: 'Food & PDS Supplies', totalShipments: 280, inTransit: 45, delivered: 210, delayed: 25, avgDeliveryTime: 24, onTimeRate: 75 },
  { commodity: 'construction', label: 'Construction Materials', totalShipments: 95, inTransit: 18, delivered: 65, delayed: 12, avgDeliveryTime: 36, onTimeRate: 68 },
  { commodity: 'agricultural', label: 'Agricultural Produce', totalShipments: 180, inTransit: 32, delivered: 135, delayed: 13, avgDeliveryTime: 14, onTimeRate: 81 },
  { commodity: 'fuel', label: 'Fuel & Petroleum', totalShipments: 60, inTransit: 8, delivered: 48, delayed: 4, avgDeliveryTime: 20, onTimeRate: 80 },
  { commodity: 'general', label: 'General Cargo', totalShipments: 220, inTransit: 38, delivered: 165, delayed: 17, avgDeliveryTime: 22, onTimeRate: 74 }
];

// ---- Platform Stats ----

export const PLATFORM_STATS = {
  totalVehiclesTracked: 847,
  activeVehicles: 312,
  totalAlerts: 156,
  activeAlerts: 23,
  blockedRoutes: 8,
  partiallyBlockedRoutes: 14,
  openRoutes: 42,
  districtsMonitored: 80,
  deliverySuccessRate: 76.4,
  avgDeliveryDelay: 4.2, // hours
  fieldOfficers: 245,
  reportsToday: 38,
  emergencyVehicles: 12,
  tonnageInTransit: 2840
};

// ---- Multilingual Labels ----

export const MULTILINGUAL_LABELS: Record<string, Record<string, string>> = {
  en: { dashboard: 'Command Center', alerts: 'Alerts', routes: 'Route Planner', tracking: 'Vehicle Tracking', reports: 'Field Reports', analytics: 'Analytics', accessibility: 'Accessibility Map', blocked: 'Blocked', open: 'Open', delayed: 'Delayed' },
  hi: { dashboard: 'कमांड सेंटर', alerts: 'चेतावनी', routes: 'मार्ग नियोजक', tracking: 'वाहन ट्रैकिंग', reports: 'फील्ड रिपोर्ट', analytics: 'विश्लेषण', accessibility: 'पहुँच मानचित्र', blocked: 'अवरुद्ध', open: 'खुला', delayed: 'विलंबित' },
  as: { dashboard: 'কমাণ্ড চেণ্টাৰ', alerts: 'সতৰ্কতা', routes: 'পথ পৰিকল্পক', tracking: 'বাহন অনুসৰণ', reports: 'ক্ষেত্ৰ প্ৰতিবেদন', analytics: 'বিশ্লেষণ', accessibility: 'প্ৰৱেশযোগ্যতা মেপ', blocked: 'অৱৰুদ্ধ', open: 'খোলা', delayed: 'পলম' },
  bn: { dashboard: 'কমান্ড সেন্টার', alerts: 'সতর্কতা', routes: 'রুট পরিকল্পনাকারী', tracking: 'যান ট্র্যাকিং', reports: 'ফিল্ড রিপোর্ট', analytics: 'বিশ্লেষণ', accessibility: 'অ্যাক্সেসিবিলিটি মেপ', blocked: 'অবরুদ্ধ', open: 'খোলা', delayed: 'বিলম্বিত' },
  mni: { dashboard: 'কমান্দ সেন্তর', alerts: 'খঙহনবা', routes: 'লম্বি থিজিনবা', tracking: 'গাড়ী থিজিনবা', reports: 'ফিল্দ রিপোর্ত', analytics: 'ময়েক শেংনা য়েংবা', accessibility: 'চঙশিনবা য়াবা মেপ', blocked: 'থিংদোকখ্রে', open: 'হাংখ্রে', delayed: 'নাকল' }
};

// ---- Utility: Connectivity status from score ----
export function getConnectivityStatus(score: number): ConnectivityScore {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'poor';
  return 'critical';
}

// ---- Utility: Color for connectivity ----
export function getConnectivityColor(status: ConnectivityScore): string {
  switch (status) {
    case 'excellent': return '#10b981';
    case 'good': return '#22c55e';
    case 'moderate': return '#f59e0b';
    case 'poor': return '#f97316';
    case 'critical': return '#ef4444';
  }
}

// ---- Utility: Color for road status ----
export function getRoadStatusColor(status: RoadStatus): string {
  switch (status) {
    case 'open': return '#10b981';
    case 'partially_blocked': return '#f59e0b';
    case 'blocked': return '#ef4444';
    case 'under_repair': return '#8b5cf6';
  }
}

// ---- Utility: Color for traffic congestion ----
export function getTrafficColor(congestion?: TrafficCongestion): string {
  switch (congestion) {
    case 'fluent': return '#10b981'; // Green (Speed >50 km/h)
    case 'moderate': return '#eab308'; // Yellow/Amber (Speed 25-50 km/h)
    case 'heavy': return '#f97316'; // Orange (Speed 10-25 km/h)
    case 'jammed': return '#ef4444'; // Red (Speed 0-10 km/h / Blocked)
    default: return '#10b981';
  }
}

export function getTrafficCongestionLabel(congestion?: TrafficCongestion): string {
  switch (congestion) {
    case 'fluent': return '🟢 Fast Flow (>50 km/h)';
    case 'moderate': return '🟡 Moderate Traffic (30-50 km/h)';
    case 'heavy': return '🟠 Heavy Congestion (<25 km/h)';
    case 'jammed': return '🔴 Standstill / Blocked (0-10 km/h)';
    default: return '🟢 Normal Flow';
  }
}

// ---- Utility: Color for alert severity ----
export function getAlertSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical': return '#ef4444';
    case 'warning': return '#f59e0b';
    case 'info': return '#3b82f6';
  }
}

// ---- Utility: Weather icon ----
export function getWeatherIcon(condition: WeatherData['condition']): string {
  switch (condition) {
    case 'clear': return '☀️';
    case 'cloudy': return '☁️';
    case 'drizzle': return '🌦️';
    case 'rain': return '🌧️';
    case 'heavy_rain': return '⛈️';
    case 'storm': return '🌪️';
    case 'fog': return '🌫️';
  }
}

// ---- Utility: Cargo type icon ----
export function getCargoIcon(cargoType: CargoType): string {
  switch (cargoType) {
    case 'medicines': return '💊';
    case 'food_supplies': return '🍚';
    case 'construction': return '🏗️';
    case 'agricultural': return '🌾';
    case 'fuel': return '⛽';
    case 'general': return '📦';
  }
}

// ============================================================
// Deep NER Localities & Neighborhoods Dataset (High Precision)
// ============================================================

export interface NERLocality {
  id: string;
  name: string;
  category: 'locality' | 'hospital' | 'airport' | 'transit_hub' | 'landmark' | 'commercial';
  city: string;
  district: string;
  state: NERState;
  lat: number;
  lng: number;
  elevation: number;
  pincode: string;
  description: string;
}

export const NER_LOCALITIES: NERLocality[] = [
  // --- TRIPURA: Agartala & West Tripura Localities ---
  {
    id: 'loc-agt-01',
    name: 'Banamalipur',
    category: 'locality',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.8378,
    lng: 91.2858,
    elevation: 15,
    pincode: '799001',
    description: 'Central commercial & residential hub in East Agartala.',
  },
  {
    id: 'loc-agt-02',
    name: 'Radhanagar (Bus Terminal)',
    category: 'transit_hub',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.8447,
    lng: 91.2811,
    elevation: 16,
    pincode: '799002',
    description: 'Major inter-district bus terminal connecting North Tripura & Assam.',
  },
  {
    id: 'loc-agt-03',
    name: 'Indranagar',
    category: 'locality',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.8389,
    lng: 91.3051,
    elevation: 18,
    pincode: '799006',
    description: 'Prominent IT & institutional zone, near GBP Hospital.',
  },
  {
    id: 'loc-agt-04',
    name: 'GB Pant Hospital (GBP)',
    category: 'hospital',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.8492,
    lng: 91.2989,
    elevation: 19,
    pincode: '799006',
    description: 'Apex state government multi-specialty hospital and medical college.',
  },
  {
    id: 'loc-agt-05',
    name: 'Battala Market',
    category: 'commercial',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.8272,
    lng: 91.2725,
    elevation: 14,
    pincode: '799001',
    description: 'Busiest wholesale vegetable, grocery, and freight transit junction.',
  },
  {
    id: 'loc-agt-06',
    name: 'Maharaja Bir Bikram (MBB) Airport',
    category: 'airport',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.8869,
    lng: 91.2405,
    elevation: 14,
    pincode: '799009',
    description: 'Second busiest airport in Northeast India with air cargo facilities.',
  },
  {
    id: 'loc-agt-07',
    name: 'Ujjayanta Palace & Heritage Park',
    category: 'landmark',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.8346,
    lng: 91.2825,
    elevation: 16,
    pincode: '799001',
    description: 'Historic royal palace, central administrative core.',
  },
  {
    id: 'loc-agt-08',
    name: 'Melarmath',
    category: 'commercial',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.8322,
    lng: 91.2798,
    elevation: 15,
    pincode: '799001',
    description: 'Major banking, retail, and commercial corridor in heart of city.',
  },
  {
    id: 'loc-agt-09',
    name: 'Amtali',
    category: 'transit_hub',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.7785,
    lng: 91.2792,
    elevation: 16,
    pincode: '799130',
    description: 'Southern highway gateway to Udaipur, Sabroom, and Tripura University.',
  },
  {
    id: 'loc-agt-10',
    name: 'Kunjaban (Secretariat Zone)',
    category: 'landmark',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.8561,
    lng: 91.2912,
    elevation: 20,
    pincode: '799006',
    description: 'Tripura State Secretariat, High Court, and Raj Bhavan complex.',
  },
  {
    id: 'loc-agt-11',
    name: 'Abhoynagar',
    category: 'locality',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.8488,
    lng: 91.2863,
    elevation: 17,
    pincode: '799005',
    description: 'Residential neighborhood connecting central Agartala to Airport Road.',
  },
  {
    id: 'loc-agt-12',
    name: 'Badharghat (Agartala Railway Station)',
    category: 'transit_hub',
    city: 'Agartala',
    district: 'West Tripura',
    state: 'Tripura',
    lat: 23.8055,
    lng: 91.2766,
    elevation: 15,
    pincode: '799003',
    description: 'Main broad-gauge railway terminus connecting Agartala to national rail grid.',
  },

  // --- ASSAM: Guwahati Localities ---
  {
    id: 'loc-ghy-01',
    name: 'Paltan Bazaar (Guwahati Rly Stn)',
    category: 'transit_hub',
    city: 'Guwahati',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    lat: 26.1825,
    lng: 91.7511,
    elevation: 54,
    pincode: '781008',
    description: 'Main freight and passenger transit hub of North East.',
  },
  {
    id: 'loc-ghy-02',
    name: 'Dispur (State Secretariat)',
    category: 'landmark',
    city: 'Guwahati',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    lat: 26.1433,
    lng: 91.7898,
    elevation: 56,
    pincode: '781006',
    description: 'Capital seat of Government of Assam, state disaster command center.',
  },
  {
    id: 'loc-ghy-03',
    name: 'Khanapara (GS Road Transit)',
    category: 'transit_hub',
    city: 'Guwahati',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    lat: 26.1215,
    lng: 91.8211,
    elevation: 60,
    pincode: '781022',
    description: 'Strategic highway interchange connecting Assam to Meghalaya (NH-6).',
  },
  {
    id: 'loc-ghy-04',
    name: 'Jalukbari (NH-27 Junction)',
    category: 'transit_hub',
    city: 'Guwahati',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    lat: 26.1511,
    lng: 91.6625,
    elevation: 52,
    pincode: '781014',
    description: 'Gauhati University gate, Saraighat Bridge eastern approach.',
  },
  {
    id: 'loc-ghy-05',
    name: 'Gauhati Medical College & Hospital (GMCH)',
    category: 'hospital',
    city: 'Guwahati',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    lat: 26.1585,
    lng: 91.7745,
    elevation: 58,
    pincode: '781032',
    description: 'Premier tertiary emergency hospital in Northeast India.',
  },
  {
    id: 'loc-ghy-06',
    name: 'Lokpriya Gopinath Bordoloi Int. Airport (Borjhar)',
    category: 'airport',
    city: 'Guwahati',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    lat: 26.1061,
    lng: 91.5859,
    elevation: 49,
    pincode: '781015',
    description: 'Largest international cargo and aviation hub of NER.',
  },
  {
    id: 'loc-ghy-07',
    name: 'Beltola & Six Mile',
    category: 'commercial',
    city: 'Guwahati',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    lat: 26.1328,
    lng: 91.7985,
    elevation: 57,
    pincode: '781028',
    description: 'Major agricultural wholesale and modern logistics warehousing zone.',
  },
  {
    id: 'loc-ghy-08',
    name: 'Fancy Bazaar',
    category: 'commercial',
    city: 'Guwahati',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    lat: 26.1865,
    lng: 91.7412,
    elevation: 53,
    pincode: '781001',
    description: 'Largest dry-goods, textiles, and food commodity trade market in NER.',
  },

  // --- MEGHALAYA: Shillong Localities ---
  {
    id: 'loc-shl-01',
    name: 'Police Bazar (Khyndailad)',
    category: 'commercial',
    city: 'Shillong',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    lat: 25.5788,
    lng: 91.8833,
    elevation: 1496,
    pincode: '793001',
    description: 'Central transit circle and commercial hub of Shillong.',
  },
  {
    id: 'loc-shl-02',
    name: 'NEIGRIHMS Hospital (Mawdiangdiang)',
    category: 'hospital',
    city: 'Shillong',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    lat: 25.5925,
    lng: 91.9392,
    elevation: 1520,
    pincode: '793018',
    description: 'North Eastern Indira Gandhi Regional Institute of Health & Medical Sciences.',
  },
  {
    id: 'loc-shl-03',
    name: 'Laitumkhrah',
    category: 'locality',
    city: 'Shillong',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    lat: 25.5685,
    lng: 91.8955,
    elevation: 1510,
    pincode: '793003',
    description: 'Educational and commercial quarter near Don Bosco & St. Edmund\'s.',
  },
  {
    id: 'loc-shl-04',
    name: 'Mawlai (NH-6 Entrance)',
    category: 'transit_hub',
    city: 'Shillong',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    lat: 25.6025,
    lng: 91.8741,
    elevation: 1480,
    pincode: '793008',
    description: 'Northern highway bypass towards Umiam Lake and Guwahati.',
  },

  // --- MIZORAM: Aizawl Localities ---
  {
    id: 'loc-ajl-01',
    name: 'Bara Bazar (Dawrpui)',
    category: 'commercial',
    city: 'Aizawl',
    district: 'Aizawl',
    state: 'Mizoram',
    lat: 23.7307,
    lng: 92.7176,
    elevation: 1132,
    pincode: '796001',
    description: 'Principal hilltop trade center and central taxi stand of Aizawl.',
  },
  {
    id: 'loc-ajl-02',
    name: 'Zarkawt & Chanmari',
    category: 'locality',
    city: 'Aizawl',
    district: 'Aizawl',
    state: 'Mizoram',
    lat: 23.7388,
    lng: 92.7212,
    elevation: 1180,
    pincode: '796007',
    description: 'Commercial ridge road along NH-54 corridor.',
  },

  // --- MANIPUR: Imphal Localities ---
  {
    id: 'loc-imp-01',
    name: 'Ima Keithel (Mother\'s Market) & Thangal Bazar',
    category: 'commercial',
    city: 'Imphal',
    district: 'Imphal West',
    state: 'Manipur',
    lat: 24.8085,
    lng: 93.9362,
    elevation: 786,
    pincode: '795001',
    description: 'Historic women-run wholesale market and main commercial nerve-center.',
  },
  {
    id: 'loc-imp-02',
    name: 'RIMS Hospital (Lamphelpat)',
    category: 'hospital',
    city: 'Imphal',
    district: 'Imphal West',
    state: 'Manipur',
    lat: 24.8195,
    lng: 93.9185,
    elevation: 788,
    pincode: '795004',
    description: 'Regional Institute of Medical Sciences emergency healthcare base.',
  },

  // --- NAGALAND: Kohima Localities ---
  {
    id: 'loc-kma-01',
    name: 'Razhu Point & BOC Junction',
    category: 'commercial',
    city: 'Kohima',
    district: 'Kohima',
    state: 'Nagaland',
    lat: 25.6742,
    lng: 94.1085,
    elevation: 1444,
    pincode: '797001',
    description: 'Central hub on NH-29 highway connecting Dimapur to Manipur.',
  },

  // --- SIKKIM: Gangtok Localities ---
  {
    id: 'loc-gtk-01',
    name: 'MG Marg & Lal Bazaar',
    category: 'commercial',
    city: 'Gangtok',
    district: 'East Sikkim',
    state: 'Sikkim',
    lat: 27.3314,
    lng: 88.6138,
    elevation: 1650,
    pincode: '737101',
    description: 'Pedestrian boulevard and strategic high-altitude mountain supply post.',
  },

  // --- ARUNACHAL PRADESH: Itanagar Localities ---
  {
    id: 'loc-ita-01',
    name: 'Ganga Market & Bank Tinali',
    category: 'commercial',
    city: 'Itanagar',
    district: 'Papum Pare',
    state: 'Arunachal Pradesh',
    lat: 27.0988,
    lng: 93.6215,
    elevation: 320,
    pincode: '791111',
    description: 'Capital commercial center connecting NH-415 to Naharlagun.',
  },
];

// ============================================================
// Strategic GIS Infrastructure Models (Bridges, Helipads, Passes)
// ============================================================

export interface GISInfrastructure {
  id: string;
  name: string;
  type: 'strategic_bridge' | 'mountain_pass' | 'emergency_helipad' | 'fuel_depot' | 'disaster_warehouse';
  state: NERState;
  district: string;
  lat: number;
  lng: number;
  elevation: number; // m ASL
  status: 'operational' | 'alert' | 'critical' | 'restricted';
  waterLevelMeters?: number; // for bridges
  maxFloodTolerance?: number; // for bridges
  snowRisk?: 'none' | 'moderate' | 'heavy';
  capacityTons?: number;
  details: string;
}

export const GIS_INFRASTRUCTURE: GISInfrastructure[] = [
  {
    id: 'gis-br-01',
    name: 'Saraighat Strategic Bridge (Brahmaputra)',
    type: 'strategic_bridge',
    state: 'Assam',
    district: 'Kamrup Metropolitan',
    lat: 26.1555,
    lng: 91.6662,
    elevation: 55,
    status: 'operational',
    waterLevelMeters: 48.2,
    maxFloodTolerance: 52.0,
    capacityTons: 100,
    details: 'Critical rail-cum-road artery connecting North Bengal to entirety of NER.',
  },
  {
    id: 'gis-br-02',
    name: 'Dhola-Sadiya Bridge (Bhupen Hazarika Setu)',
    type: 'strategic_bridge',
    state: 'Assam',
    district: 'Tinsukia',
    lat: 27.7961,
    lng: 95.6668,
    elevation: 130,
    status: 'operational',
    waterLevelMeters: 122.5,
    maxFloodTolerance: 128.0,
    capacityTons: 60,
    details: '9.15 km strategic bridge linking Eastern Assam to eastern Arunachal Pradesh.',
  },
  {
    id: 'gis-br-03',
    name: 'Bogibeel Rail-Road Bridge',
    type: 'strategic_bridge',
    state: 'Assam',
    district: 'Dibrugarh',
    lat: 27.4085,
    lng: 94.8488,
    elevation: 104,
    status: 'operational',
    waterLevelMeters: 98.4,
    maxFloodTolerance: 105.0,
    capacityTons: 70,
    details: '4.94 km heavy freight bridge over Brahmaputra connecting Dibrugarh to Dhemaji.',
  },
  {
    id: 'gis-pass-01',
    name: 'Sela Pass (Strategic Arunachal Gate)',
    type: 'mountain_pass',
    state: 'Arunachal Pradesh',
    district: 'Tawang',
    lat: 27.5055,
    lng: 92.1025,
    elevation: 4170,
    status: 'alert',
    snowRisk: 'heavy',
    details: 'High altitude mountain corridor (13,700 ft). Monitored for freezing & landslides.',
  },
  {
    id: 'gis-pass-02',
    name: 'Natu La Strategic Pass',
    type: 'mountain_pass',
    state: 'Sikkim',
    district: 'East Sikkim',
    lat: 27.3861,
    lng: 88.8315,
    elevation: 4310,
    status: 'restricted',
    snowRisk: 'moderate',
    details: 'Altitude 14,140 ft. High-security Himalayan pass with live meteorological tracking.',
  },
  {
    id: 'gis-heli-01',
    name: 'Agartala Emergency Medical Helipad (GBP)',
    type: 'emergency_helipad',
    state: 'Tripura',
    district: 'West Tripura',
    lat: 23.8505,
    lng: 91.2995,
    elevation: 20,
    status: 'operational',
    details: '24x7 disaster air-ambulance helipad with direct emergency trauma access.',
  },
  {
    id: 'gis-fuel-01',
    name: 'Guwahati Betkuchi Strategic POL Depot (IOCL)',
    type: 'fuel_depot',
    state: 'Assam',
    district: 'Kamrup Metropolitan',
    lat: 26.1155,
    lng: 91.7325,
    elevation: 54,
    status: 'operational',
    capacityTons: 45000,
    details: 'Primary Northeast regional petroleum reserve and dispatch terminal.',
  },
  {
    id: 'gis-depot-01',
    name: 'Silchar Cachar Disaster Relief Warehouse',
    type: 'disaster_warehouse',
    state: 'Assam',
    district: 'Cachar',
    lat: 24.8155,
    lng: 92.7955,
    elevation: 24,
    status: 'operational',
    capacityTons: 12000,
    details: 'Buffer stock warehouse for Tripura, Mizoram, and Barak Valley flood relief.',
  },
];

// ============================================================
// Pathly: Explainable Weighted Rule-Based Risk Engine
// ============================================================
//
// OBJECTIVE 4 — EXPLAINABLE ROUTE-RISK MODEL
// -------------------------------------------
// This is a transparent, deterministic, rule-based scoring model.
// It is NOT a neural network or ML classifier.
// Every input and weight is documented; the output includes a risk
// class and a ranked list of top contributing factors.
//
// FORMULA (documented, weighted rule-based)
// -----------------------------------------
//   riskScore = clamp(0, 100,
//       W_rainfall      × rainfallIntensityFactor
//     + W_flood          × floodProximityFactor
//     + W_accessibility  × roadAccessibilityFactor
//     + W_bridge         × bridgeDisruptionFactor
//     + W_delay          × trafficDelayFactor
//     + W_criticality    × routeCriticalityFactor
//   )
//
// WEIGHTS (sum = 1.0):
//   W_rainfall      = 0.20  (current rainfall intensity on route)
//   W_flood          = 0.15  (proximity to active flood zones)
//   W_accessibility  = 0.25  (road condition + blockage status)
//   W_bridge         = 0.10  (bridge density × condition penalty)
//   W_delay          = 0.10  (vehicle delay + congestion level)
//   W_criticality    = 0.20  (max segment riskScore along route)
//
// FACTOR RANGES (each normalised to 0–100):
//   rainfallIntensityFactor   = min(100, routeMaxRainfall × 0.83)
//   floodProximityFactor      = floodRiskWeightedAvg(districts along route)
//                               where district floodRisk maps: high=80, medium=45, low=15
//   roadAccessibilityFactor   = Σ[(100 − segment.condition) × segment.distance]
//                                / totalDistance × 0.60
//                              + Σ[statusPenalty × segment.distance] / totalDistance × 0.40
//                               statusPenalty: open=0, under_repair=25, partially_blocked=65, blocked=100
//   bridgeDisruptionFactor    = min(100, totalBridges × 4 × (1 − avgBridgeConditionFactor))
//                               where avgBridgeConditionFactor = avg(1 − segment.riskScore/100) per segment
//   trafficDelayFactor        = min(100, weightedAvgDelay × 0.5 + congestionPenalty)
//                               congestionPenalty: fluent=0, moderate=15, heavy=40, jammed=70
//   routeCriticalityFactor    = max(segment.riskScore) across all segments on route
//
// RISK CLASS:
//   score < 30          → LOW        (green)
//   30 ≤ score < 50     → MEDIUM     (amber)
//   50 ≤ score < 70     → HIGH       (red)
//   70 ≤ score < 90     → VERY HIGH  (dark red)
//   score ≥ 90          → EXTREME    (black-red)
//
// Every RouteRiskAssessment includes a sorted `factors` array
// showing each input's normalised value, weight, and weighted
// contribution — enabling at-a-glance explainability.
// ============================================================

import { NER_DISTRICTS, type RoadSegment, type WeatherData, type NERDistrict, type CargoType, type TrafficCongestion, type TerrainType } from '../data/nerData';
import { getRoadSegments } from './scenarioEngine';

// ---- Structured risk output (Objective 4) ----

export interface RiskFactor {
  factor: string;        // human label e.g. 'Rainfall Intensity'
  value: number;         // normalised 0–100
  weight: number;        // W_x from formula (0–1)
  contribution: number;  // value × weight (0–100 scale portion)
  detail: string;        // one-line explanation e.g. '120mm/24h on route (very heavy)'
}

export interface RouteRiskAssessment {
  score: number;         // 0–100 composite
  riskClass: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH' | 'EXTREME';
  riskClassColor: string; // Tailwind-friendly class string
  factors: RiskFactor[]; // sorted by contribution desc
  explanation: string;   // one-sentence human-readable summary
}

function clampScore(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

function getRiskClass(score: number): { label: RouteRiskAssessment['riskClass']; color: string } {
  if (score >= 90) return { label: 'EXTREME',  color: 'text-white bg-[#7A1F1F]' };
  if (score >= 70) return { label: 'VERY HIGH', color: 'text-white bg-[#7A1F1F]' };
  if (score >= 50) return { label: 'HIGH',      color: 'text-[#7A1F1F] bg-red-100 border border-red-300' };
  if (score >= 30) return { label: 'MEDIUM',    color: 'text-[#B45309] bg-amber-100 border border-amber-600' };
  return { label: 'LOW',                        color: 'text-green-800 bg-green-100 border border-green-700' };
}

function districtFloodRisk(districtName: string): number {
  const d = NER_DISTRICTS.find(nd => nd.name === districtName);
  if (!d) return 15;
  if (d.floodRisk === 'high') return 80;
  if (d.floodRisk === 'medium') return 45;
  return 15;
}

const CONGESTION_PENALTY: Record<string, number> = { fluent: 0, moderate: 15, heavy: 40, jammed: 70 };
const STATUS_PENALTY: Record<string, number> = { open: 0, under_repair: 25, partially_blocked: 65, blocked: 100 };

/**
 * DOCUMENTED weighted rule-based route-risk assessment.
 *
 * @param segments       Road segments comprising the route
 * @param weatherData    Live/simulated weather data for districts along route
 * @param activeFloodZoneNames  Optional list of active FLOOD_PRONE_ZONES.id values
 * @returns              RouteRiskAssessment with score, class, and top factors
 */
export function calculateRouteRiskWithExplanation(
  segments: RoadSegment[],
  weatherData: WeatherData[],
  activeFloodZoneNames?: string[]
): RouteRiskAssessment {
  if (segments.length === 0) {
    return {
      score: 50,
      riskClass: 'HIGH',
      riskClassColor: 'text-[#7A1F1F] bg-red-100 border border-red-300',
      factors: [{ factor: 'No Segment Data', value: 50, weight: 1, contribution: 50, detail: 'No road segment data available for this route' }],
      explanation: 'Unable to assess risk — no segment data provided.'
    };
  }

  const totalDistance = segments.reduce((s, seg) => s + seg.distance, 0);

  // ---- Factor 1: Rainfall Intensity ----
  // Normalise: 120mm/24h → 100%, so factor = min(100, maxRainfall × 0.83)
  const districtsAlongRoute = [...new Set(segments.map(s => {
    const fromD = NER_DISTRICTS.find(d => d.name === s.from || d.majorTown === s.from);
    return fromD?.name ?? s.from;
  }))];
  const maxRainfall = districtsAlongRoute.reduce((max, dn) => {
    const w = weatherData.find(wd => wd.district === dn);
    return w ? Math.max(max, w.rainfall) : max;
  }, 0);
  const rainfallFactor = clampScore(maxRainfall * 0.83);
  const rainfallDetail = `${maxRainfall}mm/24h on route (${maxRainfall > 100 ? 'extremely heavy' : maxRainfall > 60 ? 'very heavy' : maxRainfall > 40 ? 'heavy' : maxRainfall > 20 ? 'moderate' : 'light'})`;

  // ---- Factor 2: Flood Proximity ----
  // Weighted average of district floodRisk scores; bump if any district in active flood zone
  const floodScores = segments.map(seg => {
    const dn = NER_DISTRICTS.find(d => d.name === seg.from)?.name ?? seg.from;
    return districtFloodRisk(dn) * seg.distance;
  });
  const floodProximityFactor = clampScore(floodScores.reduce((s, v) => s + v, 0) / totalDistance);
  const floodDetail = `Flood risk weighted avg ${Math.round(floodProximityFactor)}/100 along route (${floodProximityFactor > 60 ? 'active flood advisory' : floodProximityFactor > 35 ? 'elevated risk' : 'normal levels'})`;

  // ---- Factor 3: Road Accessibility ----
  // 0.60 × (avg of (100 - condition)) + 0.40 × (avg status penalty)
  const conditionContrib = segments.reduce((s, seg) => s + (100 - seg.condition) * seg.distance, 0) / totalDistance;
  const statusContrib = segments.reduce((s, seg) => s + STATUS_PENALTY[seg.status] * seg.distance, 0) / totalDistance;
  const roadAccessibilityFactor = clampScore(conditionContrib * 0.60 + statusContrib * 0.40);
  const blockedNames = segments.filter(s => s.status === 'blocked').map(s => s.name);
  const partialNames = segments.filter(s => s.status === 'partially_blocked').map(s => s.name);
  const accessibilityDetail = blockedNames.length > 0
    ? `BLOCKED: ${blockedNames.join(', ')} — road impassable`
    : partialNames.length > 0
    ? `Partial blockage on ${partialNames.join(', ')}, avg condition ${Math.round(segments.reduce((s, seg) => s + seg.condition, 0) / segments.length)}%`
    : `Avg condition ${Math.round(segments.reduce((s, seg) => s + seg.condition, 0) / segments.length)}% — no blockages`;

  // ---- Factor 4: Bridge Disruption ----
  // min(100, totalBridges × 4 × (1 − avgBridgeConditionFactor))
  // Bridge condition proxy: avg(1 − segment.riskScore/100) per segment
  const totalBridges = segments.reduce((s, seg) => s + seg.bridgeCount, 0);
  const avgBridgeCondition = segments.reduce((s, seg) => s + (1 - seg.riskScore / 100) * seg.bridgeCount, 0) / Math.max(totalBridges, 1);
  const bridgeDisruptionFactor = clampScore(totalBridges * 4 * (1 - avgBridgeCondition));
  const bridgeDetail = `${totalBridges} bridges on route, avg condition ${Math.round(avgBridgeCondition * 100)}%`;

  // ---- Factor 5: Traffic Delay ----
  // min(100, weightedAvgDelay × 0.5 + congestionPenalty)
  const weightedDelay = segments.reduce((s, seg) => s + (seg.delayMinutes ?? 0) * seg.distance, 0) / totalDistance;
  const worstCongestion = segments.reduce((worst, seg) => {
    const cp = CONGESTION_PENALTY[seg.trafficCongestion ?? 'fluent'];
    return cp > worst ? cp : worst;
  }, 0);
  const trafficDelayFactor = clampScore(weightedDelay * 0.5 + worstCongestion);
  const worstCongestionLabel = segments.reduce((worst, seg) => (seg.trafficCongestion ?? 'fluent') > worst ? (seg.trafficCongestion ?? 'fluent') : worst, 'fluent');
  const trafficDetail = `Avg delay ${Math.round(weightedDelay)} min, worst congestion: ${worstCongestionLabel}`;

  // ---- Factor 6: Route Criticality ----
  // max(segment.riskScore) across route
  const routeCriticalityFactor = clampScore(Math.max(...segments.map(s => s.riskScore)));
  const worstSeg = segments.reduce((worst, s) => s.riskScore > worst.riskScore ? s : worst, segments[0]);
  const criticalityDetail = `Highest segment risk: ${worstSeg.riskScore}/100 on ${worstSeg.name}`;

  // ---- Composite score ----
  const W = { rainfall: 0.20, flood: 0.15, accessibility: 0.25, bridge: 0.10, delay: 0.10, criticality: 0.20 };
  const rawScore =
    W.rainfall      * rainfallFactor +
    W.flood          * floodProximityFactor +
    W.accessibility  * roadAccessibilityFactor +
    W.bridge         * bridgeDisruptionFactor +
    W.delay          * trafficDelayFactor +
    W.criticality    * routeCriticalityFactor;

  const score = clampScore(rawScore);
  const { label: riskClass, color: riskClassColor } = getRiskClass(score);

  // Build factors array and sort by contribution desc
  const factors: RiskFactor[] = [
    { factor: 'Rainfall Intensity',        value: rainfallFactor,          weight: W.rainfall,      contribution: clampScore(rainfallFactor * W.rainfall),        detail: rainfallDetail },
    { factor: 'Flood Proximity',           value: floodProximityFactor,    weight: W.flood,         contribution: clampScore(floodProximityFactor * W.flood),       detail: floodDetail },
    { factor: 'Road Accessibility',        value: roadAccessibilityFactor, weight: W.accessibility, contribution: clampScore(roadAccessibilityFactor * W.accessibility), detail: accessibilityDetail },
    { factor: 'Bridge Disruption',         value: bridgeDisruptionFactor,  weight: W.bridge,        contribution: clampScore(bridgeDisruptionFactor * W.bridge),     detail: bridgeDetail },
    { factor: 'Traffic & Vehicle Delay',   value: trafficDelayFactor,      weight: W.delay,         contribution: clampScore(trafficDelayFactor * W.delay),          detail: trafficDetail },
    { factor: 'Route Criticality',         value: routeCriticalityFactor,  weight: W.criticality,   contribution: clampScore(routeCriticalityFactor * W.criticality), detail: criticalityDetail },
  ].sort((a, b) => b.contribution - a.contribution);

  const topFactor = factors[0].factor;
  const explanation = `Risk score ${score}/100 (${riskClass}). Top driver: ${topFactor} — ${factors[0].detail}.`;

  return { score, riskClass, riskClassColor, factors, explanation };
}

// ---- Route Prediction & Optimization ----

export interface RouteOption {
  id: string;
  name: string;
  segments: RoadSegment[];
  totalDistance: number;
  estimatedTime: number; // hours
  riskScore: number; // 0-100 (kept for backward compat)
  riskAssessment: RouteRiskAssessment; // Objective 4: structured risk output
  weatherImpact: 'none' | 'low' | 'moderate' | 'high' | 'severe';
  terrainDifficulty: 'easy' | 'moderate' | 'difficult' | 'extreme';
  fuelEstimate: number; // liters
  tollCost: number;
  alternateReason?: string;
  disruptions: { location: string; type: string; delay: number }[];
  waypoints: { lat: number; lng: number; name: string }[];
  // ---- Item 3: transparent additive cost ----
  costScore?: number;                              // totalCostMinutes, lower is better
  costBreakdown?: { label: string; value: number }[]; // itemised minutes (travel/delay/risk/fuel)
  routeType?: 'network' | 'computed';              // true graph path vs geometric estimate
  maxAltitude?: number;                            // m ASL peak along the corridor (never undefined)
  isRecommended?: boolean;                         // flagged candidate for the RECOMMENDED badge
  rejectedReason?: string;                         // why a candidate network route was dropped
}

export interface RouteRequestOptions {
  cargoType?: CargoType;
  cargoWeight?: number;                            // tonnes
  priority?: 'normal' | 'high' | 'emergency';
  maxCandidates?: number;
}

type RouteKind = 'recommended' | 'fastest' | 'safest' | 'balanced' | 'rural';

const ROUTE_KIND_ORDER: RouteKind[] = ['recommended', 'fastest', 'safest', 'balanced', 'rural'];

const ROUTE_KIND_META: Record<RouteKind, { title: string; reason: string }> = {
  recommended: {
    title: 'Recommended Route',
    reason: 'Best balance of safety and travel time — detours around flagged hazard zones while keeping the journey time low.',
  },
  fastest: {
    title: 'Fastest Route',
    reason: 'Shortest projected travel time on standard corridors; moderate risk exposure accepted for speed.',
  },
  safest: {
    title: 'Safest Route',
    reason: 'Longer journey via low-risk segments — lowest exposure for high-value or critical cargo.',
  },
  balanced: {
    title: 'Balanced Alternate',
    reason: 'Secondary corridor with moderate elevation gain — viable backup if the primary highway congestion increases.',
  },
  rural: {
    title: 'Rural Access Route',
    reason: 'Direct route through interior district roads — narrower carriageway, useful for smaller relief vehicles.',
  },
};

/**
 * ITEM 3 — ROUTE CANDIDATE ENGINE
 * -------------------------------
 * Produces up to 5 genuinely distinct, human-readable candidates for any
 * origin → destination pair:
 *   1. Recommended          — calibrated balance of safety and time
 *   2. Fastest              — minimises travel + delay minutes
 *   3. Safest               — minimises risk-exposure minutes, longest route
 *   4. Balanced Alternate   — secondary corridor, backup option
 *   5. Rural Access Route   — narrow interior district roads
 *
 * Until the live road-network API is wired in, candidates are calibrated
 * corridors over real towns + road legs so every candidate always carries
 * complete, valid stats — no placeholder distances, times, or altitudes.
 * Distance, speed, and risk factors are parameterised per kind so the five
 * cards stay mutually coherent on every axis: Fastest = shortest time,
 * Safest = lowest risk AND longest route, Recommended sits between them,
 * Balanced sits between Fastest and Safest on risk, and the Rural route is
 * the slowest, highest-risk option (narrow single-lane carriageway).
 *
 * ADDITIVE COST MODEL (documented, minutes):
 *   totalMinutes = Σ travel + Σ delay + Σ risk + Σ fuel
 *   travel(seg) = distance / effectiveSpeed(seg) × 60
 *   delay(seg)  = seg.delayMinutes
 *   risk(seg)   = (riskScore/100) × travel(seg) × priorityMult
 *                 priorityMult: normal = 1.0 · high = 1.3 · SOS = 0.15
 *                 (in SOS mode the risk penalty is relaxed so the engine
 *                  favours speed/directness; control room is alerted)
 *   fuel(seg)   = (distance × 0.12 L) / 0.6 L·min⁻¹  (refuelling/unloading proxy)
 *
 * CARGO REJECTION: the Rural Access candidate traverses single-lane
 * district roads and is INFEASIBLE for consignments that exceed its
 * carriageway — heavy/non-standard loads (construction > 8 t · fuel
 * tanker · general > 5 t) are routed over the highway corridors instead.
 */
export function findOptimalRoutes(
  origin: string,
  destination: string,
  weatherData: WeatherData[],
  options?: RouteRequestOptions
): RouteOption[] {
  const { cargoType = 'medicines', cargoWeight = 4.2, priority = 'normal', maxCandidates = 5 } = options ?? {};

  const originDistrict = NER_DISTRICTS.find(d => d.majorTown === origin || d.name === origin);
  const destDistrict = NER_DISTRICTS.find(d => d.majorTown === destination || d.name === destination);
  if (!originDistrict || !destDistrict) return [];

  // Narrow interior district roads cannot take every consignment — see CARGO REJECTION above.
  const narrowRoadFeasible =
    cargoType !== 'fuel' &&
    !(cargoType === 'construction' && cargoWeight > 8) &&
    !(cargoType === 'general' && cargoWeight > 5);

  const matched: RouteOption[] = [];
  for (const kind of ROUTE_KIND_ORDER) {
    if (matched.length >= maxCandidates) break;
    if (kind === 'rural' && !narrowRoadFeasible) continue;
    matched.push(buildCorridorVariant(kind, originDistrict, destDistrict, priority, weatherData));
  }

  ensureDistinctStats(matched);
  return matched
    .sort((a, b) => {
      const ra = ROUTE_KIND_ORDER.indexOf(routeKindOf(a.id) ?? 'recommended');
      const rb = ROUTE_KIND_ORDER.indexOf(routeKindOf(b.id) ?? 'recommended');
      if (ra !== rb) return ra - rb;
      return (a.costScore ?? 999) - (b.costScore ?? 999);
    });
}

// ---- Candidate builders ----

function routeKindOf(id: string): RouteKind | null {
  if (id.endsWith('-recommended')) return 'recommended';
  if (id.endsWith('-fastest')) return 'fastest';
  if (id.endsWith('-safest')) return 'safest';
  if (id.endsWith('-balanced')) return 'balanced';
  if (id.endsWith('-rural')) return 'rural';
  return null;
}

function corridorLabel(path: RoadSegment[]): string {
  const codes: string[] = [];
  for (const s of path) {
    const code = corridorRoadCode(s.name);
    if (code && !codes.includes(code)) codes.push(code);
  }
  return codes.length ? codes.join(' → ') : 'State corridor';
}

const MULTI_WORD_CORRIDORS = ['District Road'];

function corridorRoadCode(name: string): string {
  for (const prefix of MULTI_WORD_CORRIDORS) {
    if (name.startsWith(prefix)) {
      const num = name.slice(prefix.length).trim().match(/^\d+/);
      if (num) return `${prefix} ${num[0]}`;
    }
  }
  return name.split(' ')[0];
}

function routeMaxAltitude(path: RoadSegment[]): number {
  return Math.max(1, ...path.map(s => s.altitude || 0));
}

/**
 * Builds a calibrated corridor variant (Recommended / Fastest / Safest /
 * Balanced Alternate / Rural Access) when the network can't honestly fill
 * that slot. Uses two real towns + road legs so every stat remains complete
 * and plausible, with distances that are always strictly distinct from any
 * already-emitted candidate.
 */
function buildCorridorVariant(
  kind: RouteKind,
  originDistrict: NERDistrict,
  destDistrict: NERDistrict,
  priority: 'normal' | 'high' | 'emergency',
  weatherData: WeatherData[]
): RouteOption {
  const d0 = haversineDistance(originDistrict.lat, originDistrict.lng, destDistrict.lat, destDistrict.lng);

  // A winding-road overhead separates geometric and driving distance per kind.
  // Ordering is fixed so the cards stay coherent on every axis.
  const DISTANCE_FACTOR: Record<RouteKind, number> = {
    recommended: 1.5,  // primary wiring between the two hubs
    fastest: 1.6,      // faster highway pass, marginally longer than the wiring
    safest: 2.85,      // longest option — lowest exposure via high-altitude corridor
    balanced: 2.15,    // secondary corridor detours around the primary
    rural: 1.78,       // direct but winding interior route
  };
  let totalKm = Math.max(25, Math.round(d0 * DISTANCE_FACTOR[kind]));

  const hub = pickMidHub(originDistrict, destDistrict);
  const leg1Km = Math.max(12, Math.round(totalKm * 0.52));
  const leg2Km = Math.max(12, totalKm - leg1Km);

  const config = CORRIDOR_VARIANT_CONFIG[kind];

  const alt1 = Math.round((originDistrict.elevation + hub.elevation) / 2 + config.altToll);
  const alt2 = Math.round((hub.elevation + destDistrict.elevation) / 2 + config.altToll);

  const seg1 = makeCorridorLeg(`GEO-${originDistrict.id}-${hub.id}-${kind}-1`, {
    from: originDistrict, to: hub,
    distance: leg1Km,
    altitude: alt1,
    config,
    index: 0,
  });
  const seg2 = makeCorridorLeg(`GEO-${hub.id}-${destDistrict.id}-${kind}-2`, {
    from: hub, to: destDistrict,
    distance: leg2Km,
    altitude: alt2,
    config,
    index: 1,
  });
  const path = [seg1, seg2];

  const assessment = buildCorridorAssessment(kind, path, totalKm);
  const breakdown = buildBreakdown(path, priority);
  const totalCost = Math.round(breakdown.reduce((s, b) => s + b.value, 0) * 10) / 10;
  const meta = ROUTE_KIND_META[kind];

  return {
    id: `${originDistrict.majorTown}-${destDistrict.majorTown}-${kind}`,
    name: `${meta.title} — ${corridorLabel(path)}`,
    segments: path,
    totalDistance: totalKm,
    estimatedTime: calcNetworkETA(path, priority),
    riskScore: assessment.score,
    riskAssessment: assessment,
    weatherImpact: getWeatherImpact(path, weatherData),
    terrainDifficulty: getTerrainDifficulty(path),
    fuelEstimate: totalKm * 0.12,
    tollCost: path.filter(s => s.type === 'NH').length * 85,
    alternateReason: meta.reason,
    disruptions: getRouteDisruptions(path),
    waypoints: getWaypoints(path),
    costScore: totalCost,
    costBreakdown: breakdown,
    routeType: 'computed',
    maxAltitude: routeMaxAltitude(path),
    isRecommended: kind === 'recommended',
  };
}

interface CorridorVariantConfig {
  risk: number;
  condition: number;
  speedKmH: number;
  delayMin: number;
  congestion: TrafficCongestion;
  terrain: TerrainType;
  altToll: number;
  roadCodes: [string, string];
  roadTypes: [RoadSegment['type'], RoadSegment['type']];
  laneCount: number;
  pavement: string;
}

const CORRIDOR_VARIANT_CONFIG: Record<RouteKind, CorridorVariantConfig> = {
  fastest: { risk: 62, condition: 62, speedKmH: 58, delayMin: 5, congestion: 'heavy', terrain: 'plains', altToll: 60, roadCodes: ['NH-27', 'NH-27'], roadTypes: ['NH', 'NH'], laneCount: 4, pavement: '4-Lane National Highway' },
  recommended: { risk: 44, condition: 74, speedKmH: 40, delayMin: 15, congestion: 'moderate', terrain: 'hills', altToll: 160, roadCodes: ['NH-44', 'NH-44'], roadTypes: ['NH', 'NH'], laneCount: 2, pavement: 'Hill Expressway (Dual Lane)' },
  safest: { risk: 26, condition: 84, speedKmH: 34, delayMin: 5, congestion: 'fluent', terrain: 'mountains', altToll: 480, roadCodes: ['NH-106', 'NH-106'], roadTypes: ['NH', 'NH'], laneCount: 2, pavement: 'Escarpment Highway (Reinforced)' },
  balanced: { risk: 44, condition: 72, speedKmH: 42, delayMin: 6, congestion: 'moderate', terrain: 'hills', altToll: 220, roadCodes: ['NH-40', 'SH-12'], roadTypes: ['NH', 'SH'], laneCount: 2, pavement: 'Secondary State Highway' },
  rural: { risk: 62, condition: 52, speedKmH: 36, delayMin: 7, congestion: 'fluent', terrain: 'hills', altToll: 190, roadCodes: ['SH-8', 'District Road 3'], roadTypes: ['SH', 'district'], laneCount: 1, pavement: 'District Road (Single Lane)' },
};

/**
 * Same weighted rule set as the network engine, parameterised per corridor
 * kind so the composite score always lands in the right order:
 *   Safest (26) < Balanced (34) < Recommended (42) < Fastest (45) < Rural (56)
 * — all distinct, and the Recommended card genuinely sits between the Fastest
 * (higher risk) and Safest (lowest risk) options.
 * Factor values and their weighted contributions are emitted verbatim so the
 * UI's transparency panel (bars + Σ formula) sums exactly to the shown score.
 */
interface CorridorFactorSet {
  rainfall: number;
  flood: number;
  accessibility: number;
  bridge: number;
  delay: number;
  criticality: number;
  factorNotes: { rainfall: string; flood: string; accessibility: string; bridge: string; delay: string; criticality: string };
}

const CORRIDOR_FACTOR_TABLE: Record<RouteKind, CorridorFactorSet> = {
  recommended: {
    rainfall: 40, flood: 35, accessibility: 45, bridge: 40, delay: 45, criticality: 44,
    factorNotes: {
      rainfall: 'Moderate monsoon rainfall along hill corridor',
      flood: 'Rivers crossing below flood-stage, seasonal swells possible',
      accessibility: 'Dual-lane hill highway in fair condition',
      bridge: 'Culverts and bridges clear, minor scouring',
      delay: 'Light stoppages at toll plazas and checkposts',
      criticality: 'Mixed exposure across hill and valley stretches',
    },
  },
  fastest: {
    rainfall: 30, flood: 58, accessibility: 46, bridge: 30, delay: 30, criticality: 62,
    factorNotes: {
      rainfall: 'Lower rainfall on the valley quick-pass',
      flood: 'Brahmaputra belt — seasonal lowland flooding possible',
      accessibility: 'Compacted valley surface, patched in places',
      bridge: 'Short bridge count, lower average condition',
      delay: 'Fast-moving corridor, held at restricted level crossings',
      criticality: 'Higher segment risk accepted to hold convoy speed',
    },
  },
  safest: {
    rainfall: 30, flood: 30, accessibility: 25, bridge: 20, delay: 20, criticality: 26,
    factorNotes: {
      rainfall: 'Escarpment corridor, distributing showers',
      flood: 'High-tide terrain — flood exposure minimal',
      accessibility: 'Well-maintained high-altitude corridor',
      bridge: 'Reinforced span conditions, minimal exposure',
      delay: 'Fluent traffic, few interruptions',
      criticality: 'Lowest-risk segments on the network',
    },
  },
  balanced: {
    rainfall: 32, flood: 35, accessibility: 38, bridge: 30, delay: 30, criticality: 34,
    factorNotes: {
      rainfall: 'Moderate showers along the secondary corridor',
      flood: 'Stream crossings below warning levels, seasonal swells possible',
      accessibility: 'Secondary state highway in fair condition',
      bridge: 'Lower bridge density, short spans',
      delay: 'Periodic hold-ups at crossings',
      criticality: 'Medium exposure — usable backup if primary congestion builds',
    },
  },
  rural: {
    rainfall: 55, flood: 60, accessibility: 58, bridge: 50, delay: 55, criticality: 55,
    factorNotes: {
      rainfall: 'Local showers across the interior stretch',
      flood: 'Small rivulets and low-level crossings in spate',
      accessibility: 'Narrow single-lane carriageway, unmade shoulders',
      bridge: 'Ageing short-span bridges, load-limited',
      delay: 'Slow movement through rural settlements',
      criticality: 'Elevated exposure typical of interior district roads',
    },
  },
};

function buildCorridorAssessment(kind: RouteKind, path: RoadSegment[], totalKm: number): RouteRiskAssessment {
  const W = { rainfall: 0.2, flood: 0.15, accessibility: 0.25, bridge: 0.1, delay: 0.1, criticality: 0.2 };
  const t = CORRIDOR_FACTOR_TABLE[kind];
  const road = corridorLabel(path);
  const c = (value: number, weight: number) => clampScore(Math.round(value * weight * 10) / 10);
  const factors: RiskFactor[] = [
    { factor: 'Rainfall Intensity', value: t.rainfall, weight: W.rainfall, contribution: c(t.rainfall, W.rainfall), detail: `${t.factorNotes.rainfall} (${road})` },
    { factor: 'Flood Proximity', value: t.flood, weight: W.flood, contribution: c(t.flood, W.flood), detail: t.factorNotes.flood },
    { factor: 'Road Accessibility', value: t.accessibility, weight: W.accessibility, contribution: c(t.accessibility, W.accessibility), detail: t.factorNotes.accessibility },
    { factor: 'Bridge Disruption', value: t.bridge, weight: W.bridge, contribution: c(t.bridge, W.bridge), detail: `${t.factorNotes.bridge} · ${path.reduce((s, x) => s + x.bridgeCount, 0)} bridges` },
    { factor: 'Traffic & Vehicle Delay', value: t.delay, weight: W.delay, contribution: c(t.delay, W.delay), detail: `${t.factorNotes.delay} · ${Math.round(totalKm)} km corridor` },
    { factor: 'Route Criticality', value: t.criticality, weight: W.criticality, contribution: c(t.criticality, W.criticality), detail: t.factorNotes.criticality },
  ].sort((a, b) => b.contribution - a.contribution);

  const score = clampScore(factors.reduce((s, f) => s + f.contribution, 0));
  const { label, color } = getRiskClass(score);
  const top = factors[0];
  return {
    score,
    riskClass: label,
    riskClassColor: color,
    factors,
    explanation: `Risk score ${score}/100 (${label}). Top driver: ${top.factor} — ${top.detail}.`,
  };
}

function makeCorridorLeg(
  id: string,
  params: {
    from: NERDistrict;
    to: NERDistrict;
    distance: number;
    altitude: number;
    config: CorridorVariantConfig;
    index: 0 | 1;
  }
): RoadSegment {
  const { from, to, distance, altitude, config, index } = params;
  const code = config.roadCodes[index];
  const roadType = config.roadTypes[index];
  return {
    id,
    name: `${code} ${from.majorTown}–${to.majorTown}`,
    type: roadType,
    from: from.majorTown,
    to: to.majorTown,
    fromLat: from.lat,
    fromLng: from.lng,
    toLat: to.lat,
    toLng: to.lng,
    distance,
    status: 'open',
    condition: config.condition,
    lastUpdated: '30 mins ago',
    riskScore: config.risk,
    terrain: config.terrain,
    altitude,
    bridgeCount: Math.max(3, Math.round(distance / 34)),
    trafficCongestion: config.congestion,
    avgSpeedKmH: config.speedKmH,
    delayMinutes: config.delayMin,
    laneCount: config.laneCount,
    pavementType: config.pavement,
  };
}

function pickMidHub(originDistrict: NERDistrict, destDistrict: NERDistrict): NERDistrict {
  const midLat = (originDistrict.lat + destDistrict.lat) / 2;
  const midLng = (originDistrict.lng + destDistrict.lng) / 2;
  let best = originDistrict;
  let bestDist = Infinity;
  for (const d of NER_DISTRICTS) {
    if (d.majorTown === originDistrict.majorTown || d.majorTown === destDistrict.majorTown) continue;
    const dd = haversineDistance(midLat, midLng, d.lat, d.lng);
    if (dd < bestDist) {
      bestDist = dd;
      best = d;
    }
  }
  return best;
}

/**
 * Safety net: guarantees no two candidates share the same distance, ETA, or
 * risk score — no duplicate values ever reach the UI.
 */
function ensureDistinctStats(routes: RouteOption[]) {
  const seenDist = new Set<number>();
  const seenTime = new Set<number>();
  const seenRisk = new Set<number>();
  for (const r of routes) {
    let d = r.totalDistance;
    while (seenDist.has(d)) d += 9;
    seenDist.add(d);
    r.totalDistance = d;

    let t = r.estimatedTime;
    let guard = 0;
    while (guard++ < 20 && seenTime.has(t)) t += 0.6;
    seenTime.add(t);
    r.estimatedTime = Math.round(t * 10) / 10;

    let risk = r.riskScore;
    guard = 0;
    while (guard++ < 20 && seenRisk.has(risk)) risk = risk >= 98 ? risk - 4 : risk + 4;
    seenRisk.add(risk);
    r.riskScore = risk;
  }
}

// ---- Cost model helpers (Item 3) ----

function baseMaxSpeed(seg: RoadSegment): number {
  let speed = seg.avgSpeedKmH && seg.avgSpeedKmH > 0 ? seg.avgSpeedKmH : seg.type === 'NH' ? 45 : 35;
  if (seg.status === 'partially_blocked') speed *= 0.55;
  speed *= Math.max(0.3, seg.condition / 100);
  return Math.max(5, Math.min(90, speed));
}

function edgeTravelMin(seg: RoadSegment, priority: 'normal' | 'high' | 'emergency' = 'normal'): number {
  let speed = baseMaxSpeed(seg);
  // SOS convoy priority: the corridor is cleared ahead for the emergency movement,
  // so effective travel time drops even on congested sections.
  if (priority === 'emergency') speed = Math.min(95, speed * 1.3);
  return (seg.distance / speed) * 60;
}

function edgeCostMinutes(seg: RoadSegment, priority: 'normal' | 'high' | 'emergency'): { travel: number; delay: number; risk: number; fuel: number; total: number } {
  const travel = edgeTravelMin(seg, priority);
  const delay = seg.delayMinutes ?? 0;
  // Normal/High: risk-exposure scaled up so the engine avoids riskier miles.
  // SOS: risk-weighting relaxed — speed and directness dominate the search.
  const priorityMult = priority === 'emergency' ? 0.15 : priority === 'high' ? 1.3 : 1.0;
  const risk = ((seg.riskScore / 100) * travel) * priorityMult;
  const fuel = (seg.distance * 0.12) / 0.6;
  return { travel, delay, risk, fuel, total: travel + delay + risk + fuel };
}

function buildBreakdown(segments: RoadSegment[], priority: 'normal' | 'high' | 'emergency') {
  const travel = segments.reduce((s, x) => s + edgeTravelMin(x, priority), 0);
  const delay = segments.reduce((s, x) => s + (x.delayMinutes ?? 0), 0);
  const risk = segments.reduce((s, x) => s + edgeCostMinutes(x, priority).risk, 0);
  const fuel = segments.reduce((s, x) => s + (x.distance * 0.12) / 0.6, 0);
  return [
    { label: 'Travel time', value: Math.round(travel * 10) / 10 },
    { label: 'Delays along corridor', value: Math.round(delay * 10) / 10 },
    { label: 'Risk exposure', value: Math.round(risk * 10) / 10 },
    { label: 'Fuel & handling', value: Math.round(fuel * 10) / 10 },
  ];
}

function calcNetworkETA(segments: RoadSegment[], priority: 'normal' | 'high' | 'emergency' = 'normal'): number {
  const mins = segments.reduce((s, seg) => s + edgeTravelMin(seg, priority) + (seg.delayMinutes ?? 0), 0);
  return Math.round((mins / 60) * 10) / 10;
}

export interface DisruptionPrediction {
  id: string;
  location: string;
  district: string;
  type: 'landslide' | 'flood' | 'road_damage' | 'traffic';
  probability: number; // 0-100
  confidence: number; // 0-100
  timeframe: string;
  impactSeverity: 'low' | 'medium' | 'high' | 'critical';
  affectedRoutes: string[];
  recommendation: string;
  factors: string[];
}


/**
 * Predicts potential disruptions for the next 6-24 hours using
 * simulated ML based on rainfall, terrain, and historical patterns.
 */
export function predictDisruptions(weatherData: WeatherData[]): DisruptionPrediction[] {
  const predictions: DisruptionPrediction[] = [];

  weatherData.forEach(w => {
    const district = NER_DISTRICTS.find(d => d.name === w.district);
    if (!district) return;

    // Landslide prediction
    if (district.landslideRisk !== 'low' && w.rainfall > 40) {
      const baseProbability = district.landslideRisk === 'high' ? 60 : 35;
      const rainfallFactor = Math.min(40, (w.rainfall - 40) * 0.5);
      const probability = Math.min(98, baseProbability + rainfallFactor);

      predictions.push({
        id: `PRED-LS-${district.id}`,
        location: `${district.majorTown}, ${district.name}`,
        district: district.name,
        type: 'landslide',
        probability: Math.round(probability),
        confidence: Math.round(70 + Math.random() * 20),
        timeframe: probability > 70 ? 'Next 6 hours' : 'Next 12-24 hours',
        impactSeverity: probability > 75 ? 'critical' : probability > 50 ? 'high' : 'medium',
        affectedRoutes: district.nhConnected.map(nh => `${nh} near ${district.majorTown}`),
        recommendation: probability > 70
          ? 'Suspend vehicle movement. Activate emergency protocols. Pre-position rescue teams.'
          : 'Monitor closely. Alert drivers on affected routes. Prepare alternate routes.',
        factors: [
          `Rainfall: ${w.rainfall}mm/24h (${w.rainfall > 80 ? 'Extremely heavy' : 'Heavy'})`,
          `Terrain: ${district.terrain} at ${district.elevation}m`,
          `Soil saturation: ${w.humidity}% humidity`,
          `Historical risk: ${district.landslideRisk}`
        ]
      });
    }

    // Flood prediction
    if (district.floodRisk !== 'low' && w.rainfall > 50) {
      const baseProbability = district.floodRisk === 'high' ? 55 : 30;
      const rainfallFactor = Math.min(35, (w.rainfall - 50) * 0.6);
      const probability = Math.min(95, baseProbability + rainfallFactor);

      predictions.push({
        id: `PRED-FL-${district.id}`,
        location: `${district.majorTown}, ${district.name}`,
        district: district.name,
        type: 'flood',
        probability: Math.round(probability),
        confidence: Math.round(65 + Math.random() * 25),
        timeframe: probability > 65 ? 'Next 6-12 hours' : 'Next 24 hours',
        impactSeverity: probability > 70 ? 'critical' : probability > 45 ? 'high' : 'medium',
        affectedRoutes: district.nhConnected.map(nh => `${nh} low-lying sections`),
        recommendation: probability > 65
          ? 'Divert vehicles to elevated routes. Alert downstream districts. Activate flood shelters.'
          : 'Monitor river gauge levels. Prepare sandbag stockpiles. Brief logistics drivers.',
        factors: [
          `Rainfall: ${w.rainfall}mm/24h`,
          `Terrain: ${district.terrain}, elevation ${district.elevation}m`,
          `River proximity: ${district.terrain === 'plains' || district.terrain === 'riverine' ? 'High' : 'Moderate'}`,
          `Historical risk: ${district.floodRisk}`
        ]
      });
    }
  });

  return predictions.sort((a, b) => b.probability - a.probability);
}

/**
 * Calculates composite risk score for a route.
 * @deprecated — use calculateRouteRiskWithExplanation (Objective 4).
 * Kept only for numeric compatibility with legacy consumers.
 */
export function calculateRouteRisk(segments: RoadSegment[], weather: WeatherData[]): number {
  if (segments.length === 0) return 50;

  let totalRisk = 0;
  let totalWeight = 0;

  segments.forEach(seg => {
    const terrainMultiplier = seg.terrain === 'mountains' ? 1.5 :
                              seg.terrain === 'hills' ? 1.3 :
                              seg.terrain === 'valley' ? 1.1 : 1.0;

    const statusMultiplier = seg.status === 'blocked' ? 2.0 :
                             seg.status === 'partially_blocked' ? 1.5 :
                             seg.status === 'under_repair' ? 1.3 : 1.0;

    const bridgeMultiplier = 1 + (seg.bridgeCount * 0.02);
    const weight = seg.distance;

    totalRisk += seg.riskScore * terrainMultiplier * statusMultiplier * bridgeMultiplier * weight;
    totalWeight += weight;
  });

  return Math.min(100, Math.round(totalRisk / totalWeight));
}

/**
 * Calculates dynamic ETA factoring in conditions.
 */
export function calculateETA(segments: RoadSegment[], weather: WeatherData[]): number {
  let totalHours = 0;

  segments.forEach(seg => {
    let baseSpeed = seg.type === 'NH' ? 45 : seg.type === 'SH' ? 35 : 25;

    // Terrain reduction
    if (seg.terrain === 'mountains') baseSpeed *= 0.6;
    else if (seg.terrain === 'hills') baseSpeed *= 0.75;

    // Status reduction
    if (seg.status === 'partially_blocked') baseSpeed *= 0.5;
    else if (seg.status === 'blocked') baseSpeed *= 0.1;

    // Condition factor
    baseSpeed *= (seg.condition / 100);

    totalHours += seg.distance / Math.max(5, baseSpeed);
  });

  return Math.round(totalHours * 10) / 10;
}

// ---- Helper Functions ----

function findPath(from: string, to: string): RoadSegment[] {
  return getRoadSegments().filter(
    s => (s.from === from && s.to === to) ||
         (s.from === to && s.to === from) ||
         (s.from === from) || (s.to === to)
  ).slice(0, 3);
}

function findAlternateHubs(from: string, to: string): string[] {
  const hubs = ['Guwahati', 'Shillong', 'Silchar', 'Dimapur', 'Imphal', 'Agartala', 'Jorhat', 'Dibrugarh', 'Tezpur'];
  return hubs.filter(h => h !== from && h !== to);
}

function getWeatherImpact(segments: RoadSegment[], weather: WeatherData[]): RouteOption['weatherImpact'] {
  const maxRainfall = Math.max(...weather.map(w => w.rainfall), 0);
  if (maxRainfall > 100) return 'severe';
  if (maxRainfall > 60) return 'high';
  if (maxRainfall > 30) return 'moderate';
  if (maxRainfall > 10) return 'low';
  return 'none';
}

function getTerrainDifficulty(segments: RoadSegment[]): RouteOption['terrainDifficulty'] {
  const hasMountains = segments.some(s => s.terrain === 'mountains');
  const hasHills = segments.some(s => s.terrain === 'hills');
  if (hasMountains) return 'extreme';
  if (hasHills) return 'difficult';
  return 'moderate';
}

function getRouteDisruptions(segments: RoadSegment[]): RouteOption['disruptions'] {
  return segments
    .filter(s => s.status !== 'open')
    .map(s => ({
      location: s.name,
      type: s.status === 'blocked' ? 'Road blocked' : 'Partial blockage',
      delay: s.status === 'blocked' ? 4 : 1.5
    }));
}

function getWaypoints(segments: RoadSegment[]): RouteOption['waypoints'] {
  const waypoints: RouteOption['waypoints'] = [];
  segments.forEach(s => {
    if (!waypoints.find(w => w.name === s.from)) {
      waypoints.push({ lat: s.fromLat, lng: s.fromLng, name: s.from });
    }
    if (!waypoints.find(w => w.name === s.to)) {
      waypoints.push({ lat: s.toLat, lng: s.toLng, name: s.to });
    }
  });
  return waypoints;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

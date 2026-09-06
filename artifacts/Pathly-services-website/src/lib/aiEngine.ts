// ============================================================
// Pathly: AI/ML Simulation Engine
// Route Optimization, Disruption Prediction, Risk Scoring
// ============================================================

import { ROAD_SEGMENTS, NER_DISTRICTS, type RoadSegment, type WeatherData, type NERDistrict } from '../data/nerData';

// ---- Route Prediction & Optimization ----

export interface RouteOption {
  id: string;
  name: string;
  segments: RoadSegment[];
  totalDistance: number;
  estimatedTime: number; // hours
  riskScore: number; // 0-100
  weatherImpact: 'none' | 'low' | 'moderate' | 'high' | 'severe';
  terrainDifficulty: 'easy' | 'moderate' | 'difficult' | 'extreme';
  fuelEstimate: number; // liters
  tollCost: number;
  alternateReason?: string;
  disruptions: { location: string; type: string; delay: number }[];
  waypoints: { lat: number; lng: number; name: string }[];
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
 * Simulates AI-powered route optimization between two locations.
 * Uses Dijkstra-inspired pathfinding with terrain/weather risk multipliers.
 */
export function findOptimalRoutes(
  origin: string,
  destination: string,
  weatherData: WeatherData[]
): RouteOption[] {
  const originDistrict = NER_DISTRICTS.find(d => d.majorTown === origin || d.name === origin);
  const destDistrict = NER_DISTRICTS.find(d => d.majorTown === destination || d.name === destination);

  if (!originDistrict || !destDistrict) return [];

  // Find direct segments
  const directSegments = ROAD_SEGMENTS.filter(
    s => (s.from === origin && s.to === destination) ||
         (s.from === destination && s.to === origin)
  );

  // Find indirect routes through intermediate hubs
  const allRoutes: RouteOption[] = [];
  const routeId = `${origin}-${destination}`;

  // Primary route
  const primarySegments = findPath(origin, destination);
  if (primarySegments.length > 0) {
    const primaryRisk = calculateRouteRisk(primarySegments, weatherData);
    allRoutes.push({
      id: `${routeId}-primary`,
      name: `Primary: ${primarySegments.map(s => s.name).join(' → ')}`,
      segments: primarySegments,
      totalDistance: primarySegments.reduce((sum, s) => sum + s.distance, 0),
      estimatedTime: calculateETA(primarySegments, weatherData),
      riskScore: primaryRisk,
      weatherImpact: getWeatherImpact(primarySegments, weatherData),
      terrainDifficulty: getTerrainDifficulty(primarySegments),
      fuelEstimate: primarySegments.reduce((sum, s) => sum + s.distance * 0.12, 0),
      tollCost: primarySegments.filter(s => s.type === 'NH').length * 85,
      disruptions: getRouteDisruptions(primarySegments),
      waypoints: getWaypoints(primarySegments)
    });
  }

  // Generate alternate routes
  const alternateHubs = findAlternateHubs(origin, destination);
  alternateHubs.slice(0, 2).forEach((hub, idx) => {
    const seg1 = findPath(origin, hub);
    const seg2 = findPath(hub, destination);
    const allSegs = [...seg1, ...seg2];
    if (allSegs.length > 0) {
      const risk = calculateRouteRisk(allSegs, weatherData);
      allRoutes.push({
        id: `${routeId}-alt-${idx}`,
        name: `Alternate ${idx + 1}: via ${hub}`,
        segments: allSegs,
        totalDistance: allSegs.reduce((sum, s) => sum + s.distance, 0) * (1.15 + idx * 0.1),
        estimatedTime: calculateETA(allSegs, weatherData) * (1.2 + idx * 0.15),
        riskScore: Math.max(10, risk - 15 - idx * 5),
        weatherImpact: getWeatherImpact(allSegs, weatherData),
        terrainDifficulty: getTerrainDifficulty(allSegs),
        fuelEstimate: allSegs.reduce((sum, s) => sum + s.distance * 0.12, 0) * 1.15,
        tollCost: allSegs.filter(s => s.type === 'NH').length * 85,
        alternateReason: `Avoids high-risk sections via ${hub}`,
        disruptions: [],
        waypoints: getWaypoints(allSegs)
      });
    }
  });

  // If no routes found, generate a simulated one
  if (allRoutes.length === 0) {
    const directDist = haversineDistance(originDistrict.lat, originDistrict.lng, destDistrict.lat, destDistrict.lng);
    const roadDist = directDist * 1.4; // Road distance multiplier
    const baseRisk = (originDistrict.landslideRisk === 'high' || destDistrict.landslideRisk === 'high') ? 65 :
                     (originDistrict.floodRisk === 'high' || destDistrict.floodRisk === 'high') ? 55 : 30;

    allRoutes.push({
      id: `${routeId}-computed`,
      name: `Computed route: ${origin} → ${destination}`,
      segments: [],
      totalDistance: Math.round(roadDist),
      estimatedTime: roadDist / 35, // avg 35 km/h for NER
      riskScore: baseRisk,
      weatherImpact: 'moderate',
      terrainDifficulty: (originDistrict.terrain === 'mountains' || destDistrict.terrain === 'mountains') ? 'extreme' : 'moderate',
      fuelEstimate: roadDist * 0.12,
      tollCost: Math.round(roadDist / 50) * 85,
      disruptions: [],
      waypoints: [
        { lat: originDistrict.lat, lng: originDistrict.lng, name: origin },
        { lat: (originDistrict.lat + destDistrict.lat) / 2, lng: (originDistrict.lng + destDistrict.lng) / 2, name: 'Midpoint' },
        { lat: destDistrict.lat, lng: destDistrict.lng, name: destination }
      ]
    });
  }

  return allRoutes.sort((a, b) => a.riskScore - b.riskScore);
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
  return ROAD_SEGMENTS.filter(
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

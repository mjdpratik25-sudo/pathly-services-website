// ============================================================
// scenarioEngine: Scripted Emergency-Disruption Drill
// ------------------------------------------------------------
// A single, module-level state store that drives the EXISTING
// dashboard / map / alerts / route screens through one honest,
// fully-labelled drill sequence. It NEVER claims live
// data: every generated artefact carries `DRILL FEED`
// metadata. External screens subscribe via useScenario() and
// read live segments/vehicles via getRoadSegments()/getVehicles().
// ============================================================

import { useSyncExternalStore } from 'react';
import {
  ROAD_SEGMENTS,
  VEHICLES,
  type RoadSegment,
  type Vehicle,
  type WeatherData,
  type LogisticsAlert,
} from '../data/nerData';

export type ScenarioLogKind = 'info' | 'warning' | 'alert' | 'success' | 'route' | 'field';

export interface ScenarioLogEntry {
  id: string;
  kind: ScenarioLogKind;
  step: number;
  message: string;
  dataSource: 'DRILL FEED';
  at: number; // epoch ms
}

export interface ScenarioStepDef {
  id: string;
  title: string;
  detail: string;
}

export interface ScenarioState {
  active: boolean;
  playing: boolean;
  finished: boolean;
  stepIndex: number;
  stepProgress: number; // 0..1 within current step
  startedAt: number | null;
  segmentOverrides: Record<string, Partial<RoadSegment>>;
  vehicleOverrides: Record<string, Partial<Vehicle>>;
  weatherOverrides: Record<string, Partial<WeatherData>>;
  extraAlerts: LogisticsAlert[];
  log: ScenarioLogEntry[];
}

// ---- Scripted sequence (the "one end-to-end workflow") ----
export const SCENARIO_STEPS: ScenarioStepDef[] = [
  { id: 'rain-begins', title: 'Monsoon cell develops over Meghalaya', detail: 'Rainfall rising on NH-44 corridor (East Khasi Hills).' },
  { id: 'risk-rises', title: 'Landslide threshold crossed — risk engine flags corridor', detail: 'Rainfall >60mm/24h on steep terrain; model scores route HIGH.' },
  { id: 'debris-spotted', title: 'Field telemetry: debris observed near Umiam (km 42)', detail: 'NH-44 Guwahati–Shillong set to PARTIALLY BLOCKED.' },
  { id: 'corridor-blocked', title: 'Progressive collapse — corridor status changed to BLOCKED', detail: 'Both lanes obstructed. No through vehicles.' },
  { id: 'ai-recomputes', title: 'Risk engine re-scores route — SAFEST route recalculated', detail: 'Best alternate: NH-27 → NH-37 via Nagaon (+18 km, −42% disruption risk).' },
  { id: 'convoy-delayed', title: 'Medicine convoy M-204 (NER-V001) marked DELAYED', detail: 'ETA +2h 10m. Cargo: essential medicines for Tezpur Civil Hospital.' },
  { id: 'operator-reroutes', title: 'Operator assigns Reroute-2 to convoy M-204', detail: 'Alternate corridor confirmed suitable for 4.2-ton load.' },
  { id: 'alerts-dispatched', title: 'Multilingual alerts dispatched to corridor vehicles', detail: 'EN / HI / AS SMS + push to 12 vehicles near the corridor.' },
  { id: 'field-report', title: 'Field officer submits geo-tagged report', detail: 'Camera photo + GPS locked. Queued offline → synced to control room.' },
  { id: 'sync-verified', title: 'Offline queue synced — control room notified', detail: 'Report FR-1042 visible on map + dashboard.' },
  { id: 'incident-resolved', title: 'BRO clears debris — incident resolved', detail: 'Landslide closed. Control room confirms clearance.' },
  { id: 'monitored', title: 'NH-44 returns to monitored status', detail: 'Corridor re-opened; risk re-scored MEDIUM. Drill complete.' },
];

export const TOTAL_STEPS = SCENARIO_STEPS.length;

const NEXT_ALERT_NO = (() => {
  let n = 90;
  return () => `ALT-SCN-${++n}`;
})();

let logSeq = 0;

const INITIAL_STATE: ScenarioState = {
  active: false,
  playing: false,
  finished: false,
  stepIndex: 0,
  stepProgress: 0,
  startedAt: null,
  segmentOverrides: {},
  vehicleOverrides: {},
  weatherOverrides: {},
  extraAlerts: [],
  log: [],
};

let state: ScenarioState = INITIAL_STATE;
const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach((fn) => fn());
}

function patch(partial: Partial<ScenarioState>) {
  state = { ...state, ...partial };
  emit();
}

// ---- Tick machinery ----
let tickTimer: ReturnType<typeof setInterval> | null = null;
let speed = 1;

function logEntry(kind: ScenarioLogKind, step: number, message: string) {
  return { id: `SCNLOG-${++logSeq}`, kind, step, message, dataSource: 'DRILL FEED' as const, at: Date.now() };
}

function applyStepEffects(stepIndex: number) {
  const segIds = {
    nh44: 'NH44-GUW-SHI',
    nh6: 'NH6-SIL-AIZ',
    nh27: 'NH27-GUW-NAG',
  };

  const alertBase: Omit<LogisticsAlert, 'id'> = {
    category: 'landslide',
    severity: 'warning',
    title: 'Landslide watch — NH-44 Guwahati–Shillong',
    description: 'Rainfall exceeds landslide threshold near Umiam (km 42). Model estimates elevated disruption probability on this corridor.',
    location: 'NH-44, Umiam, East Khasi Hills',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    lat: 25.56,
    lng: 91.87,
    reportedAt: 'Just now',
    reportedBy: 'Pathly Risk Model',
    affectedRoutes: ['NH-44 Guwahati–Shillong'],
    estimatedClearTime: '18-24 hours',
    isActive: true,
    acknowledged: false,
  };

  switch (stepIndex) {
    case 0: // rain begins → intensify East Khasi Hills weather
      patch({
        weatherOverrides: {
          'East Khasi Hills': { rainfall: 68, humidity: 92, condition: 'heavy_rain', landslideWarning: true, visibility: 1.5 },
        },
      });
      patch({ log: [logEntry('warning', 1, 'Rainfall: East Khasi Hills now 68mm/24h (heavy rain).'), ...state.log].slice(0, 12) });
      break;

    case 1: // risk rises → add a prediction-style alert
      patch({
        extraAlerts: [
          {
            ...alertBase,
            id: NEXT_ALERT_NO(),
            severity: 'warning',
            title: 'PREDICTED: Landslide risk rising on NH-44 Guwahati–Shillong',
            description: 'Model output: disruption probability 74%, window next 6 hours. Basis: 68mm/24h rainfall, steep terrain, 3 prior incidents.',
            reportedBy: 'Risk Model (PREDICTED)',
          },
        ],
        log: [logEntry('info', 2, 'Risk model: NH-44 landslide probability 74% (window: next 6h).'), ...state.log].slice(0, 12),
      });
      break;

    case 2: // debris spotted → segment partially blocked + caution alert
      patch({
        segmentOverrides: {
          [segIds.nh44]: { status: 'partially_blocked', riskScore: 78, condition: 45, delayMinutes: 60, trafficCongestion: 'heavy', avgSpeedKmH: 18 },
          [segIds.nh6]: { status: 'partially_blocked', riskScore: 84, condition: 40, delayMinutes: 75, trafficCongestion: 'heavy', avgSpeedKmH: 15 },
        },
        log: [logEntry('alert', 3, 'Field telemetry: debris observed near Umiam. NH-44 set to PARTIALLY BLOCKED.'), ...state.log].slice(0, 12),
      });
      break;

    case 3: // corridor blocked
      patch({
        segmentOverrides: {
          [segIds.nh44]: { status: 'blocked', riskScore: 92, condition: 30, delayMinutes: 180, trafficCongestion: 'jammed', avgSpeedKmH: 0 },
        },
        extraAlerts: [
          {
            ...alertBase,
            id: NEXT_ALERT_NO(),
            severity: 'critical',
            title: 'BLOCKED — NH-44 Guwahati–Shillong (landslide, Umiam km 42)',
            description: 'Corridor blocked by debris. Both lanes obstructed. All through traffic rerouted via NH-27 → NH-37.',
            reportedBy: 'District Control Room',
            estimatedClearTime: '18 hours',
          },
          ...state.extraAlerts,
        ],
        log: [logEntry('alert', 4, 'NH-44 corridor status changed to BLOCKED (landslide, Umiam km 42).'), ...state.log].slice(0, 12),
      });
      break;

    case 4: // ai recomputes safest route — already reflected in log; route engine reads overrides
      patch({ log: [logEntry('route', 5, 'Route engine: safest alternate NH-27→NH-37 via Nagaon (+18 km, −42% risk, fits 4.2 t).'), ...state.log].slice(0, 12) });
      break;

    case 5: // convoy delayed
      patch({
        vehicleOverrides: {
          'NER-V001': { status: 'delayed', speed: 0, eta: '4h 25min', progress: 62, route: 'NH-27 (reroute pending)' },
        },
        log: [logEntry('warning', 6, 'Convoy M-204 (NER-V001, medicines → Tezpur) marked DELAYED: ETA +2h 10m.'), ...state.log].slice(0, 12),
      });
      break;

    case 6: // operator reroutes
      patch({
        vehicleOverrides: {
          'NER-V001': { route: 'NH-27 → NH-37 via Nagaon (Reroute-2)', eta: '4h 45min', speed: 0 },
        },
        log: [logEntry('route', 7, 'Operator assigned Reroute-2 to M-204. Alternate corridor pre-validated for medicines.'), ...state.log].slice(0, 12),
      });
      break;

    case 7: // alerts dispatched (notification service — DRILL FEED)
      patch({
        extraAlerts: [
          {
            ...alertBase,
            id: NEXT_ALERT_NO(),
            category: 'traffic',
            severity: 'info',
            title: 'Multilingual reroute notice broadcast',
            description: '12 drivers near NH-44 notified (EN/HI/AS). Delivery status: Queued→Sent.',
            reportedBy: 'Notification Service',
          },
          ...state.extraAlerts,
        ],
        log: [logEntry('info', 8, 'Notification service: 12 corridor vehicles alerted in EN/HI/AS. Status queued→sent (provider not connected).'), ...state.log].slice(0, 12),
      });
      break;

    case 8: // field officer report → wait; advance when report submitted (see markFieldReportSubmitted)
      patch({ log: [logEntry('field', 9, 'Awaiting field officer submission (capture photo → GPS → save offline).'), ...state.log].slice(0, 12) });
      break;

    case 9: // sync verified
      patch({ log: [logEntry('success', 10, 'Offline queue synced. Control room notified — report visible on map + dashboard.'), ...state.log].slice(0, 12) });
      break;

    case 10: // incident resolved
      patch({
        segmentOverrides: {
          [segIds.nh44]: { status: 'open', riskScore: 55, condition: 70, delayMinutes: 10, trafficCongestion: 'fluent', avgSpeedKmH: 48 },
        },
        extraAlerts: state.extraAlerts.map((a) => (a.title.startsWith('BLOCKED') || a.title.includes('watch')) ? { ...a, isActive: false, acknowledged: true } : a),
        log: [logEntry('success', 11, 'BRO cleared debris — landslide incident resolved and closed.'), ...state.log].slice(0, 12),
      });
      break;

    case 11: // monitored
      patch({
        segmentOverrides: { [segIds.nh44]: { riskScore: 45, condition: 80, status: 'open' } },
        log: [logEntry('success', 12, 'NH-44 returned to monitored status. Risk re-scored MEDIUM (45/100). Drill complete.'), ...state.log].slice(0, 12),
      });
      break;
  }
}

function advance() {
  let nextDone = false;
  const next = (() => {
    const p = state.stepProgress + 0.01 * speed;
    const idx = state.stepIndex;
    if (p >= 1) {
      // Move to next step trigger
      if (idx < TOTAL_STEPS - 1) {
        return { stepIndex: idx + 1, stepProgress: 0, triggedIdx: idx };
      }
      return { stepIndex: TOTAL_STEPS - 1, stepProgress: 1, triggedIdx: idx };
    }
    return { stepIndex: idx, stepProgress: p, triggedIdx: null };
  })();

  if (next.triggedIdx !== null) {
    applyStepEffects(next.triggedIdx);
  }
  if (next.stepProgress >= 1 && next.stepIndex === TOTAL_STEPS - 1) {
    nextDone = true;
  }
  patch({ stepIndex: next.stepIndex, stepProgress: next.stepProgress });
  if (nextDone) stopTicking();
}

function startTicking() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    if (state.active && state.playing) advance();
  }, 120);
}
function stopTicking() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

// ---- Public actions ----
export const scenarioActions = {
  start() {
    state = {
      ...INITIAL_STATE,
      active: true,
      playing: true,
      startedAt: Date.now(),
      log: [logEntry('info', 0, 'Emergency drill started — drill feeds only; no live systems contacted.'), ...INITIAL_STATE.log],
    };
    emit();
    startTicking();
  },
  pause() {
    patch({ playing: false });
    stopTicking();
  },
  play() {
    if (!state.active) return scenarioActions.start();
    if (state.finished || state.stepIndex >= TOTAL_STEPS) {
      scenarioActions.reset();
      return scenarioActions.start();
    }
    patch({ playing: true });
    startTicking();
  },
  reset() {
    stopTicking();
    state = { ...INITIAL_STATE };
    emit();
  },
  setSpeed(v: number) {
    speed = v;
  },
  seekToStep(idx: number) {
    if (idx < 0 || idx >= TOTAL_STEPS) return;
    if (!state.active) {
      state = { ...INITIAL_STATE, active: true, playing: false, stepIndex: idx, startedAt: Date.now() };
    } else {
      patch({ stepIndex: idx, stepProgress: 0, playing: false });
    }
    stopTicking();
  },
  /** Called by the Field Reports module when a report is actually submitted during an active scenario. */
  markFieldReportSubmitted(reportId: string) {
    if (!state.active) return;
    patch({
      log: [
        logEntry('field', 9, `Field officer report ${reportId} captured (photo + GPS) and queued offline.`),
        ...state.log,
      ].slice(0, 12),
    });
  },
  markFieldReportSynced(reportId: string) {
    if (!state.active) return;
    patch({
      log: [
        logEntry('success', 10, `Report ${reportId} synced to control room (auto-upload on reconnect).`),
        ...state.log,
      ].slice(0, 12),
    });
  },
};

function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
function getSnapshot(): ScenarioState {
  return state;
}

// ---- React bridge ----
export function useScenario(): {
  scenario: ScenarioState;
  actions: typeof scenarioActions;
} {
  const scenario = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { scenario, actions: scenarioActions };
}

// ---- Read helpers used by existing screens (data-layer only) ----
export function getRoadSegments(): RoadSegment[] {
  if (!state.active) return ROAD_SEGMENTS;
  return ROAD_SEGMENTS.map((s) =>
    state.segmentOverrides[s.id] ? { ...s, ...state.segmentOverrides[s.id] } : s
  );
}

export function getVehicles(): Vehicle[] {
  if (!state.active && Object.keys(state.vehicleOverrides).length === 0) return VEHICLES;
  return VEHICLES.map((v) =>
    state.vehicleOverrides[v.id] ? { ...v, ...state.vehicleOverrides[v.id] } : v
  );
}

export function updateVehicleTrip(vehicleId: string, origin: string, destination: string, routeName?: string) {
  patch({
    vehicleOverrides: {
      ...state.vehicleOverrides,
      [vehicleId]: {
        ...(state.vehicleOverrides[vehicleId] ?? {}),
        origin,
        destination,
        ...(routeName ? { route: routeName } : {}),
      },
    },
  });
}

export function applyScenarioWeather(base: WeatherData[]): WeatherData[] {
  if (!state.active) return base;
  return base.map((w) =>
    state.weatherOverrides[w.district] ? { ...w, ...state.weatherOverrides[w.district] } : w
  );
}

export function scenarioActive(): boolean {
  return state.active;
}
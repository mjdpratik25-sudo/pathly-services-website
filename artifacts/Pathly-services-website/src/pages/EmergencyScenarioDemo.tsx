// ============================================================
// Emergency Scenario Drill: Monsoon Disruption Exercise
// Playback controls replay INITIAL_DISRUPTION_EVENTS on a live
// timeline. Incidents follow their outcome profile (some clear on
// schedule, one is delayed, one escalates, one stays held, one
// reopens, one detour is rejected) while the map, fleet, and
// command board update in lock-step with the varied statuses.
// Blocked incidents FREEZE at the exact clearance fraction reached
// when they get stuck and only an explicit action (Rectify &
// Resume Clearance) releases them. While a blocker is unaddressed
// the drill HALTS and waits — autoplay/Forward never silently
// glide the scenario clock past it; the presenter must decide
// (Rectify / Contact / Skip) or confirm "Proceed — Skip for Now".
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Gauge,
  Radio,
  ShieldAlert,
  Truck,
  Package,
  Timer,
  Mountain,
  Waves,
  Construction,
  Layers,
  Car,
  Ban,
  CloudRain,
  Activity,
} from 'lucide-react';
import {
  INITIAL_DISRUPTION_EVENTS,
  ROAD_SEGMENTS,
  VEHICLES,
  INITIAL_FIELD_REPORTS,
  type DisruptionEvent,
  type LogisticsAlert,
  type AlertCategory,
  type AlertSeverity,
  type NERState,
} from '../data/nerData';
import TacticalNERMap from '../components/maps/TacticalNERMap';
import { useVehicleTracking } from '../hooks/useVehicleTracking';
import { drillStageFor as stageFor, LOCKED_STAGES, RESUME_THRESHOLD, nextUnaddressedGate, hasBlockedOutcome } from '../lib/drillStageMachine';
import { requireAuthAction } from '../lib/authGate';

type ScenarioStage =
  | 'pending'
  | 'active'
  | 'clearing'
  | 'delayed'
  | 'escalated'
  | 'reroute'
  | 'unresolved'
  | 'reopened'
  | 'resolved';

interface DisruptionStage {
  event: DisruptionEvent;
  stage: ScenarioStage;
  localFraction: number; // 0..1 within the event's own clearance window
}

const TICK_MS = 120;
const BASE_TICK = 0.0006;
const SPEEDS = [1, 2, 4, 8];

const ROAD_MAP = new Map(ROAD_SEGMENTS.map((r) => [r.id, r]));
const TOTAL_HOURS = INITIAL_DISRUPTION_EVENTS.reduce((s, e) => s + e.estimatedClearTimeHours, 0);

// Event boundaries = start fraction of the whole scenario timeline
const BOUNDARIES = (() => {
  let acc = 0;
  return INITIAL_DISRUPTION_EVENTS.map((e) => {
    const start = acc;
    acc += e.estimatedClearTimeHours;
    return { start, end: acc, width: e.estimatedClearTimeHours };
  });
})();

const CAUSE_META: Record<DisruptionEvent['cause'], { icon: React.ReactNode; label: string; color: string; category: AlertCategory }> = {
  landslide: { icon: <Mountain size={14} />, label: 'Landslide', color: '#b45309', category: 'landslide' },
  flood: { icon: <Waves size={14} />, label: 'River Flood', color: '#2563eb', category: 'flood' },
  bridge_damage: { icon: <Construction size={14} />, label: 'Bridge Damage', color: '#9333ea', category: 'bridge_closure' },
  road_subsidence: { icon: <Layers size={14} />, label: 'Road Subsidence', color: '#dc2626', category: 'road_damage' },
  accident: { icon: <Car size={14} />, label: 'Accident', color: '#f59e0b', category: 'accident' },
  blockade: { icon: <Ban size={14} />, label: 'Blockade', color: '#e11d48', category: 'traffic' },
  weather: { icon: <CloudRain size={14} />, label: 'Weather', color: '#0891b2', category: 'weather' },
};

const STAGE_STYLE: Record<ScenarioStage, { label: string; text: string; bg: string; border: string }> = {
  pending: { label: 'Pending', text: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-300' },
  active: { label: 'ACTIVE', text: 'text-red-700', bg: 'bg-red-100', border: 'border-red-500' },
  clearing: { label: 'Clearing', text: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-500' },
  delayed: { label: 'Clearance Delayed', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-500' },
  escalated: { label: 'Escalated', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-500' },
  reroute: { label: 'Route Rejected — Recalculating', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-500' },
  unresolved: { label: 'Pending', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-500' },
  reopened: { label: 'Reopened', text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-500' },
  resolved: { label: 'Resolved', text: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-500' },
};

// Outcome-aware stage machine lives in src/lib/drillStageMachine.ts (pure,
// unit-testable). Locked (blocked) stages are TERMINAL: the drill tick can
// never move their clearance fraction — only an explicit user action does.
// Below, the frozen value is captured once when an event first enters a
// blocked stage; the tick/update loop strictly reuses that capture and never
// recalculates the event's blocked progress.

const RECOVERY_META: Partial<Record<ScenarioStage, { reason: string; resumeLog: string }>> = {
  delayed: {
    reason: 'Continued rainfall is slowing debris removal on the flood corridor.',
    resumeLog: 'deployed the excavator fleet to the flood corridor',
  },
  escalated: {
    reason: 'Field re-inspection found additional structural damage on the affected structure.',
    resumeLog: 'mobilized a structural repair crew to the affected structure',
  },
  reroute: {
    reason: 'Back-to-back slides have closed the proposed diversion corridor.',
    resumeLog: 'recomputed the route along an open alternate corridor',
  },
  unresolved: {
    reason: 'No practical diversion exists — the corridor remains closed to all traffic.',
    resumeLog: 'redeployed clearance machinery to the slide zone',
  },
  reopened: {
    reason: 'Renewed water surge re-closed the corridor after a brief clearance.',
    resumeLog: 're-asserted the corridor after the surge receded',
  },
};

// WHY + actions for the pre-block phases (pending / active / clearing) of any
// event whose outcome will eventually lock it. On-schedule (clean) events keep
// their normal passive flow.
const PREVIEW_META: Partial<Record<ScenarioStage, { reason: string; resumeLog: string }>> = {
  pending: {
    reason: 'Disruption is queued ahead on the drill timeline — response assets are being pre-positioned.',
    resumeLog: 'pre-positioned response assets for the scheduled disruption',
  },
  active: {
    reason: 'Disruption is live on the corridor; field assessment is underway to refine the clearance estimate.',
    resumeLog: 'refined the clearance estimate from live field assessment',
  },
  clearing: {
    reason: 'Clearance is in progress, but below-surface damage may still surface — monitoring for a revised estimate.',
    resumeLog: 'intensified clearance monitoring on the corridor',
  },
};

// Field-team roster keyed by state (from existing field-report data) so
// "Contact Field Team" can name who is being contacted. Uncovered states fall
// back to a district-level dispatch placeholder.
const STATE_CONTACTS: Record<string, { officerName: string; officerId: string }> = Object.fromEntries(
  INITIAL_FIELD_REPORTS
    .filter((fr) => fr.officerName)
    .map((fr) => [fr.state, { officerName: fr.officerName, officerId: fr.officerId }])
);

export default function EmergencyScenarioDemo() {
  const { vehicles } = useVehicleTracking(5000);

  const [progress, setProgress] = useState(0);
  // Drill is manual-only: it sits idle/ready on load and never auto-plays,
  // even after revisiting or reloading. Playback starts only on an explicit
  // "Play Drill" click.
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const [rectifiedStart, setRectifiedStart] = useState<Record<string, { atProgress: number; fromLocal: number }>>({});
  const [contactedIds, setContactedIds] = useState<Record<string, boolean>>({});
  const [skippedIds, setSkippedIds] = useState<Record<string, boolean>>({});
  const [gateConfirmOpen, setGateConfirmOpen] = useState(false);
  // Holds the confirmation timestamp when "Contact Field Team" is clicked.
  const [contactOpen, setContactOpen] = useState<Record<string, string>>({});
  // Contact panel sub-actions: expanded expected-timeline and opened email draft.
  const [timelineOpen, setTimelineOpen] = useState<Record<string, boolean>>({});
  const [emailDrafted, setEmailDrafted] = useState<Record<string, boolean>>({});
  const prevStages = useRef<string>('');
  // TRUE FREEZE: the instant an event enters a locked (blocked) stage, its
  // clearance fraction is captured here and the tick/update loop below strictly
  // reuses it — blocked progress is never recalculated from the drill clock.
  const blockedCapture = useRef<Record<string, number>>({});

  const disruptions: DisruptionStage[] = useMemo(
    () =>
      INITIAL_DISRUPTION_EVENTS.map((event, i) => {
        const r = rectifiedStart[event.id];
        if (r) {
          // "Rectify & Resume Clearance": resume from the frozen point and keep
          // clearing as the drill advances — the event only reaches Resolved
          // through its own onward progress, never automatically.
          const b = BOUNDARIES[i];
          const resumed = Math.min(1, Math.max(0, r.fromLocal + ((progress - r.atProgress) * TOTAL_HOURS) / b.width));
          return { event, stage: resumed >= RESUME_THRESHOLD ? 'resolved' : 'clearing', localFraction: resumed };
        }
        const { stage, local } = stageFor(event, progress);
        if (LOCKED_STAGES.has(stage)) {
          if (blockedCapture.current[event.id] === undefined) {
            blockedCapture.current[event.id] = local;
          }
          return { event, stage, localFraction: blockedCapture.current[event.id] };
        }
        return { event, stage, localFraction: local };
      }),
    [progress, rectifiedStart]
  );

  // Skipped events sink to the bottom of the timeline as compact rows, but stay
  // counted in the stat cards — skipping is not resolving.
  const timeline = useMemo(
    () => [...disruptions].sort((a, b) => Number(skippedIds[a.event.id]) - Number(skippedIds[b.event.id])),
    [disruptions, skippedIds]
  );

  const stageKey = disruptions.map((d) => `${d.event.id}:${d.stage}`).join('|');

  // Scenario clock in hours, derived from clearance-window totals
  const elapsedHours = progress * TOTAL_HOURS;

  // PLAYBACK GATE — manual control for blocked events.
  // A blocker is any locked (Escalated / Clearance Delayed / Route Rejected /
  // Pending / Reopened) event the presenter has not yet addressed via
  // Rectify & Resume, Contact Field Team, or Skip for Now. While one is on
  // board, the drill halts and waits — the scenario clock never silently
  // advances past it.
  const addressedBlocks = useMemo(
    () =>
      Object.fromEntries(
        INITIAL_DISRUPTION_EVENTS.map((e) => [
          e.id,
          Boolean(rectifiedStart[e.id] || skippedIds[e.id] || contactedIds[e.id]),
        ])
      ) as Record<string, boolean>,
    [rectifiedStart, skippedIds, contactedIds]
  );

  const gateEvent = disruptions.find((d) => !addressedBlocks[d.event.id] && LOCKED_STAGES.has(d.stage));
  const gated = gateEvent !== undefined;

  // Live mirrors for the interval handler — it must never drive the clock
  // past a gate using stale render state.
  const actionsRef = useRef({ rectifiedStart, skippedIds, contactedIds });
  const gateEventRef = useRef<DisruptionStage | undefined>(undefined);
  useEffect(() => {
    actionsRef.current = { rectifiedStart, skippedIds, contactedIds };
  }, [rectifiedStart, skippedIds, contactedIds]);
  useEffect(() => {
    gateEventRef.current = gateEvent;
  }, [gateEvent]);
  const wasPlayingRef = useRef(false);

  // Autoplay halts exactly at a blocker and remembers it was playing, so an
  // action (Rectify / Contact / Skip) can fluidly resume the drill.
  useEffect(() => {
    if (gated && playing) {
      wasPlayingRef.current = true;
      setPlaying(false);
    }
  }, [gated, playing]);

  // Playback interval — clamped to stop exactly on the next unaddressed
  // blocker rather than silently carrying the drill past it.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      if (gateEventRef.current) return; // awaiting input — never auto-advance
      setProgress((p) => {
        let next = p + BASE_TICK * speed;
        if (next >= 1) next = 1;
        const gate = nextUnaddressedGate(
          p,
          (ev) => Boolean(actionsRef.current.rectifiedStart[ev.id] || actionsRef.current.skippedIds[ev.id] || actionsRef.current.contactedIds[ev.id])
        );
        if (gate && gate.progress < next) return gate.progress;
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, speed]);

  useEffect(() => {
    if (progress >= 1) setPlaying(false);
  }, [progress]);

  // Scenario log — append a line when an event crosses a stage boundary
  useEffect(() => {
    if (prevStages.current === stageKey) return;
    if (prevStages.current !== '') {
      const prevArr = prevStages.current.split('|');
      const curArr = stageKey.split('|');
      prevArr.forEach((p, i) => {
        if (p !== curArr[i]) {
          const id = p.split(':')[0];
          const cur = curArr[i].split(':')[1];
          const ev = INITIAL_DISRUPTION_EVENTS.find((e) => e.id === id);
          if (ev) {
            const line =
              cur === 'active'
                ? `${id} DISRUPTED : ${ev.routeName} (${ev.location})`
                : cur === 'clearing'
                  ? `${id} CLEARING : ${ev.routeName} — ${ev.detourDescription ?? 'reroute in effect'}`
                  : cur === 'delayed'
                    ? `${id} CLEARANCE DELAYED : ${ev.routeName} — window revised ${ev.estimatedClearTimeHours}h → ${ev.actualClearTimeHours ?? ev.estimatedClearTimeHours}h`
                    : cur === 'escalated'
                      ? `${id} ESCALATED : ${ev.routeName} — field report reclassifies as critical, route recompute`
                      : cur === 'reroute'
                        ? `${id} ROUTE RECALCULATING : ${ev.routeName} — previous reroute no longer viable`
                        : cur === 'unresolved'
                          ? `${id} ON HOLD : ${ev.routeName} — corridor closed, rerouting continues`
                          : cur === 'reopened'
                            ? `${id} REOPENED : ${ev.routeName} — re-closed by renewed surge after brief clearance`
                            : cur === 'resolved'
                              ? `${id} RESOLVED : ${ev.routeName} reopened to traffic`
                              : `${id} detected on watch (evaluating)`;
            setLog((l) => [line, ...l].slice(0, 8));
          }
        }
      });
    }
    prevStages.current = stageKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageKey]);

  const ON_BOARD = new Set<ScenarioStage>(['active', 'clearing', 'delayed', 'escalated', 'reroute', 'unresolved', 'reopened']);
  const onBoard = disruptions.filter((d) => ON_BOARD.has(d.stage));

  const activeCount = onBoard.length;
  const clearingCount = disruptions.filter((d) => d.stage === 'clearing' || d.stage === 'delayed').length;
  const resolvedCount = disruptions.filter((d) => d.stage === 'resolved').length;
  const openCases = disruptions.filter((d) => d.stage === 'unresolved' || d.stage === 'reopened').length;

  const affectedVehicleIds = new Set<string>(onBoard.flatMap((d) => d.event.affectedVehicleIds));
  const scenarioVehicles = VEHICLES.filter(
    (v) => affectedVehicleIds.has(v.id) || resolvedCount === disruptions.length
  );

  const cargoOnHold = Array.from(new Set(onBoard.flatMap((d) => d.event.impactCargoTypes)));

  const maxReopenHours = Math.max(0, ...onBoard.map((d) => d.event.estimatedClearTimeHours));

  const severityFor = (d: DisruptionStage): AlertSeverity =>
    d.stage === 'escalated' || d.stage === 'reroute' || d.stage === 'reopened'
      ? 'critical'
      : d.event.severity;

  const scenarioAlerts: LogisticsAlert[] = onBoard.flatMap((d) => {
    const seg = ROAD_MAP.get(d.event.roadSegmentIds[0]);
    const lat = seg ? (seg.fromLat + seg.toLat) / 2 : 26.0;
    const lng = seg ? (seg.fromLng + seg.toLng) / 2 : 92.0;
    const base: LogisticsAlert = {
      id: `SCN-${d.event.id}`,
      category: CAUSE_META[d.event.cause].category,
      severity: severityFor(d),
      title: d.event.routeName,
      description: `${d.event.location} · ${d.event.detourDescription ?? ''}`,
      location: d.event.location,
      district: d.event.location,
      state: d.event.state as NERState,
      lat,
      lng,
      reportedAt: d.event.startedAt,
      reportedBy: 'Drill Control',
      affectedRoutes: [d.event.routeName],
      estimatedClearTime: `${d.event.estimatedClearTimeHours}h`,
      isActive: d.stage === 'active',
      acknowledged: false,
    };
    const followUp: LogisticsAlert | null =
      d.stage === 'escalated'
        ? { ...base, id: `SCN-${d.event.id}-B`, title: `${d.event.routeName} — reclassified critical`, description: 'Follow-up field report: severity escalated, route recompute in progress' }
        : d.stage === 'reroute'
          ? { ...base, id: `SCN-${d.event.id}-B`, title: `${d.event.routeName} — driver mode reroute`, description: 'Previous reroute no longer viable, recalculating alternate corridor' }
          : d.stage === 'reopened'
            ? { ...base, id: `SCN-${d.event.id}-B`, title: `${d.event.routeName} — renewed disruption`, description: 'Corridor re-closed after renewed water surge; divert traffic' }
            : null;
    return followUp ? [base, followUp] : [base];
  });

  const stepForward = () => {
    if (!requireAuthAction('Emergency Drill')) return;
    // Forward becomes "Next Event" while a blocker awaits a decision.
    if (gateEvent) {
      setGateConfirmOpen(true);
      return;
    }
    setPlaying(false);
    setProgress((p) => {
      const nextBoundary = BOUNDARIES.map((b) => b.start / TOTAL_HOURS).find((b) => b > p + 0.001);
      let dest = nextBoundary !== undefined ? Math.min(1, nextBoundary + 0.001) : Math.min(1, p + 0.12);
      const gate = nextUnaddressedGate(
        p,
        (ev) => Boolean(rectifiedStart[ev.id] || skippedIds[ev.id] || contactedIds[ev.id])
      );
      if (gate && gate.progress < dest) dest = gate.progress; // stop exactly on the blocker
      return dest;
    });
  };

  const stepBackward = () => {
    if (!requireAuthAction('Emergency Drill')) return;
    setPlaying(false);
    setProgress((p) => {
      const boundaries = BOUNDARIES.map((b) => b.start / TOTAL_HOURS).filter((b) => b < p - 0.001);
      return boundaries.length ? boundaries[boundaries.length - 1] : 0;
    });
  };

  const restart = () => {
    if (!requireAuthAction('Emergency Drill')) return;
    setPlaying(false);
    setLog([]);
    setRectifiedStart({});
    setContactedIds({});
    setSkippedIds({});
    setGateConfirmOpen(false);
    setContactOpen({});
    setTimelineOpen({});
    setEmailDrafted({});
    wasPlayingRef.current = false;
    blockedCapture.current = {};
    prevStages.current = '';
    setProgress(0);
  };

  // Who "Contact Field Team" reaches for a given event's state (fallback to a
  // district dispatch placeholder when no officer is on record for its state).
  const contactFor = (d: DisruptionStage) => {
    const known = STATE_CONTACTS[d.event.state];
    return known ?? { officerName: `Regional Field Response Team — ${d.event.state}`, officerId: 'RFRT-DISPATCH' };
  };

  // Official-looking field-officer address derived from the roster (department
  // domain, not personal); dispatch fallback uses a shared ops mailbox.
  const officerEmail = (c: { officerName: string; officerId: string }): string =>
    c.officerId === 'RFRT-DISPATCH'
      ? 'dispatch@ner.morth.gov.in'
      : `${c.officerName.toLowerCase().replace(/[^a-z]+/g, '.').replace(/(^\.|\.$)/g, '')}@ner.morth.gov.in`;

  // Effective clearance window + remaining hours derived from the SAME window
  // figures already rendered on the card header ("Clearance: Xh → Yh").
  const expectedClearance = (d: DisruptionStage) => {
    const window = d.event.actualClearTimeHours ?? d.event.estimatedClearTimeHours;
    return { window, remaining: Math.max(1, Math.round(window * (1 - d.localFraction))) };
  };

  // Addressing a blocker (Rectify / Contact / Skip from the card) releases the
  // gate; if the drill was auto-playing before it halted, playback resumes.
  const releaseGate = () => {
    setGateConfirmOpen(false);
    const resumed = wasPlayingRef.current;
    wasPlayingRef.current = false;
    if (resumed && progress < 1) setPlaying(true);
  };

  // Explicit "proceed without resolving": apply Skip for Now and continue.
  const skipAndContinue = (d: DisruptionStage) => {
    if (!requireAuthAction('Emergency Drill')) return;
    setSkippedIds((r) => ({ ...r, [d.event.id]: true }));
    setLog((l) => [`${d.event.id} SKIPPED : deprioritized for now — status retained`, ...l].slice(0, 8));
    setGateConfirmOpen(false);
    wasPlayingRef.current = false;
    if (progress < 1) setPlaying(true);
  };

  const stageCardStyle = (d: DisruptionStage) => {
    const s = STAGE_STYLE[d.stage];
    const meta = CAUSE_META[d.event.cause];
    // WHY + actions render on every non-Resolved state. Locked stages use their
    // dedicated reason; pre-block phases (pending/active/clearing) use PREVIEW_META
    // but only for events with a blocked outcome — clean on-schedule events flow
    // through without a recovery deck.
    const recovery =
      RECOVERY_META[d.stage] ?? (hasBlockedOutcome(d.event) ? PREVIEW_META[d.stage] : undefined);
    const isNow = d.stage === 'active';
    const sender = contactFor(d);
    const email = officerEmail(sender);
    const clearance = expectedClearance(d);

    if (skippedIds[d.event.id]) {
      return (
        <div key={d.event.id} className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 opacity-80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-7 h-7 rounded flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: meta.color }}
              >
                {meta.icon}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#0B3D6D] truncate">{d.event.routeName}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  Skipped for now · {meta.label} — status retained
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${s.text} ${s.bg} ${s.border}`}>
                {s.label}
              </span>
              <span className="text-[10px] font-mono text-slate-500">{Math.round(d.localFraction * 100)}%</span>
              <button
                type="button"
                onClick={() => setSkippedIds((r) => ({ ...r, [d.event.id]: false }))}
                className="text-[10px] font-bold px-2 py-1 rounded border border-[#0B3D6D] bg-white text-[#0B3D6D] hover:bg-slate-50"
              >
                Return to event
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div
        key={d.event.id}
        className={`rounded-xl border ${isNow ? 'ring-2 ring-red-300 ' + STAGE_STYLE.active.border : 'border-slate-200'} ${s.bg} p-3 transition-all duration-300`}
      >
        <div className="flex items-center center-between gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: meta.color }}
            >
              {meta.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#0B3D6D] truncate">{d.event.routeName}</p>
              <p className="text-[10px] text-slate-500 font-mono truncate">
                {meta.label} · {d.event.state} · {d.event.location}
              </p>
            </div>
          </div>
          <span
            className={`flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded border ${s.text} ${s.bg} ${s.border}`}
          >
            {s.label}
          </span>
        </div>

        <div className="mt-2 h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              d.stage === 'resolved'
                ? 'bg-emerald-500'
                : d.stage === 'clearing'
                  ? 'bg-amber-500'
                  : d.stage === 'delayed'
                    ? 'bg-orange-500'
                    : d.stage === 'escalated'
                      ? 'bg-purple-500'
                      : d.stage === 'reroute'
                        ? 'bg-red-500'
                        : d.stage === 'reopened'
                          ? 'bg-rose-500'
                          : d.stage === 'unresolved'
                            ? 'bg-amber-400'
                            : d.stage === 'active'
                              ? 'bg-red-500'
                              : 'bg-slate-400'
            }`}
            style={{ width: `${Math.round(d.localFraction * 100)}%` }}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-600">
          <span>
            {d.stage === 'delayed'
              ? `Clearance: ${d.event.estimatedClearTimeHours}h → ${d.event.actualClearTimeHours ?? d.event.estimatedClearTimeHours}h`
              : `Clearance: ${d.event.estimatedClearTimeHours}h · delay +${d.event.impactDelayMinutes}min`}
          </span>
          <span>{Math.round(d.localFraction * 100)}%</span>
        </div>

        {ON_BOARD.has(d.stage) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {d.event.affectedVehicleIds.slice(0, 2).map((vid) => (
              <span key={vid} className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-white rounded px-1.5 py-0.5 border border-red-200">
                <Truck size={10} />
                {vid}
              </span>
            ))}
            {d.event.impactCargoTypes.slice(0, 2).map((c) => (
              <span key={c} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white rounded px-1.5 py-0.5 border border-slate-200">
                <Package size={10} />
                {c.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
        {d.stage === 'escalated' && (
          <p className="mt-1.5 text-[10px] font-mono text-purple-700">Reclassified critical · route recompute in progress</p>
        )}
        {d.stage === 'reroute' && (
          <p className="mt-1.5 text-[10px] font-mono text-red-700">Previous reroute no longer viable · recalculating</p>
        )}
        {d.stage === 'unresolved' && (
          <p className="mt-1.5 text-[10px] font-mono text-amber-700">Corridor closed · rerouting continues</p>
        )}
        {d.stage === 'reopened' && (
          <p className="mt-1.5 text-[10px] font-mono text-rose-700">Re-closed after brief clearance · renewed surge</p>
        )}
        {d.stage === 'delayed' && (
          <p className="mt-1.5 text-[10px] font-mono text-orange-700">Clearance window extended by field assessment</p>
        )}
        {recovery && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
            <p className="text-[10px] leading-relaxed text-slate-600">
              <span className="font-bold uppercase tracking-wide text-slate-500">Why: </span>
              {recovery.reason}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={rectifiedStart[d.event.id] !== undefined}
                onClick={() => {
                  if (rectifiedStart[d.event.id] !== undefined) return;
                  setRectifiedStart((r) => ({
                    ...r,
                    [d.event.id]: { atProgress: progress, fromLocal: d.localFraction },
                  }));
                  setLog((l) => [`${d.event.id} RECTIFIED : clearance resumed — ${recovery.resumeLog}`, ...l].slice(0, 8));
                  releaseGate();
                }}
                className={`text-[10px] font-bold whitespace-nowrap px-2 py-1 rounded border transition-colors ${
                  rectifiedStart[d.event.id] !== undefined
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 cursor-default'
                    : 'border-[#0B3D6D] bg-[#0B3D6D] text-white hover:bg-[#0B3D6D]/90'
                }`}
              >
                {rectifiedStart[d.event.id] !== undefined ? 'Clearance resumed' : 'Rectify & Resume Clearance'}
              </button>
              <button
                type="button"
                disabled={contactedIds[d.event.id]}
                onClick={() => {
                  if (contactedIds[d.event.id]) return;
                  setContactedIds((c) => ({ ...c, [d.event.id]: true }));
                  setContactOpen((o) => ({
                    ...o,
                    [d.event.id]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  }));
                  setLog((l) => [`${d.event.id} FIELD CONTACT : advance survey requested on ${d.event.routeName}`, ...l].slice(0, 8));
                  releaseGate();
                }}
                className={`text-[10px] font-bold whitespace-nowrap px-2 py-1 rounded border transition-colors ${
                  contactedIds[d.event.id]
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 cursor-default'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {contactedIds[d.event.id] ? 'Field team notified' : 'Contact Field Team'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSkippedIds((r) => ({ ...r, [d.event.id]: true }));
                  setLog((l) => [`${d.event.id} SKIPPED : deprioritized for now — status retained`, ...l].slice(0, 8));
                  releaseGate();
                }}
                className="text-[10px] font-bold whitespace-nowrap px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              >
                Skip for Now
              </button>
            </div>
            {contactOpen[d.event.id] && (
              <div className="rounded-lg border border-[#0B3D6D]/20 bg-[#0B3D6D]/5 p-2.5 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#0B3D6D] flex items-center gap-1">
                  <Radio size={11} /> Contact Confirmed
                </p>
                <p className="text-[11px] text-slate-700">
                  <span className="font-bold">{sender.officerName}</span>
                  {sender.officerId !== 'RFRT-DISPATCH' && (
                    <span className="font-mono text-[10px] text-slate-500"> · {sender.officerId}</span>
                  )}
                  <span className="text-[10px] text-slate-500"> · {d.event.state}</span>
                  <span className="font-mono text-[10px] text-[#0B3D6D]"> · {email}</span>
                </p>
                <p className="text-[10px] font-mono text-slate-600">
                  Expected clearance: ~{clearance.remaining}h remaining (
                  {d.event.actualClearTimeHours != null ? 'revised estimate after field contact' : 'current estimate'})
                </p>
                {LOCKED_STAGES.has(d.stage) && (
                  <p className="text-[10px] leading-relaxed text-slate-600">
                    <span className="font-bold text-slate-500">Still blocked: </span>
                    {recovery?.reason}
                  </p>
                )}
                <p className="text-[10px] font-mono text-emerald-700">
                  ✓ Field team notified · {contactOpen[d.event.id]}
                </p>
                {timelineOpen[d.event.id] && (
                  <div className="rounded border border-[#0B3D6D]/15 bg-white/70 p-2 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Expected Timeline</p>
                    <p className="text-[10px] font-mono text-slate-600">
                      Original estimate: {d.event.estimatedClearTimeHours}h window
                    </p>
                    <p className="text-[10px] font-mono text-slate-600">
                      Revised estimate: {clearance.window}h
                      {d.event.actualClearTimeHours != null
                        ? ` (+${d.event.actualClearTimeHours - d.event.estimatedClearTimeHours}h)`
                        : ' (unchanged)'}
                    </p>
                    <p className="text-[10px] font-mono text-slate-600">
                      Reason for revision:
                      {d.event.actualClearTimeHours != null
                        ? ' clearance window extended by live field assessment'
                        : ' no revision on record'}
                    </p>
                  </div>
                )}
                {emailDrafted[d.event.id] && (
                  <p className="text-[10px] font-mono text-emerald-700">✓ Draft opened · {email}</p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTimelineOpen((o) => ({ ...o, [d.event.id]: !o[d.event.id] }))}
                    className={`text-[10px] font-bold whitespace-nowrap px-2 py-1 rounded border transition-colors ${
                      timelineOpen[d.event.id]
                        ? 'border-[#0B3D6D]/40 bg-[#0B3D6D]/10 text-[#0B3D6D]'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {timelineOpen[d.event.id] ? 'Hide Expected Timeline' : 'View Expected Timeline'}
                  </button>
                  <a
                    href={`mailto:${email}?subject=${encodeURIComponent(
                      `[NER Drill] ${d.event.id} · ${d.event.routeName} clearance`
                    )}&body=${encodeURIComponent(
                      `${d.event.id} ${d.event.routeName} (${d.event.state})\nStatus: ${d.stage}\nExpected clearance: ~${clearance.remaining}h remaining\n${recovery?.reason ?? ''}`
                    )}`}
                    onClick={() => setEmailDrafted((s) => ({ ...s, [d.event.id]: true }))}
                    className="text-[10px] font-bold whitespace-nowrap px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  >
                    Email Field Officer
                  </a>
                  <button
                    type="button"
                    onClick={() => setContactOpen((o) => ({ ...o, [d.event.id]: '' }))}
                    className="text-[10px] font-bold whitespace-nowrap px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {gateConfirmOpen && gateEvent?.event.id === d.event.id && (
          <div className="mt-2 rounded-lg border border-amber-400 bg-amber-50 p-2.5 space-y-2">
            <p className="text-[10px] leading-relaxed text-amber-900">
              This event needs your input before continuing — Rectify, Contact Field Team, or Skip for Now.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => skipAndContinue(d)}
                className="text-[10px] font-bold whitespace-nowrap px-2 py-1 rounded border border-amber-500 bg-amber-100 text-amber-900 hover:bg-amber-200"
              >
                Proceed — Skip for Now &amp; continue
              </button>
              <button
                type="button"
                onClick={() => setGateConfirmOpen(false)}
                className="text-[10px] font-bold whitespace-nowrap px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              >
                Stay
              </button>
            </div>
          </div>
        )}
        {d.stage === 'resolved' && (
          <p className="mt-1.5 text-[10px] text-emerald-700 font-mono">✓ Corridor restored to service</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="gov-panel">
        <div className="gov-panel-head flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-[#FF9933]" />
            <span className="text-sm font-bold text-[#0B3D6D]">Emergency Scenario Drill — Monsoon Disruption Exercise</span>
          </div>
          <span className="text-[10px] text-slate-500 font-normal normal-case flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-100 border border-amber-600 text-amber-800">
              DRILL DRIVE
            </span>
            Replays recorded disruption events with live fleet &amp; map response
          </span>
        </div>
      </div>

      {/* Impact summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="gov-panel p-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            <ShieldAlert size={13} className="text-red-600" /> Active Disruptions
          </div>
          <p className="text-2xl font-black text-[#0B3D6D] mt-1">{activeCount}</p>
          <span className="text-[10px] text-slate-500 font-mono">{clearingCount} clearing · {resolvedCount} resolved · {openCases} pending</span>
        </div>
        <div className="gov-panel p-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            <Truck size={13} className="text-amber-600" /> Fleet on Corridor
          </div>
          <p className="text-2xl font-black text-[#0B3D6D] mt-1">{scenarioVehicles.length}</p>
          <span className="text-[10px] text-slate-500 font-mono">rerouted / holding</span>
        </div>
        <div className="gov-panel p-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            <Package size={13} className="text-blue-600" /> Cargo on Hold
          </div>
          <p className="text-2xl font-black text-[#0B3D6D] mt-1">{cargoOnHold.length}</p>
          <span className="text-[10px] text-slate-500 font-mono">commodity classes</span>
        </div>
        <div className="gov-panel p-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            <Timer size={13} className="text-purple-600" /> Max Reopen ETA
          </div>
          <p className="text-2xl font-black text-[#0B3D6D] mt-1">{maxReopenHours}h</p>
          <span className="text-[10px] text-slate-500 font-mono">longest closure</span>
        </div>
        <div className="gov-panel p-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            <Gauge size={13} className="text-emerald-600" /> Scenario Clock
          </div>
          <p className="text-2xl font-black text-[#0B3D6D] mt-1 font-mono">T+{elapsedHours.toFixed(0)}h</p>
          <span className="text-[10px] text-slate-500 font-mono">of {TOTAL_HOURS}h window</span>
        </div>
      </div>

      {/* Playback control deck */}
      <div className="gov-panel p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={restart}
            className="h-9 px-3 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-1.5"
            title="Restart drill"
          >
            <RotateCcw size={13} /> Restart
          </button>
          <button
            type="button"
            onClick={stepBackward}
            className="h-9 px-3 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-1.5"
            title="Step back"
          >
            <SkipBack size={13} /> <span className="hidden sm:inline">Back</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!requireAuthAction('Emergency Drill')) return;
              if (progress >= 1) {
                restart();
                setPlaying(true);
              } else if (gated) {
                setGateConfirmOpen(true);
              } else {
                setPlaying((p) => !p);
              }
            }}
            className={`h-9 px-4 rounded text-[11px] font-black flex items-center gap-1.5 border ${
              playing
                ? 'bg-amber-100 border-amber-500 text-amber-800 hover:bg-amber-200'
                : 'bg-red-600 border-red-700 text-white hover:bg-red-700'
            }`}
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            {playing ? 'Pause Drill' : progress >= 1 ? 'Replay' : 'Play Drill'}
          </button>
          {gated && gateEvent && (
            <button
              type="button"
              onClick={() => {
                if (!requireAuthAction('Emergency Drill')) return;
                setGateConfirmOpen(true);
              }}
              className="h-9 px-3 rounded border border-amber-400 bg-amber-50 text-amber-800 text-[10px] font-bold flex items-center gap-1.5 max-w-[260px]"
              title="This event needs your decision before the drill continues"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              <span className="truncate">Awaiting input on {gateEvent.event.routeName}</span>
            </button>
          )}
          <button
            type="button"
            onClick={stepForward}
            className="h-9 px-3 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-1.5"
            title={gated ? 'Next event — requires a decision first' : 'Step forward'}
          >
            <span className="hidden sm:inline">{gated ? 'Next Event' : 'Forward'}</span> <SkipForward size={13} />
          </button>

          <div className="flex items-center gap-1 ml-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Speed</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (!requireAuthAction('Emergency Drill')) return;
                  setSpeed(s);
                }}
                className={`h-8 px-2.5 rounded border text-[11px] font-bold ${
                  speed === s
                    ? 'bg-[#0B3D6D] border-[#0B3D6D] text-white'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[200px] ml-auto">
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(progress * 1000)}
              onChange={(e) => {
                if (!requireAuthAction('Emergency Drill')) return;
                setPlaying(false);
                setProgress(Number(e.target.value) / 1000);
              }}
              className="w-full accent-[#0B3D6D]"
              aria-label="Scenario timeline position"
            />
            <span className="text-[10px] font-mono text-slate-500 w-14 text-right">{Math.round(progress * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Main grid: timeline + map */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Timeline */}
        <div className="gov-panel p-3 space-y-2.5 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B3D6D]">Scenario Timeline — {INITIAL_DISRUPTION_EVENTS.length} events</h3>
            <span className="text-[10px] font-mono text-slate-500">{TOTAL_HOURS}h drill window</span>
          </div>
          {timeline.map(stageCardStyle)}

          {/* Live action log */}
          <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-500">
              <Activity size={12} className="text-red-500" /> Command Board / Action Log
            </div>
            <div className="mt-1.5 font-mono text-[10px] space-y-1">
              {log.length === 0 && (
                <p className="text-slate-400">Awaiting first disruption signal — press Play to begin the drill.</p>
              )}
              {log.map((line, i) => (
                <p
                  key={i}
                  className={
                    line.includes('RESOLVED')
                      ? 'text-emerald-700'
                      : line.includes('CLEARING') || line.includes('DELAYED')
                        ? 'text-amber-700'
                        : line.includes('REOPENED') || line.includes('ESCALATED') || line.includes('RECALCULATING')
                          ? 'text-purple-700'
                          : line.includes('DISRUPTED') || line.includes('ON HOLD')
                            ? 'text-red-700'
                            : 'text-slate-600'
                  }
                >
                  › {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Live scenario map */}
        <div className="gov-panel p-3 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#0B3D6D]">Regional Response Map</h3>
            <span className="text-[10px] font-mono text-slate-500">
              {scenarioAlerts.length} active alert(s) · {scenarioVehicles.length} vehicle(s)
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <TacticalNERMap
              vehicles={scenarioVehicles}
              alerts={scenarioAlerts}
              showRoads
              showAlerts
              showVehicles
              height="560px"
              zoomLevel={6}
              centerPos={[25.6, 92.5]}
              stateFilter="ALL"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
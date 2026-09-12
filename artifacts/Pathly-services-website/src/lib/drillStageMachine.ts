// ============================================================
// drillStageMachine: pure scenario-drill stage logic.
//
// Incident outcomes drive a deterministic stage + clearance
// fraction per event. Non-clean (blocked) stages — Clearance
// Delayed, Escalated, Route Rejected, still Pending, Reopened —
// are TERMINAL: once an event enters one, the chain never
// advances on its own. The clearance fraction is pinned (frozen)
// at the exact value reached on entry and no tick/clock can move
// it. Only an explicit user action (Rectify & Resume Clearance)
// replaces the lock and resumes progression from that frozen value.
// ============================================================

import { INITIAL_DISRUPTION_EVENTS, type DisruptionEvent } from '../data/nerData';

export type DrillStage =
  | 'pending'
  | 'active'
  | 'clearing'
  | 'delayed'
  | 'escalated'
  | 'reroute'
  | 'unresolved'
  | 'reopened'
  | 'resolved';

type StageStep = { stage: DrillStage; to: number };

export const TOTAL_HOURS = INITIAL_DISRUPTION_EVENTS.reduce((s, e) => s + e.estimatedClearTimeHours, 0);

export const DRILL_BOUNDARIES = (() => {
  let acc = 0;
  return INITIAL_DISRUPTION_EVENTS.map((e) => {
    const start = acc;
    acc += e.estimatedClearTimeHours;
    return { start, end: acc, width: e.estimatedClearTimeHours };
  });
})();

/** Fraction at which a resumed ("Rectify & Resume") event clears. */
export const RESUME_THRESHOLD = 0.7;

/** Stages that lock clearance progress until a user acts. */
export const LOCKED_STAGES: ReadonlySet<DrillStage> = new Set([
  'delayed',
  'escalated',
  'reroute',
  'unresolved',
  'reopened',
]);

// Blocked chains TERMINATE at the locked stage (to: 1) — they never
// auto-transition into clearing/resolved.
const STAGE_CHAINS: Record<NonNullable<DisruptionEvent['outcome']>, StageStep[]> = {
  on_time: [
    { stage: 'active', to: 0.35 },
    { stage: 'clearing', to: 0.7 },
    { stage: 'resolved', to: 1 },
  ],
  delayed: [
    { stage: 'active', to: 0.35 },
    { stage: 'clearing', to: 0.5 },
    { stage: 'delayed', to: 1 },
  ],
  escalated: [{ stage: 'active', to: 0.4 }, { stage: 'escalated', to: 1 }],
  reroute_failed: [
    { stage: 'active', to: 0.35 },
    { stage: 'clearing', to: 0.45 },
    { stage: 'reroute', to: 1 },
  ],
  reopened: [
    { stage: 'active', to: 0.35 },
    { stage: 'clearing', to: 0.7 },
    { stage: 'resolved', to: 0.85 },
    { stage: 'reopened', to: 1 },
  ],
  unresolved: [{ stage: 'active', to: 0.35 }, { stage: 'unresolved', to: 1 }],
};

// Frozen value at the moment each blocked stage is entered.
const FROZEN_STAGE_AT: Partial<Record<DrillStage, number>> = {
  delayed: 0.5,
  escalated: 0.4,
  reroute: 0.45,
  unresolved: 0.35,
  reopened: 0.85,
};

export function drillStageFor(event: DisruptionEvent, progress: number): { stage: DrillStage; local: number } {
  const b = DRILL_BOUNDARIES[INITIAL_DISRUPTION_EVENTS.indexOf(event)];
  const l = (progress * TOTAL_HOURS - b.start) / b.width;
  if (l <= 0) return { stage: 'pending', local: 0 };
  const local = Math.min(1, Math.max(0, l));
  const chain = STAGE_CHAINS[event.outcome ?? 'on_time'];
  for (const step of chain) {
    if (local <= step.to) {
      const freeze = FROZEN_STAGE_AT[step.stage];
      return { stage: step.stage, local: freeze !== undefined ? freeze : local };
    }
  }
  return { stage: 'resolved', local: 1 };
}

/**
 * Drill-clock progress at which an event first enters its terminal locked
 * stage. StageFor uses inclusive bounds (`local <= step.to`), so an event is
 * still in its pre-lock stage at the exact freeze value — the gate is placed
 * a hair PAST the boundary so the event is already locked when the drill
 * reaches it. The displayed fraction stays pinned to the frozen value.
 */
export function blockedEntryProgress(event: DisruptionEvent): number {
  const chain = STAGE_CHAINS[event.outcome ?? 'on_time'];
  const lockedIdx = chain.findIndex((step) => LOCKED_STAGES.has(step.stage));
  if (lockedIdx < 0) return Number.POSITIVE_INFINITY;
  const entryLocal = chain[lockedIdx - 1].to + 1e-7; // strictly past the inclusive boundary
  const b = DRILL_BOUNDARIES[INITIAL_DISRUPTION_EVENTS.indexOf(event)];
  return (b.start + entryLocal * b.width) / TOTAL_HOURS;
}

/** Whether an event will eventually enter a terminal locked (blocked) stage. */
export function hasBlockedOutcome(event: DisruptionEvent): boolean {
  return Number.isFinite(blockedEntryProgress(event));
}

/**
 * Playback Gate: the earliest locked (blocked) event at/after `atProgress`
 * that the presenter has not yet addressed. Returns `null` when nothing
 * blocks the drill — autoplay/Forward then advance freely. This is what
 * makes the drill WAIT for a decision instead of silently gliding past.
 */
export function nextUnaddressedGate(
  atProgress: number,
  isAddressed: (event: DisruptionEvent) => boolean
): { progress: number; event: DisruptionEvent } | null {
  let best: { progress: number; event: DisruptionEvent } | null = null;
  for (const ev of INITIAL_DISRUPTION_EVENTS) {
    if (isAddressed(ev)) continue;
    const entry = blockedEntryProgress(ev);
    if (!Number.isFinite(entry)) continue;
    if (entry + 1e-9 >= atProgress && (best === null || entry < best.progress)) {
      best = { progress: entry, event: ev };
    }
  }
  return best;
}
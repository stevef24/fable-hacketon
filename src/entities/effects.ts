// OWNER: P3 (Keith). The tuning table: what each obstacle does to the runner.
// Edit the numbers here and Vite hot-reloads them mid-run.
import type { Modifier, ObstacleKind, RunStats } from '../game/contract';
import { runner } from '../game/runner';

export interface Effect {
  /** Multiplied into BASE_SPEED while active. */
  multiplier: number;
  durationMs: number;
  /** Instant change to runner.distance in metres (negative = knocked back). */
  distance?: number;
  /** Motorbikes send you back to the last gate, per docs/reference/. */
  resetToGate?: boolean;
  /** Caption shown in the HUD on contact. */
  label: string;
  /** Green caption rather than red. Only the dog is good news. */
  good: boolean;
  /** Counter incremented on the results screen. */
  stat: keyof RunStats;
  /** Milliseconds the runner is stopped dead. Costs time, not distance. */
  holdMs?: number;
  /** What they say while they have hold of you. */
  line?: string;
}

/** Contact box, metres: half-depth along the road, half-width across it. */
export const HIT_DISTANCE = 1.5;
export const HIT_LATERAL = 1.6;

/** True when the runner overlaps an obstacle sitting at `dist` metres along the lap, `laneX` metres across. */
export function isHit(dist: number, laneX: number) {
  return (
    Math.abs(runner.distance - dist) < HIT_DISTANCE && Math.abs(runner.lateral - laneX) < HIT_LATERAL
  );
}

export const EFFECTS: Record<ObstacleKind, Effect> = {
  // Was a full reset to the last gate, which could erase 90 seconds and felt
  // like a punishment for existing. A rider clipping you should stagger you,
  // not delete your run: you get knocked back a few metres and lose your
  // footing for a beat. Still the harshest hit, still recoverable.
  motorbike: {
    multiplier: 0.42, durationMs: 1400, distance: -22, holdMs: 1200,
    label: 'Motorbike!', line: 'Watch out! \u0e23\u0e30\u0e27\u0e31\u0e07!',
    good: false, stat: 'motorbikeHits',
  },
  // The signature obstacle. Five full seconds of being talked at is the
  // single most expensive thing that can happen to a runner, and the funniest.
  massage: {
    multiplier: 0.55, durationMs: 1600, holdMs: 5000,
    label: 'Massage? Relax!', line: 'Thai massage, very good price, come come!',
    good: false, stat: 'massageDelays',
  },
  food: {
    multiplier: 0.6, durationMs: 2500, holdMs: 3000,
    label: 'Mango sticky rice!', line: 'Very fresh! You try one, yes?',
    good: false, stat: 'snacks',
  },
  dog: {
    multiplier: 1.55, durationMs: 3000,
    label: 'Soi dog chase!', good: true, stat: 'dogBoosts',
  },
  splash: {
    multiplier: 0.72, durationMs: 2200, holdMs: 900,
    label: 'Songkran splash!', line: 'Sawasdee pee mai!',
    good: false, stat: 'wetZones',
  },
};

let seq = 0;

/**
 * Apply an obstacle's effect to the runner. The instant distance change
 * always lands. The speed modifier REFRESHES an active one of the same kind
 * instead of stacking: five food vendors in a row would otherwise compound to
 * ×0.08 and pin the runner at MIN_SPEED, which is punishing rather than fun.
 */
export function applyEffect(kind: ObstacleKind, now = performance.now()): Modifier {
  const effect = EFFECTS[kind];
  if (effect.holdMs) {
    // Longest hold wins rather than summing: three massage ladies in a row
    // should be funny, not a thirty-second standstill.
    runner.heldMs = Math.max(runner.heldMs, effect.holdMs);
    runner.heldBy = effect.line ?? effect.label;
  }
  if (effect.resetToGate) {
    runner.distance = runner.lastGateDistance;
  } else if (effect.distance) {
    runner.distance = Math.max(runner.lastGateDistance, runner.distance + effect.distance);
  }

  const until = now + effect.durationMs;
  const active = runner.modifiers.find((m) => m.kind === kind);
  if (active) {
    active.until = until;
    active.multiplier = effect.multiplier;
    return active;
  }

  const modifier: Modifier = { id: `${kind}-${++seq}`, kind, multiplier: effect.multiplier, until };
  runner.modifiers.push(modifier);
  return modifier;
}

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
  motorbike: {
    multiplier: 0.5, durationMs: 900, resetToGate: true,
    label: 'Crash! Back to the last gate', good: false, stat: 'motorbikeHits',
  },
  massage: {
    multiplier: 0.5, durationMs: 1000, distance: -15,
    label: 'Massage? Relax!', good: false, stat: 'massageDelays',
  },
  food: {
    multiplier: 0.6, durationMs: 2500,
    label: 'Mango sticky rice!', good: false, stat: 'snacks',
  },
  dog: {
    multiplier: 1.55, durationMs: 3000,
    label: 'Soi dog chase!', good: true, stat: 'dogBoosts',
  },
  splash: {
    multiplier: 0.8, durationMs: 1500,
    label: 'Songkran splash!', good: false, stat: 'wetZones',
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

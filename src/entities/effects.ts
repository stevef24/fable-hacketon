// OWNER: P3 (Keith). The tuning table: what each obstacle does to the runner.
// Edit the numbers here and Vite hot-reloads them mid-run.
import type { Modifier, ObstacleKind } from '../game/contract';
import { runner } from '../game/runner';

export interface Effect {
  /** Multiplied into BASE_SPEED while active. */
  multiplier: number;
  durationMs: number;
  /** Instant change to runner.distance in metres (negative = knocked back). */
  distance?: number;
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
  motorbike: { multiplier: 0.45, durationMs: 1200, distance: -8 },
  massage: { multiplier: 0.5, durationMs: 1000, distance: -15 },
  food: { multiplier: 0.6, durationMs: 2500 },
  dog: { multiplier: 1.55, durationMs: 3000 },
  splash: { multiplier: 0.8, durationMs: 1500 },
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
  if (effect.distance) {
    runner.distance = Math.max(0, runner.distance + effect.distance);
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

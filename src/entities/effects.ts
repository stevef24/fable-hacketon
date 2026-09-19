// OWNER: P3 (Keith). What each obstacle does to you. Tune these numbers.
import type { ObstacleKind, Modifier, RunStats } from '../game/contract';
import { runner } from '../game/runner';

interface Effect {
  multiplier: number;
  durationMs: number;
  /** Motorbikes send you back to the last gate you passed. */
  resetToGate: boolean;
  label: string;
  good: boolean;
  stat: keyof RunStats | null;
}

export const EFFECTS: Record<ObstacleKind, Effect> = {
  motorbike: {
    multiplier: 0.5, durationMs: 900, resetToGate: true,
    label: 'Crash! Back to the last gate', good: false, stat: 'motorbikeHits',
  },
  dog: {
    multiplier: 1.55, durationMs: 3000, resetToGate: false,
    label: 'Soi dog chase!', good: true, stat: 'dogBoosts',
  },
  massage: {
    multiplier: 0.5, durationMs: 1400, resetToGate: false,
    label: 'Massage? Relax!', good: false, stat: 'massageDelays',
  },
  food: {
    multiplier: 0.6, durationMs: 2500, resetToGate: false,
    label: 'Mango sticky rice!', good: false, stat: 'snacks',
  },
  splash: {
    multiplier: 0.8, durationMs: 1500, resetToGate: false,
    label: 'Songkran splash!', good: false, stat: 'wetZones',
  },
};

/** Fired on contact. Mutates `runner` and returns the modifier it pushed. */
export function applyEffect(kind: ObstacleKind, id: string): Modifier {
  const e = EFFECTS[kind];
  if (e.resetToGate) runner.distance = runner.lastGateDistance;
  const mod: Modifier = {
    id,
    kind,
    multiplier: e.multiplier,
    until: performance.now() + e.durationMs,
  };
  runner.modifiers.push(mod);
  return mod;
}

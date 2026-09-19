// ─────────────────────────────────────────────────────────────
// OWNER: P1 (Stav). The shared contract. Ask P1 before changing.
// Every other file imports from here. Nothing here imports them.
// ─────────────────────────────────────────────────────────────
import type { Vector3 } from 'three';

/**
 * Metres in one lap. The real Chiang Mai moat is a ~1.6km square,
 * so a lap is ~6.4km. At BASE_SPEED that lands near the 6:42 target
 * time in docs/reference/03-results-screen.png.
 */
export const TRACK_LENGTH = 6400;
/** Lateral steer limit, ± metres from the road centreline. */
export const ROAD_HALF_WIDTH = 6;
/** Cruise speed in m/s, before any modifiers. */
export const BASE_SPEED = 16;
export const MIN_SPEED = 5;
export const MAX_SPEED = 28;
/** Lateral movement rate in m/s. */
export const STEER_SPEED = 10;

// ── Gates ───────────────────────────────────────────────────
// Four corners of the old city. Running order is Tha Phae → Chiang Mai
// → Suan Dok → Chang Phuak → back to Tha Phae, matching the split
// times in the results mockup.

export interface Gate {
  id: string;
  name: string;
  /** Position along the lap, 0..1. */
  t: number;
}

export const GATES: Gate[] = [
  { id: 'chiangmai', name: 'Chiang Mai Gate', t: 0.25 },
  { id: 'suandok', name: 'Suan Dok Gate', t: 0.5 },
  { id: 'changphuak', name: 'Chang Phuak Gate', t: 0.75 },
  { id: 'thaphae', name: 'Tha Phae Gate', t: 1 },
];

export const START_GATE = 'Tha Phae Gate';

// ── Obstacles ───────────────────────────────────────────────

export type ObstacleKind = 'motorbike' | 'dog' | 'massage' | 'food' | 'splash';

export interface ObstacleSpec {
  id: string;
  kind: ObstacleKind;
  /** Position along the lap, 0..1. */
  t: number;
  /** Lane across the road, -1..1. Multiply by ROAD_HALF_WIDTH for metres. */
  lane: number;
}

export interface Modifier {
  id: string;
  kind: ObstacleKind;
  /** Multiplied into BASE_SPEED while active. >1 speeds up (the dog). */
  multiplier: number;
  /** performance.now() timestamp at which this expires. */
  until: number;
}

/** Counters shown on the results screen. */
export interface RunStats {
  motorbikeHits: number;
  dogBoosts: number;
  massageDelays: number;
  wetZones: number;
  snacks: number;
  coins: number;
  bestBurstMs: number;
}

export const emptyStats = (): RunStats => ({
  motorbikeHits: 0,
  dogBoosts: 0,
  massageDelays: 0,
  wetZones: 0,
  snacks: 0,
  coins: 0,
  bestBurstMs: 0,
});

/** Earned title on the results screen, by finish time. */
export function rankFor(ms: number): { title: string; blurb: string } {
  const m = ms / 60000;
  if (m < 6) return { title: 'TRUE LOCAL', blurb: 'You know every shortcut' };
  if (m < 7) return { title: 'ALMOST LOCAL', blurb: 'Fast feet, good vibes!' };
  if (m < 9) return { title: 'WEEKEND RUNNER', blurb: 'Solid lap of the moat' };
  return { title: 'SLOW TOURIST', blurb: 'You stopped for the mango sticky rice' };
}

/**
 * Implemented by P2 in track.ts. Pass your own `target` vector inside a
 * per-frame loop to avoid allocating; omit it and you get a fresh one.
 */
export interface TrackApi {
  getPointAt(t: number, target?: Vector3): Vector3;
  getTangentAt(t: number, target?: Vector3): Vector3;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function formatTime(ms: number): string {
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function formatSplit(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
}

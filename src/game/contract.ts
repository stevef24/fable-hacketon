// ─────────────────────────────────────────────────────────────
// OWNER: P1 (Stav). FROZEN after T+20 — ask P1 before changing.
// Every other file imports from here. Nothing here imports them.
// ─────────────────────────────────────────────────────────────
import type { Vector3 } from 'three';

/** Metres in one lap of the old city. */
export const TRACK_LENGTH = 1200;
/** Lateral steer limit, ± metres from the road centreline. */
export const ROAD_HALF_WIDTH = 6;
/** Cruise speed in m/s, before any modifiers. */
export const BASE_SPEED = 14;
export const MIN_SPEED = 4;
export const MAX_SPEED = 24;
/** Lateral movement rate in m/s. */
export const STEER_SPEED = 9;

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

/**
 * Implemented by P2 in track.ts. Pass your own `target` vector inside a
 * per-frame loop to avoid allocating; omit it and you get a fresh one.
 */
export interface TrackApi {
  getPointAt(t: number, target?: Vector3): Vector3;
  getTangentAt(t: number, target?: Vector3): Vector3;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

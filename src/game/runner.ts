// OWNER: P2 (Kevin). Mutable per-frame state.
// Deliberately NOT React state: this is written 60 times a second.
import { BASE_SPEED, type Modifier } from './contract';

export interface Runner {
  /** Metres travelled this lap. */
  distance: number;
  /** Metres from the road centreline, +/-ROAD_HALF_WIDTH. */
  lateral: number;
  speed: number;
  modifiers: Modifier[];
  /** Distance of the last gate passed. A motorbike crash sends you back here. */
  lastGateDistance: number;
  /** How many of the four gates have been reached. */
  gateIndex: number;
  /**
   * Milliseconds of hold remaining, counted down in simulated time. A speed
   * multiplier alone cannot stop anyone -- MIN_SPEED clamps the floor at
   * 5 m/s -- so being buttonholed by a massage lady needs its own state.
   *
   * Deliberately a countdown rather than a performance.now() deadline: the
   * lap timer is frame-accumulated, and mixing wall-clock with simulated
   * time would make a hold cost different amounts on different machines.
   */
  heldMs: number;
  /** What is holding you, for the HUD to caption. */
  heldBy: string;
}

export const runner: Runner = {
  distance: 0,
  lateral: 0,
  speed: BASE_SPEED,
  modifiers: [],
  lastGateDistance: 0,
  gateIndex: 0,
  heldMs: 0,
  heldBy: '',
};

export function resetRunner() {
  runner.distance = 0;
  runner.lateral = 0;
  runner.speed = BASE_SPEED;
  runner.modifiers.length = 0;
  runner.lastGateDistance = 0;
  runner.gateIndex = 0;
  runner.heldMs = 0;
  runner.heldBy = '';
}

// Dev affordance: jumping to a point on the lap beats running to it.
//   __runner.distance = 1550   // just before Chiang Mai Gate
if (import.meta.env.DEV) {
  (window as unknown as { __runner: Runner }).__runner = runner;
}

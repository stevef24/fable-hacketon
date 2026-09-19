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
}

export const runner: Runner = {
  distance: 0,
  lateral: 0,
  speed: BASE_SPEED,
  modifiers: [],
  lastGateDistance: 0,
  gateIndex: 0,
};

export function resetRunner() {
  runner.distance = 0;
  runner.lateral = 0;
  runner.speed = BASE_SPEED;
  runner.modifiers.length = 0;
  runner.lastGateDistance = 0;
  runner.gateIndex = 0;
}

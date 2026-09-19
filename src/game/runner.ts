// OWNER: P2 (Kevin). Placeholder by P1 — replace freely.
// Deliberately NOT React state: this is written 60 times a second.
import { BASE_SPEED, type Modifier } from './contract';

export interface Runner {
  /** Metres travelled this lap. */
  distance: number;
  /** Metres from the road centreline, ±ROAD_HALF_WIDTH. */
  lateral: number;
  speed: number;
  modifiers: Modifier[];
}

export const runner: Runner = {
  distance: 0,
  lateral: 0,
  speed: BASE_SPEED,
  modifiers: [],
};

export function resetRunner() {
  runner.distance = 0;
  runner.lateral = 0;
  runner.speed = BASE_SPEED;
  runner.modifiers.length = 0;
}

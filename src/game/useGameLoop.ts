// OWNER: P2 (Kevin). Speed integration, steering, gates, lap detection.
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import {
  BASE_SPEED, GATES, MAX_SPEED, MIN_SPEED, ROAD_HALF_WIDTH,
  STEER_SPEED, TRACK_LENGTH, clamp,
} from './contract';
import { runner, resetRunner } from './runner';
import { useGameStore } from './store';
import { useViewModel } from '../entities/ViewModel';

const keys = new Set<string>();

/** How fast lateral velocity ramps toward its target. Higher = snappier. */
const STEER_RESPONSE = 7;

export function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (e.key.startsWith('Arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const blur = () => keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
}

export function useGameLoop() {
  const phase = useGameStore((s) => s.phase);
  // The run clock, in ms. Accumulated from the same clamped dt that
  // advances distance below -- not performance.now() -- so a stutter or a
  // backgrounded tab that drops frames costs distance progress and clock
  // time equally, instead of burning real time while the runner barely
  // moves. Two players covering the track identically post identical
  // times regardless of frame-rate hiccups on either machine.
  const simMs = useRef(0);
  const gateAtMs = useRef(0);
  const hudAt = useRef(0);
  const burstFrom = useRef(0);
  const lateralVelocity = useRef(0);
  useKeyboard();
  useViewModel();

  useEffect(() => {
    if (phase === 'running') {
      resetRunner();
      simMs.current = 0;
      gateAtMs.current = 0;
      hudAt.current = 0;
      burstFrom.current = 0;
      lateralVelocity.current = 0;
    }
  }, [phase]);

  useFrame((_, rawDt) => {
    if (phase !== 'running') return;
    // A backgrounded tab returns a huge delta; do not teleport the player.
    const dt = Math.min(rawDt, 0.05);
    const now = performance.now();
    const store = useGameStore.getState();
    simMs.current += dt * 1000;

    for (let i = runner.modifiers.length - 1; i >= 0; i--) {
      if (runner.modifiers[i].until <= now) runner.modifiers.splice(i, 1);
    }

    // Being held stops you dead. The lap timer keeps running, so the cost is
    // paid in seconds rather than metres -- which is the whole joke.
    if (runner.heldMs > 0) {
      runner.heldMs = Math.max(0, runner.heldMs - dt * 1000);
      runner.speed = 0;
      if (now - hudAt.current > 100) {
        hudAt.current = now;
        store.setHud(simMs.current, 0);
        store.setHeld(runner.heldMs, runner.heldBy);
      }
      return;
    }
    if (runner.heldBy) {
      runner.heldBy = '';
      store.setHeld(0, '');
    }

    let mult = 1;
    for (const m of runner.modifiers) mult *= m.multiplier;
    runner.speed = clamp(BASE_SPEED * mult, MIN_SPEED, MAX_SPEED);
    runner.distance += runner.speed * dt;

    // Longest unbroken stretch above cruise speed, shown on the results screen.
    if (runner.speed > BASE_SPEED + 0.5) {
      if (burstFrom.current === 0) burstFrom.current = now;
    } else if (burstFrom.current !== 0) {
      const burst = now - burstFrom.current;
      if (burst > store.stats.bestBurstMs) store.bumpStat('bestBurstMs', burst - store.stats.bestBurstMs);
      burstFrom.current = 0;
    }

    // Steering accelerates toward the held direction and decays back to
    // zero when released, rather than snapping the lateral rate instantly
    // -- a flat rate with no ramp reads as twitchy.
    const steer =
      (keys.has('a') || keys.has('arrowleft') ? -1 : 0) +
      (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    lateralVelocity.current = MathUtils.damp(
      lateralVelocity.current,
      steer * STEER_SPEED,
      STEER_RESPONSE,
      dt,
    );
    const nextLateral = runner.lateral + lateralVelocity.current * dt;
    // Stop accelerating into the edge instead of banking velocity that
    // would otherwise release as a snap back toward centre.
    if (nextLateral > ROAD_HALF_WIDTH || nextLateral < -ROAD_HALF_WIDTH) {
      lateralVelocity.current = 0;
    }
    runner.lateral = clamp(nextLateral, -ROAD_HALF_WIDTH, ROAD_HALF_WIDTH);

    // Gates. The last one is the finish line.
    const next = GATES[runner.gateIndex];
    if (next && runner.distance >= next.t * TRACK_LENGTH) {
      runner.gateIndex += 1;
      runner.lastGateDistance = next.t * TRACK_LENGTH;
      const split = simMs.current - gateAtMs.current;
      gateAtMs.current = simMs.current;

      if (runner.gateIndex >= GATES.length) {
        store.passGate(next.name, split);
        store.finish(simMs.current);
        return;
      }
      store.passGate(next.name, split);
    }

    // Throttled: calling set() every frame is what kills the frame rate.
    if (now - hudAt.current > 100) {
      hudAt.current = now;
      store.setHud(simMs.current, runner.speed);
    }
  });
}

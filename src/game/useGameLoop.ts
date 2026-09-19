// OWNER: P2 (Kevin). Speed integration, steering, gates, lap detection.
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BASE_SPEED, GATES, MAX_SPEED, MIN_SPEED, ROAD_HALF_WIDTH,
  STEER_SPEED, TRACK_LENGTH, clamp,
} from './contract';
import { runner, resetRunner } from './runner';
import { useGameStore } from './store';
import { useViewModel } from '../entities/ViewModel';

const keys = new Set<string>();

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
  const startedAt = useRef(0);
  const gateAt = useRef(0);
  const hudAt = useRef(0);
  const burstFrom = useRef(0);
  useKeyboard();
  useViewModel();

  useEffect(() => {
    if (phase === 'running') {
      resetRunner();
      const now = performance.now();
      startedAt.current = now;
      gateAt.current = now;
      hudAt.current = 0;
      burstFrom.current = 0;
    }
  }, [phase]);

  useFrame((_, rawDt) => {
    if (phase !== 'running') return;
    // A backgrounded tab returns a huge delta; do not teleport the player.
    const dt = Math.min(rawDt, 0.05);
    const now = performance.now();
    const store = useGameStore.getState();

    for (let i = runner.modifiers.length - 1; i >= 0; i--) {
      if (runner.modifiers[i].until <= now) runner.modifiers.splice(i, 1);
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

    const steer =
      (keys.has('a') || keys.has('arrowleft') ? -1 : 0) +
      (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    runner.lateral = clamp(
      runner.lateral + steer * STEER_SPEED * dt,
      -ROAD_HALF_WIDTH,
      ROAD_HALF_WIDTH,
    );

    // Gates. The last one is the finish line.
    const next = GATES[runner.gateIndex];
    if (next && runner.distance >= next.t * TRACK_LENGTH) {
      runner.gateIndex += 1;
      runner.lastGateDistance = next.t * TRACK_LENGTH;
      const split = now - gateAt.current;
      gateAt.current = now;

      if (runner.gateIndex >= GATES.length) {
        store.passGate(next.name, split);
        store.finish(now - startedAt.current);
        return;
      }
      store.passGate(next.name, split);
    }

    // Throttled: calling set() every frame is what kills the frame rate.
    if (now - hudAt.current > 100) {
      hudAt.current = now;
      store.setHud(now - startedAt.current, runner.speed);
    }
  });
}

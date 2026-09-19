// OWNER: P2 (Kevin). PLACEHOLDER by P1 — runs, but the feel is yours to build.
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BASE_SPEED, MAX_SPEED, MIN_SPEED, ROAD_HALF_WIDTH,
  STEER_SPEED, TRACK_LENGTH, clamp,
} from './contract';
import { runner, resetRunner } from './runner';
import { useGameStore } from './store';

const keys = new Set<string>();

export function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
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
  const hudAt = useRef(0);
  useKeyboard();

  useEffect(() => {
    if (phase === 'running') {
      resetRunner();
      startedAt.current = performance.now();
      hudAt.current = 0;
    }
  }, [phase]);

  useFrame((_, rawDt) => {
    if (phase !== 'running') return;
    // A backgrounded tab returns a huge delta; do not teleport the player.
    const dt = Math.min(rawDt, 0.05);
    const now = performance.now();

    for (let i = runner.modifiers.length - 1; i >= 0; i--) {
      if (runner.modifiers[i].until <= now) runner.modifiers.splice(i, 1);
    }

    let mult = 1;
    for (const m of runner.modifiers) mult *= m.multiplier;
    runner.speed = clamp(BASE_SPEED * mult, MIN_SPEED, MAX_SPEED);
    runner.distance += runner.speed * dt;

    const left = keys.has('a') || keys.has('arrowleft') ? -1 : 0;
    const right = keys.has('d') || keys.has('arrowright') ? 1 : 0;
    runner.lateral = clamp(
      runner.lateral + (left + right) * STEER_SPEED * dt,
      -ROAD_HALF_WIDTH,
      ROAD_HALF_WIDTH,
    );

    if (runner.distance >= TRACK_LENGTH) {
      useGameStore.getState().finish(now - startedAt.current);
      return;
    }

    // Throttled: calling set() every frame is what kills the frame rate.
    if (now - hudAt.current > 100) {
      hudAt.current = now;
      useGameStore.getState().setHud(now - startedAt.current, runner.speed);
    }
  });
}

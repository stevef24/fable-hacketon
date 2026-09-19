// OWNER: P1 (Stav). Discrete state + throttled HUD values only.
// Per-frame values live in runner.ts, never here.
import { create } from 'zustand';

const BEST_KEY = 'cmd.best';

export type Phase = 'menu' | 'running' | 'finished';

interface GameState {
  phase: Phase;
  /** Milliseconds, updated ~10x/sec for the HUD. */
  elapsed: number;
  displaySpeed: number;
  lastMs: number;
  bestMs: number | null;
  isRecord: boolean;
  start: () => void;
  finish: (ms: number) => void;
  reset: () => void;
  setHud: (elapsed: number, speed: number) => void;
}

function loadBest(): number | null {
  try {
    const n = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export const useGameStore = create<GameState>()((set, get) => ({
  phase: 'menu',
  elapsed: 0,
  displaySpeed: 0,
  lastMs: 0,
  bestMs: loadBest(),
  isRecord: false,

  start: () => set({ phase: 'running', elapsed: 0, displaySpeed: 0, isRecord: false }),

  finish: (ms) => {
    const best = get().bestMs;
    const isRecord = best === null || ms < best;
    if (isRecord) {
      try {
        localStorage.setItem(BEST_KEY, String(Math.round(ms)));
      } catch {
        // private browsing — the run still counts, it just will not persist
      }
    }
    set({ phase: 'finished', lastMs: ms, bestMs: isRecord ? ms : best, isRecord });
  },

  reset: () => set({ phase: 'menu', elapsed: 0, displaySpeed: 0 }),

  setHud: (elapsed, displaySpeed) => set({ elapsed, displaySpeed }),
}));

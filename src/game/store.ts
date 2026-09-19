// OWNER: P1 (Stav). Discrete state + throttled HUD values only.
// Per-frame values live in runner.ts, never here.
import { create } from 'zustand';
import { emptyStats, type RunStats } from './contract';

// v2: F10 (P2) changed finish() to report a dt-accumulated sim clock
// instead of wall-clock time. A value saved under the old key was measured
// under different semantics (stutters and backgrounded tabs inflated it
// beyond true run time), so it is not comparable to a post-F10 run -- an
// old best could either block a genuinely faster run or lose to a run
// that only looks faster because of how it was measured. Versioning the
// key drops stale values instead of silently comparing across them.
const BEST_KEY = 'moatrunner.best.v2';

export type Phase = 'menu' | 'running' | 'finished';

export interface Split {
  name: string;
  ms: number;
}

interface GameState {
  phase: Phase;
  /** Milliseconds, updated ~10x/sec for the HUD. */
  elapsed: number;
  displaySpeed: number;
  gatesReached: number;
  splits: Split[];
  stats: RunStats;
  /** Transient caption, e.g. "Soi dog chase!". */
  flash: { label: string; good: boolean; at: number } | null;
  lastMs: number;
  bestMs: number | null;
  isRecord: boolean;

  start: () => void;
  finish: (ms: number) => void;
  reset: () => void;
  setHud: (elapsed: number, speed: number) => void;
  passGate: (name: string, splitMs: number) => void;
  bumpStat: (key: keyof RunStats, by?: number) => void;
  showFlash: (label: string, good: boolean) => void;
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
  gatesReached: 0,
  splits: [],
  stats: emptyStats(),
  flash: null,
  lastMs: 0,
  bestMs: loadBest(),
  isRecord: false,

  start: () =>
    set({
      phase: 'running',
      elapsed: 0,
      displaySpeed: 0,
      gatesReached: 0,
      splits: [],
      stats: emptyStats(),
      flash: null,
      isRecord: false,
    }),

  finish: (ms) => {
    const best = get().bestMs;
    const isRecord = best === null || ms < best;
    if (isRecord) {
      try {
        localStorage.setItem(BEST_KEY, String(Math.round(ms)));
      } catch {
        // private browsing - the run still counts, it just will not persist
      }
    }
    set({ phase: 'finished', lastMs: ms, bestMs: isRecord ? ms : best, isRecord });
  },

  reset: () => set({ phase: 'menu', elapsed: 0, displaySpeed: 0, flash: null }),

  setHud: (elapsed, displaySpeed) => set({ elapsed, displaySpeed }),

  passGate: (name, ms) =>
    set((s) => ({
      gatesReached: s.gatesReached + 1,
      splits: [...s.splits, { name, ms }],
      flash: { label: `${name} reached`, good: true, at: performance.now() },
    })),

  bumpStat: (key, by = 1) =>
    set((s) => ({ stats: { ...s.stats, [key]: (s.stats[key] as number) + by } })),

  showFlash: (label, good) => set({ flash: { label, good, at: performance.now() } }),
}));

# P1 — Stav (@stevef24)

**Role:** Integration, contract, camera, deploy, merges
**You own:** `src/App.tsx`, `src/game/contract.ts`, `src/game/store.ts`, `index.html`, `vite.config.ts`, deploy config
**You never touch:** anything owned by P2-P5

Full context is in [`docs/PLAN.md`](../PLAN.md). This ticket is self-contained — you should not need to read anyone else's.

---

## Your prompt

Paste this into Claude Code from the repo root.

> You are setting up a React Three Fiber game called Chiang Mai Dash and you own integration. Scaffold with `npm create vite@latest . -- --template react-ts`, then `npm i three @react-three/fiber @react-three/drei zustand` and `npm i -D @types/three`.
>
> Write `src/game/contract.ts` exactly as specified in the team plan and push it within twenty minutes — four people are blocked on it. Then write `src/game/store.ts`: a zustand store holding `phase: 'menu' | 'running' | 'finished'`, `elapsed`, `bestMs`, `displaySpeed`, and actions `start()`, `finish(ms)`, `reset()`. `finish` compares against `localStorage['cmd.best']` and persists a new best.
>
> Write `src/App.tsx`: a `<Canvas>` with a chase camera that each frame reads `runner.distance` from `src/game/runner.ts`, samples `getPointAt` a little behind the player, lerps the camera toward it with damping (roughly `camera.position.lerp(target, 1 - Math.pow(0.001, dt))`) and looks slightly ahead of the runner. Mount `<City/>`, `<Gate/>`, `<Player/>`, `<Obstacles/>` inside the Canvas and `<HUD/>`, `<Screens/>` outside it. Stub any component that does not exist yet with a coloured box so the app always runs.
>
> Deploy to Vercel in the first hour even though the game is empty, so the URL exists and works. Redeploy at every sync point. You own all merges: nobody else merges to main.
>
> Do not implement movement, obstacles, world art, or UI — four other people are doing those and will conflict with you.
>
> **Ask your Fable advisor:** paste `contract.ts` and `store.ts` and ask what will break when four people build against these at once — specifically, which constant or type is going to need changing at T+120 and should therefore be made flexible now.

---

## The shared contract

`src/game/contract.ts` is already written and **frozen**. Import from it; do not edit it. If you need a change, ask Stav.

```ts
// src/game/contract.ts
import type { Vector3 } from 'three';

export const TRACK_LENGTH   = 1200;  // metres in one lap
export const ROAD_HALF_WIDTH = 6;    // lateral steer limit, ±metres
export const BASE_SPEED     = 14;    // m/s cruise
export const MIN_SPEED      = 4;
export const MAX_SPEED      = 24;
export const STEER_SPEED    = 9;     // lateral m/s

export type ObstacleKind = 'motorbike' | 'dog' | 'massage' | 'food' | 'splash';

export interface ObstacleSpec {
  id: string;
  kind: ObstacleKind;
  t: number;      // 0..1 along the lap
  lane: number;   // -1..1, multiplied by ROAD_HALF_WIDTH
}

export interface Modifier {
  id: string;
  kind: ObstacleKind;
  multiplier: number;  // applied to BASE_SPEED
  until: number;       // performance.now() ms
}

// Implemented in track.ts by P2 — this signature is the contract
export type TrackApi = {
  getPointAt(t: number): Vector3;    // centreline position
  getTangentAt(t: number): Vector3;  // unit forward
};
```

### Effect table (P3 owns the numbers, tunes them live)

| Obstacle | On contact | Feel |
|---|---|---|
| Motorbike | `×0.45` for 1.2s, plus instant `−8m` | Slammed, brief stall |
| Massage lady | instant `−15m`, then `×0.5` for 1.0s | Yanked bodily backwards |
| Food lady | `×0.6` for 2.5s | She walks alongside, you cannot shake her |
| Soi dog | `×1.55` for 3.0s | Terror. The one obstacle you want to hit |
| Splash kid | `×0.8` for 1.5s + screen splash | Cosmetic mostly, Songkran flavour |

Speed each frame: `clamp(BASE_SPEED × Π(active multipliers), MIN_SPEED, MAX_SPEED)`.

The dog is the design's hook — an obstacle that *rewards* you. Place dogs right before long straights so the boost pays off, and place the massage lady right after a corner where players are already slow.


---

## Rules that keep five people from colliding

- **Only edit the files you own.** The repo already runs (`npm run dev`) with placeholders in every slot — replace your own, leave everyone else's alone.
- **Never call `set()` on the zustand store inside `useFrame`.** Per-frame values live in the mutable `runner` object. This is the single most likely way the build ends up feeling bad.
- **Branch:** `stav/<what>`. Stav is the only person who merges to `main`.

### Sync points

Branch per person (`p2/track`, `p4/city`…). **P1 is the only person who merges.** Four fixed sync points rather than continuous merging:

- **T+20** — P1 pushes scaffold + contract. Everyone pulls. Nobody starts before this. **Stav also confirms `1320group` has accepted the invite and is building; if not, he takes the crude-city fallback now.**
- **T+45** — P2 pushes `track.ts`. Everyone pulls, deletes their stub.
- **T+90** — first full integration. Everything is in the scene, however ugly.
- **T+150** — feature freeze. Tuning, sound, and polish only.
- **T+180** — deploy, record a backup video.

---

## Working with a Fable advisor

Everyone runs two sessions: a **builder** (their main Claude Code session, which writes files) and an **advisor** on Fable, which does not.

```bash
# second terminal tab, in the repo
claude --model claude-fable-5-1
# or inside an existing session:  /model claude-fable-5-1
```

The advisor reviews, argues, and proposes — it never edits the repo. **One writer per file, always.** Two agents editing the same file is exactly the merge problem this whole plan is built to avoid, and it is worse than a human conflict because neither agent notices. Paste your file into the advisor, ask your slot's question below, then decide yourself what to apply.

Each prompt ends with the specific question worth asking your advisor. Ask it at roughly the halfway mark, not at the end — advice you receive at T+170 is not advice, it is regret.

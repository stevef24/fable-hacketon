# P2 — Kevin (@dungle-scrubs)

**Role:** The track and how running feels
**You own:** `src/game/track.ts`, `src/game/runner.ts`, `src/game/useGameLoop.ts`, `src/entities/ViewModel.tsx`
**You never touch:** world art, UI, obstacles

Full context is in [`docs/PLAN.md`](../PLAN.md). This ticket is self-contained — you should not need to read anyone else's.

---

## Your prompt

Paste this into Claude Code from the repo root.

> You own how the game feels. React Three Fiber, TypeScript. Import shared types from `src/game/contract.ts`.
>
> **First deliverable, within 25 minutes, because three people are blocked on it:** `src/game/track.ts` exporting `getPointAt(t)` and `getTangentAt(t)` matching the `TrackApi` type. Build a `THREE.CatmullRomCurve3` with `closed: true` from roughly 12 points forming a rounded rectangle about 300m × 260m — the Chiang Mai old city moat. `t` is 0..1. Cache the curve at module scope, never rebuild it per frame. Push this immediately and tell the team.
>
> Then `src/game/runner.ts`: export a plain mutable object `runner = { distance: 0, lateral: 0, speed: BASE_SPEED, modifiers: [] as Modifier[] }`. This is deliberately not React state — it is written 60 times a second.
>
> Then `src/game/useGameLoop.ts`: a hook using `useFrame(( _, dt ) => ...)` that drops expired modifiers, computes `speed = clamp(BASE_SPEED * product(multipliers), MIN_SPEED, MAX_SPEED)`, advances `runner.distance += speed * dt`, applies steering from A/D and arrow keys into `runner.lateral` clamped to ±`ROAD_HALF_WIDTH`, and calls the store's `finish()` when `distance >= TRACK_LENGTH`. Throttle store writes to every 100ms — never call `set()` every frame.
>
> Then `src/entities/ViewModel.tsx`: this is **first person**, so there is no avatar. P1 already places the camera on the track; your job is what sells running from inside the runner's head — a vertical head bob at roughly 2Hz scaled by current speed, a small roll into the steering direction, and optionally low-poly hands or a water bottle swinging at the bottom of frame. Parent it to the camera. Keep the bob subtle: anything over ~8cm of travel makes people motion sick within a minute.
>
> Spend your last half hour purely on tuning until running feels fast. In first person the strongest levers are field of view (raise it with speed, ~75→~88), head bob rate, and camera damping — not the speed number itself. A first-person runner at 14 m/s feels faster than a third-person one at 20.
>
> Do not build obstacles, city geometry, HUD, or audio.
>
> **Ask your Fable advisor:** paste `useGameLoop.ts` and describe how running currently feels. Ask what is making it feel floaty or sluggish and which single constant to change — acceleration curve, steer response, camera lag, or field of view rising with speed. Camera and FOV are usually the answer, not the speed number.

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
- **Branch:** `kevin/<what>`. Stav is the only person who merges to `main`.

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

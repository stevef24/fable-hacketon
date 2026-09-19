# P3 — Keith (@keithrbennett)

**Role:** Obstacles and course design
**You own:** `src/entities/Obstacles.tsx`, `src/entities/effects.ts`, `src/entities/course.ts`
**You never touch:** track internals, world art, UI

Full context is in [`docs/PLAN.md`](../PLAN.md). This ticket is self-contained — you should not need to read anyone else's.

---

## Your prompt

Paste this into Claude Code from the repo root.

> You own everything that gets in the player's way. React Three Fiber, TypeScript. Import types from `src/game/contract.ts`, the curve from `src/game/track.ts`, and the mutable `runner` from `src/game/runner.ts`. Until P2 pushes `track.ts`, stub it locally as a flat circle with the same signature, then delete your stub.
>
> `src/entities/effects.ts`: a map from `ObstacleKind` to its effect — motorbike `×0.45` for 1200ms plus an instant `−8m` on `runner.distance`; massage `−15m` then `×0.5` for 1000ms; food `×0.6` for 2500ms; dog `×1.55` for 3000ms; splash `×0.8` for 1500ms. Export `applyEffect(kind)` which pushes a `Modifier` onto `runner.modifiers`.
>
> `src/entities/course.ts`: an array of roughly 40 `ObstacleSpec`s spread over `t` 0..1 with varied lanes. Design it, do not scatter randomly: put dogs just before long straights so the boost pays off, put the massage lady just after a corner, cluster food vendors into a market stretch, keep the first 8% of the lap clear so players learn the controls.
>
> `src/entities/Obstacles.tsx`: render each spec at `getPointAt(spec.t)` offset by `spec.lane * ROAD_HALF_WIDTH`, rotated to the tangent. Use distinct primitive shapes and strong colours per kind — a red box for the motorbike, a small tan box for the dog, and so on. Real models are a later upgrade, not your job now. In `useFrame`, hit-test: for each not-yet-hit obstacle, if `|runner.distance − spec.t * TRACK_LENGTH| < 1.5` and `|runner.lateral − laneX| < 1.6`, call `applyEffect` and mark it hit in a `Set` so it fires once. Reset that set when the run restarts. Plain arithmetic only — no physics engine, no raycasting.
>
> Stretch once the above works: make motorbikes move along the track so they must be dodged, and make the dog visibly chase the player for the duration of its boost.
>
> You know the real old city, so use it: put the food carts where the food carts actually are, cluster the massage shops the way that stretch of moat road actually clusters them, and let the motorbike density rise near the real junctions. Nobody else on the team can do that part, and it is what will make a judge who has walked that loop laugh.
>
> **Ask your Fable advisor:** paste `course.ts` and ask it to critique the pacing as a *level designer* would — where is the run boring, where are two obstacles so close together that the player cannot recover, and does the dog boost land somewhere it actually feels like a reward.

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
- **Branch:** `keith/<what>`. Stav is the only person who merges to `main`.

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

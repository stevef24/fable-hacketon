# P4 — @1320group

**Role:** The old city
**You own:** `src/world/City.tsx`, `src/world/Gate.tsx`, `public/models/`
**You never touch:** all game logic, UI, audio

Full context is in [`docs/PLAN.md`](../PLAN.md). This ticket is self-contained — you should not need to read anyone else's.

---

## Your prompt

Paste this into Claude Code from the repo root.

> You are building the Chiang Mai old city as a React Three Fiber scene. Pure visuals: you never touch game logic, and nothing you write affects gameplay. Import `getPointAt`/`getTangentAt` from `src/game/track.ts` (stub it locally as a circle until P2 pushes it).
>
> `src/world/City.tsx` containing: a road ribbon built by sampling the curve at ~200 points and generating a flat mesh 12m wide along it; a moat — a large water-coloured plane just inside the loop with a slow-scrolling or simply semi-transparent material; brick-red city walls as instanced boxes along an inner offset of the curve; buildings as instanced boxes of varied height in a warm palette outside the loop, denser in some stretches to suggest markets; drei's `<Sky/>` or a gradient background; warm directional light plus ambient plus light fog for depth.
>
> `src/world/Gate.tsx`: Tha Phae Gate at `t = 0`, the start/finish line. This is the one piece of hero geometry — crenellated brick towers either side of an arch, built from boxes. Make it recognisable; it is the first and last thing anyone sees. Add Songkran banner bunting as thin coloured planes strung across the road.
>
> Use `<Instances>` from drei for anything repeated. Target 60fps: keep total draw calls low, avoid shadows on everything, and prefer `MeshLambertMaterial` over physical materials.
>
> Reference: warm afternoon light, brick red, gold temple accents, deep green foliage, blue-and-white Songkran banners, turquoise moat water.
>
> Do not touch movement, obstacles, HUD, or audio.
>
> **Ask your Fable advisor:** screenshot the scene and ask what is making it read as generic 3D boxes rather than as Chiang Mai. Ask specifically about light colour, fog distance, and palette discipline — those three fix more than adding geometry does, and they cost minutes rather than hours.

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
- **Branch:** `1320group/<what>`. Stav is the only person who merges to `main`.

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

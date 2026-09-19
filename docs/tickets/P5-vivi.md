# P5 — @vivi09032000

**Role:** HUD, screens and sound
**You own:** `src/ui/HUD.tsx`, `src/ui/Screens.tsx`, `src/ui/audio.ts`, `public/audio/`
**You never touch:** anything inside the <Canvas>

Full context is in [`docs/PLAN.md`](../PLAN.md). This ticket is self-contained — you should not need to read anyone else's.

---

## Your prompt

Paste this into Claude Code from the repo root.

> You own everything outside the 3D canvas. React + TypeScript, plain CSS. Read state from the zustand store at `src/game/store.ts` only — never from the game loop, and never import `runner`.
>
> `src/ui/HUD.tsx`: a large monospace lap timer (`M:SS.mmm`, tabular numerals so it does not jitter), a speed readout, and a transient caption when an effect fires — "Motorbike!", "Soi dog chase!", "Massage stop", "Khao soi break" — that fades after a second. Colour the caption red for a penalty, green for the dog boost, so the player instantly reads whether that was good or bad.
>
> `src/ui/Screens.tsx`: a start screen with the title, one line of instructions ("A / D to steer — run the old city, avoid the locals, let the dog chase you") and a start button; and a finish screen with the final time, the previous best, whether it is a new record, and a restart button. Style them to match the reference art — warm browns, cream panels, rounded corners, a soft drop shadow, no default browser styling anywhere.
>
> `src/ui/audio.ts`: preload and expose `play(name)` for a bark, a motorbike horn, a water splash, a market murmur, and a light looping background track. Source CC0 audio from freesound or Kenney's audio packs. Gate all audio behind the start button click so browser autoplay policy does not block it, and include a mute toggle.
>
> Do not put anything inside the `<Canvas>` — that is other people's territory and will conflict.
>
> **Ask your Fable advisor:** paste your HUD CSS and ask what still looks like a default browser page. Ask about the timer specifically — a lap timer that shifts width as digits change is the most common polish failure, and `font-variant-numeric: tabular-nums` fixes it in one line.

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
- **Branch:** `vivi/<what>`. Stav is the only person who merges to `main`.

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

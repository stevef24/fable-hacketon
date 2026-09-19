# Chiang Mai Dash — hackathon build plan

## Context

Five collaborators — Stav (`stevef24`), Kevin (`dungle-scrubs`), Keith (`keithrbennett`), `vivi09032000` and `1320group` — a few hours, and an empty repo (`stevef24/fable-hacketon`). The goal is a browser game: a character runs one timed lap of the Chiang Mai old city, starting and finishing at Tha Phae Gate, while Chiang Mai itself tries to slow them down — motorbikes, a soi dog, a massage lady, a food vendor. Fastest lap wins.

The real risk here is not difficulty, it is **collision between five people in one small codebase**. Three hours of merge conflicts produces nothing. So this plan is built contract-first: one person defines the shared types and tuning constants in the first twenty minutes, freezes them, and after that every person owns a disjoint set of files that nobody else opens. The game is assembled from five pieces that never touch each other's source.

Second risk: a physics engine, a rigged character pipeline, or netcode would each eat the entire budget. None are used. Movement is arithmetic on a single `speed` number, the track is a curve, collision is a distance check, and the whole thing ships as a static site.

### Locked decisions

| Decision | Choice |
|---|---|
| Stack | Vite + React + TypeScript + React Three Fiber + drei + zustand |
| Movement | Auto-run forward, player steers left/right |
| Camera | **First person.** The camera *is* the runner at 1.7m eye height. No avatar is drawn |
| Track | Closed spline loop around the moat; player is railed to it, steers laterally only |
| Players | Solo time trial, best time in `localStorage` |
| Obstacles | Pure collision → timed multiplier on one speed value. No input minigames, no hearts, no fail state |
| Physics | None. No rapier, no cannon. Distance checks only |
| Art | Primitives + colour + lighting first; CC0 GLTF packs only if time survives |
| Deploy | Vercel static |

**No fail state by design.** At a demo booth a player who dies is a player who walks away. Obstacles cost time, never the run.

---

## Architecture

```
src/
  main.tsx
  App.tsx                  ← P1 only. Canvas, scene assembly, camera, phase routing
  game/
    contract.ts            ← P1. Types + tuning constants. FROZEN after T+20
    store.ts               ← P1. zustand: phase, elapsed, best, HUD values
    runner.ts              ← P2. Mutable per-frame state (NOT in zustand)
    track.ts               ← P2. The spline + getPointAt / getTangentAt
    useGameLoop.ts         ← P2. Speed integration, lap detection
  entities/
    ViewModel.tsx          ← P2. Head bob, lean, hands. NOT a third-person avatar
    Obstacles.tsx          ← P3. Renders + hit-tests every obstacle
    effects.ts             ← P3. kind → speed modifier table
    course.ts              ← P3. Placement data: where each obstacle sits
  world/
    City.tsx               ← P4. Road ribbon, walls, buildings, moat, sky, lighting
    Gate.tsx               ← P4. Tha Phae Gate at the start line
  ui/
    HUD.tsx                ← P5. Timer, speed, active-effect flash
    Screens.tsx            ← P5. Start + finish screens
    audio.ts               ← P5. Sound effects and music
public/audio/              ← P5
```

### Data flow

```
useGameLoop (P2)  reads runner.speed, applies active modifiers, advances runner.distance
        │
        ├──→ App.tsx  (P1)       camera sits AT getPointAt(distance) + lateral, eye height
        ├──→ ViewModel.tsx (P2)  head bob and lean, parented to the camera
        ├──→ Obstacles.tsx (P3)  hit-tests runner against course data, pushes modifiers
        └──→ store (P1)          throttled to ~10Hz for the HUD only
```

**The performance rule everybody follows:** per-frame values live in the plain mutable object `runner`, never in zustand or React state. Writing `setState` inside `useFrame` at 60fps will tank the frame rate and is the single most likely way this build ends up feeling bad. The store is updated on a 100ms throttle and on discrete events only.

### The dependency that gates everything

`track.ts` is imported by the player, the obstacles, the road mesh and the props. **P2 ships a working `track.ts` before building anything else** — a hardcoded rounded rectangle is fine and correct. Until it lands, P3 and P4 work against a three-line local stub with the same signature and delete it after the first sync.

---

## The contract

P1 writes this first, commits, announces it, and then it does not change. Anyone who needs a change asks P1 rather than editing it.

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

## Ownership

Assigned from the repo's actual collaborator list and each person's recent public work.

| | Who | Owns | Never touches |
|---|---|---|---|
| **P1** | **Stav** (`stevef24`) | Scaffold, `contract.ts`, `store.ts`, `App.tsx`, camera, deploy, all merges | everyone else's files |
| **P2** | **Kevin** (`dungle-scrubs`) | `track.ts`, `runner.ts`, `useGameLoop.ts`, `ViewModel.tsx` | world, UI, obstacles |
| **P3** | **Keith** (`keithrbennett`) | `Obstacles.tsx`, `effects.ts`, `course.ts` | track internals, world |
| **P4** | **`1320group`** | `City.tsx`, `Gate.tsx`, `public/models/` | game logic entirely |
| **P5** | **`vivi09032000`** | `HUD.tsx`, `Screens.tsx`, `audio.ts`, `public/audio/` | anything inside the Canvas |

Why this way. Stav is repo admin, so he holds merge rights and deploy. Kevin's recent repos are almost entirely TypeScript, so he takes the hardest logic — the track and the movement feel. Keith has the deepest general engineering history and, from `chiangmai-ai-meetups`, actually lives there: obstacle placement is the one task where knowing the real old city pays off, so he designs *where* the massage ladies and food carts sit, not just how they behave. P5 is pure React and CSS with no 3D whatsoever, which suits `vivi09032000`'s JS/HTML background.

**Risk: `1320group` has not accepted their invite yet.** P4 is a must-have, so if they have not accepted and started by **T+20**, Stav absorbs a crude version — flat road ribbon, box walls, box gate, warm light, thirty minutes — and the full city becomes a stretch. Do not let this discover itself at T+120. Check at T+20.

P4 and P5 are fully fenced: neither needs to read the game loop to do excellent work.

### Git

Branch per person (`p2/track`, `p4/city`…). **P1 is the only person who merges.** Four fixed sync points rather than continuous merging:

- **T+20** — P1 pushes scaffold + contract. Everyone pulls. Nobody starts before this. **Stav also confirms `1320group` has accepted the invite and is building; if not, he takes the crude-city fallback now.**
- **T+45** — P2 pushes `track.ts`. Everyone pulls, deletes their stub.
- **T+90** — first full integration. Everything is in the scene, however ugly.
- **T+150** — feature freeze. Tuning, sound, and polish only.
- **T+180** — deploy, record a backup video.

---

## Fable as advisor

Everyone runs two sessions: a **builder** (their main Claude Code session, which writes files) and an **advisor** on Fable, which does not.

```bash
# second terminal tab, in the repo
claude --model claude-fable-5-1
# or inside an existing session:  /model claude-fable-5-1
```

The advisor reviews, argues, and proposes — it never edits the repo. **One writer per file, always.** Two agents editing the same file is exactly the merge problem this whole plan is built to avoid, and it is worse than a human conflict because neither agent notices. Paste your file into the advisor, ask your slot's question below, then decide yourself what to apply.

Each prompt ends with the specific question worth asking your advisor. Ask it at roughly the halfway mark, not at the end — advice you receive at T+170 is not advice, it is regret.

## The five prompts

Hand each person their block verbatim. Each is self-contained.

### P1 — Stav (`stevef24`) — Integrator

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

### P2 — Kevin (`dungle-scrubs`) — Track and movement (the feel)

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

### P3 — Keith (`keithrbennett`) — Obstacles and course design

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

### P4 — `1320group` — The city

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

### P5 — `vivi09032000` — HUD, screens, sound

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

## Verification

End of build, run this in order:

1. `npm run dev` — app loads at the start screen with no console errors.
2. Press start. The character runs forward on its own and the timer counts up.
3. A and D steer left and right; the character cannot leave the road.
4. Deliberately hit one of each of the five obstacle types. Confirm each fires **once**, the HUD caption names it, and the speed readout moves in the right direction — down for four of them, **up** for the dog.
5. Complete a full lap. The finish screen shows a time, and the time is plausible (a clean lap should land near 60–90 seconds — if it is far off, P2 adjusts `BASE_SPEED` or `TRACK_LENGTH`).
6. Restart and beat it. Confirm the best time persists after a hard page refresh.
7. Watch the frame counter during a lap. If it drops below 50fps, the cause is almost certainly a `setState` inside `useFrame` or un-instanced buildings.
8. `npm run build && npx vercel --prod`. Open the live URL on a phone and confirm it loads.
9. Record a screen capture of a complete clean lap as the backup demo.

## Cut list, in this order

If the clock beats you, drop these — never the lap or the timer:

1. Audio beyond a single bark
2. The splash kid (fifth obstacle)
3. Moving motorbikes — static ones still work
4. GLTF models — primitives are fine and arguably more consistent
5. The finish screen — a HUD banner will do

**Never cut:** a lap that completes, a timer that runs, and a gate you can recognise.

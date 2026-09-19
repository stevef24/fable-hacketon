# Chiang Mai Dash

> **First-person time trial around the Chiang Mai old city.** Start at Tha Phae Gate, run one lap of the moat as fast as you can, while Chiang Mai does its best to slow you down — motorbikes, a soi dog, a massage lady, a food vendor. Fastest lap wins.
>
> **Demo:** _TODO — link once deployed_

Built at a hackathon by five people in an afternoon.

---

## Find your ticket

Each person owns a disjoint set of files. Open your ticket, paste the prompt into Claude Code, and go. You should not need to read anyone else's.

| | Who | Owns | Ticket |
|---|---|---|---|
| **P1** | Stav ([@stevef24](https://github.com/stevef24)) | Integration, contract, camera, deploy, merges | [`P1-stav.md`](docs/tickets/P1-stav.md) |
| **P2** | Kevin ([@dungle-scrubs](https://github.com/dungle-scrubs)) | Track, movement, how running feels | [`P2-kevin.md`](docs/tickets/P2-kevin.md) |
| **P3** | Keith ([@keithrbennett](https://github.com/keithrbennett)) | Obstacles and course design | [`P3-keith.md`](docs/tickets/P3-keith.md) |
| **P4** | [@1320group](https://github.com/1320group) | The old city — gate, walls, moat, lighting | [`P4-1320group.md`](docs/tickets/P4-1320group.md) |
| **P5** | [@vivi09032000](https://github.com/vivi09032000) | HUD, screens, sound | [`P5-vivi.md`](docs/tickets/P5-vivi.md) |

Full design, architecture and cut list: **[`docs/PLAN.md`](docs/PLAN.md)**.

---

## Quick start

```bash
git clone https://github.com/stevef24/fable-hacketon.git
cd fable-hacketon
npm install
npm run dev
```

Press **Start**, then **A / D** or the arrow keys to steer. The runner moves forward on its own.

It already runs: every slot has a placeholder in it, so you get a moving first-person camera on a looping track from minute one. Your job is to replace your own placeholder.

**Stack:** Vite + React 19 + TypeScript + React Three Fiber + drei + zustand.

> React is pinned to `~19.2.8` on purpose. React Three Fiber 9.7 declares a peer range of `>=19 <19.3`, and npm will happily install 19.3 and leave you with a subtly broken renderer. Do not widen it.

---

## How this repo is organised

```
src/
  App.tsx                  P1  Canvas, first-person camera, phase routing
  game/
    contract.ts            P1  Shared types + tuning constants — FROZEN
    store.ts               P1  zustand: phase, elapsed, best time
    runner.ts              P2  Mutable per-frame state (deliberately not React state)
    track.ts               P2  The loop: getPointAt / getTangentAt / getRightAt
    useGameLoop.ts         P2  Speed integration, steering, lap detection
  entities/
    ViewModel.tsx          P2  Head bob and lean — first person, so no avatar
    Obstacles.tsx          P3  Renders and hit-tests every obstacle
    effects.ts             P3  Obstacle kind → speed modifier
    course.ts              P3  Where each obstacle sits on the lap
  world/
    City.tsx               P4  Road, walls, moat, buildings, sky, lighting
    Gate.tsx               P4  Tha Phae Gate, the start/finish line
  ui/
    HUD.tsx                P5  Timer, speed, effect captions
    Screens.tsx            P5  Start and finish screens
    audio.ts               P5  Sound effects and music
```

## The three rules

1. **Only edit files you own.** Five people in one small repo is a merge problem, not a capacity problem. The file map above is the whole coordination mechanism.
2. **Never call `set()` on the store inside `useFrame`.** Per-frame values live in the mutable `runner` object; the store is throttled to ~10Hz. This is the fastest way to make the game feel bad.
3. **Branch per person, Stav merges.** `yourname/what-you-did`. Never push to `main`.

## Sync points

- **T+20** — scaffold and contract are on `main`. Everyone pulls.
- **T+45** — the real `track.ts` lands. Everyone pulls and deletes their stub.
- **T+90** — first full integration. Everything in the scene, however ugly.
- **T+150** — feature freeze. Tuning, sound and polish only.
- **T+180** — deploy, and record a backup video of a clean lap.

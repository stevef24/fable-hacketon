# Fidelity tickets

The game plays and is deployed. These close the remaining gap to `docs/reference/`.

Each row is also a GitHub issue, assigned to you.

## Open

| | Ticket | Owner | Issue | Why it matters |
|---|---|---|---|---|
| **F1** | [Gates](F1-gates.md) | @dungle-scrubs | [#8](https://github.com/stevef24/fable-hacketon/issues/8) | The most recognisable thing in the game, still boxes. Also the four checkpoints |
| **F3** | [Shophouses](F3-shophouses.md) | @dungle-scrubs | [#10](https://github.com/stevef24/fable-hacketon/issues/10) | Makes the horizon a city instead of a bar chart |
| **F4** | [Lanterns & dressing](F4-dressing.md) | @vivi09032000 | [#11](https://github.com/stevef24/fable-hacketon/issues/11) | Stalls and lanterns are in; poles, banners and signage are not |
| **F7** | [HUD art pass](F7-hud-art.md) | @vivi09032000 | [#12](https://github.com/stevef24/fable-hacketon/issues/12) | Reads as styled HTML, not as the art |
| **F11** | Obstacle models | @keithrbennett | [#18](https://github.com/stevef24/fable-hacketon/issues/18) | Most-looked-at objects now the course is dense |
| **F12** | Delete the course fill | @keithrbennett | [#19](https://github.com/stevef24/fable-hacketon/issues/19) | Generated pacing is a stopgap; yours should replace it |
| **P3** | [Course pacing](F6-course-pacing.md) | @keithrbennett | [#7](https://github.com/stevef24/fable-hacketon/issues/7) | Never played end to end |

**@1320group never started**, so their city tickets were reassigned to Kevin and vivi, and P1 picked up the crowd and water.

## Done

| Ticket | Who | What landed |
|---|---|---|
| F2 · Lighting | P1 | Golden-hour key + cool sky fill, emissive lanterns, warmed palette |
| F8 · Audio | @vivi09032000 | Full Web Audio synthesis, zero binary assets, persisted mute |
| F9 · Post-processing | P1 | Bloom, vignette, ACES filmic tone mapping |
| F10 · Movement feel | @dungle-scrubs | Frame-accurate timer, steering ramp, crash stumble |
| F13 · Crowd animation | P1 | 520 spectators hopping on individual phases |
| F14 · Moat water | P1 | Per-vertex ripples, specular highlight that catches bloom |
| — · Course density | P1 | Gaps capped at 95m (was 754m); 40 obstacles to 89 |

## Two rules

**Only edit files you own.** Ownership map is in [`../../PLAN.md`](../PLAN.md).

**Never call `set()` on the zustand store inside `useFrame`.** Per-frame values live in the mutable `runner` object.

## Traps already paid for

- Anything dividing by `dt` inside `useFrame` must guard `dt > 0`. `dt` is genuinely 0 on the first frame and whenever a backgrounded tab resumes. A `0/0` reaching a `damp()` propagates NaN permanently — it cost us a view model prop that was silently unrenderable with **no console error**. See 1914556.
- `getRightAt` is `forward × up`, i.e. `(-tz, 0, tx)`. Negating it inverts steering. Covered by `npm test`.
- Animating a drei `<Instances>` per frame means fighting drei for the matrix buffer. Use a raw `InstancedMesh` — see `src/world/Crowd.tsx`.

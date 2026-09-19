# Fidelity tickets

The game plays. It does not yet *look* like `docs/reference/`. These tickets close that gap.

Ordered by impact per hour — if you only do one thing, do the one at the top of your column.

| | Ticket | Owner | Why it matters |
|---|---|---|---|
| **F1** | [Gates](F1-gates.md) | @1320group | The most recognisable thing in the game, currently boxes |
| **F2** | [Lighting & sky](F2-lighting.md) | @1320group | Cheapest large win — changes everything, touches no geometry |
| **F3** | [Shophouses](F3-shophouses.md) | @1320group | Makes the horizon a city instead of a bar chart |
| **F4** | [Lanterns & dressing](F4-dressing.md) | @1320group | Fills the empty road between obstacles |
| **F5** | [Obstacle models](F5-obstacle-models.md) | @keithrbennett | The things players look at most |
| **F6** | [Course pacing](F6-course-pacing.md) | @keithrbennett | The course has never been played end to end |
| **F7** | [HUD art pass](F7-hud-art.md) | @vivi09032000 | Currently reads as styled HTML, not as the art |
| **F8** | [Audio](F8-audio.md) | @vivi09032000 | A must-have, and completely absent |
| **F9** | [Post-processing](F9-postprocessing.md) | unclaimed | Highest fidelity-per-hour; independent of everything else |

## Two rules

**Only edit files you own.** The ownership map is in [`../../PLAN.md`](../PLAN.md). Five people in one small repo is a merge problem, not a capacity problem.

**Never call `set()` on the zustand store inside `useFrame`.** Per-frame values live in the mutable `runner` object. This is the fastest way to make the game feel bad.

## One trap, already paid for

Anything dividing by `dt` inside `useFrame` must guard `dt > 0`. `dt` is genuinely 0 on the first frame and whenever a backgrounded tab resumes. A `0/0` reaches a `damp()` and NaN then propagates permanently — it cost us a view model prop that was silently unrenderable with **no console error at all**. See commit 1914556.

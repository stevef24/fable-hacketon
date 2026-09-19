# F10 · Movement feel: fair timer, steering ramp, lap tuning, crash recovery

**Owner:** @dungle-scrubs (P2) · **Priority:** 1 — item 1 blocks Keith

Follow-on from the merged view model (PR #1). In priority order.

## 1. The timer is unfair across machines

`elapsed` is wall-clock (`performance.now() - startedAt`) but `distance` is frame-integrated from a clamped `dt`. A slow machine, a dropped frame or a tab switch burns clock while the runner barely moves — so two players running identically post different times.

Accumulate clamped `dt` into the timer instead, so the clock and the simulation agree.

**Do this first.** Keith is tuning the course against these numbers in F6, and if the timer changes afterwards his pacing work is invalidated.

## 2. Steering is linear and instant

`runner.lateral` moves at a flat `STEER_SPEED` with no ramp, so it feels twitchy rather than weighty. Add acceleration and damping. Your lean already reacts to lateral velocity, so it should improve for free.

## 3. Tune for a ~6:42 lap

To match `docs/reference/03-results-screen.png`. A clean lap is currently ~6:40, but obstacles will push it well past. Tune *with Keith*, not in isolation — you are both moving the same number from opposite ends.

## 4. The motorbike crash teleports you backwards

`applyEffect` sets `runner.distance = runner.lastGateDistance` instantly. In first person that reads as a glitch, not a penalty. It needs a stumble, a brief fade, or a short camera drop — something that tells the player what just happened to them.

## Watch out for

Anything dividing by `dt` needs a `dt > 0` guard — that is what produced the NaN in PR #1.

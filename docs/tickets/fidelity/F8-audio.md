# F8 · Audio: footsteps, bark, horn, splash, market ambience

**Owner:** @vivi09032000 (P5) · **Priority:** 1

There is no sound at all right now, and it is one of the four must-haves. `src/ui/audio.ts` does not exist yet.

Needed:

- Running footsteps that scale in rate with speed
- A dog bark when a boost fires
- A motorbike horn on a crash
- A water splash in wet zones
- Light market ambience, and a music loop underneath

Source CC0 audio — freesound or the Kenney audio packs.

Two things that will bite you otherwise: **gate all audio behind the Start button click**, or browser autoplay policy will silently block it; and include a mute toggle, because whoever is demoing will want it.

Obstacle hits already push through the store (`showFlash`, `bumpStat`), so hooking sound onto them is a small change.

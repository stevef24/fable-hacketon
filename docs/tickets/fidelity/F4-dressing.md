# F4 · Lanterns, banners and market dressing along the route

**Owner:** @1320group (P4) · **Priority:** 5

The reference is dense with lanterns, Songkran flags, umbrellas, market stalls and signage. Our road is empty between obstacles, which is exactly what makes 6.4km feel long and bare.

Instance dressing along the track using `getPointAt` / `getRightAt` / `getTangentAt` from `src/game/track.ts` — the same way `City.tsx` places walls and trees.

Emissive lantern materials will pick up beautifully once F2 lands, so consider doing F2 first. Vary the density: a busy market stretch followed by a quiet one is far more interesting than uniform spacing, and it gives Keith's course pacing something to play against.

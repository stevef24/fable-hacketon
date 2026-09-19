# F2 · Golden-hour lighting, sky and fog pass

**Owner:** @1320group (P4) · **Priority:** 2 — cheapest large win in the project

Right now it is one hemisphere light plus one directional, and everything reads as untextured boxes. The reference art is all warm low sun, long shadows, and glowing lanterns.

Worth trying in `src/world/City.tsx`:

- Warm key light low on the horizon, cool fill from the sky
- A gradient sky (drei `<Sky/>` or a shader backdrop) instead of the flat colour we have
- Fog tuned so distance reads as depth rather than as a wall
- Shadows on the gates and obstacles only — never on everything, the frame budget will not take it

**Change no geometry in this ticket.** Light alone should transform how it reads. If it does not, that tells us something useful before anyone models anything.

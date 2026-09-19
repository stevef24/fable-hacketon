# F1 · Tha Phae Gate hero geometry + the other three gates

**Owner:** @1320group (P4) · **Priority:** 1 — do this before anything else

The gates are the single most recognisable thing in the game, and right now they are boxes.

See `docs/reference/02-title-screen.png`: twin crenellated brick towers, an arch over the road, the Thai signboard (ประตูท่าแพ / THA PHAE GATE), Songkran bunting strung across.

`src/world/Gate.tsx` already places one at each of the four corners via `City.tsx`. Make Tha Phae the hero — it is the start line and the finish line, the first and last thing a judge sees. The other three (Chiang Mai, Suan Dok, Chang Phuak) can be simpler variants of the same kit.

**Done when:** you can tell which gate you are at without reading the HUD.

# F7 · HUD and screens art pass

**Owner:** @vivi09032000 (P5) · **Priority:** 2

The HUD and both screens work, but they look like styled HTML rather than like `docs/reference/`. That art has carved wooden signboards, parchment panels, chunky display lettering and icon-led stat rows.

In `src/ui/` and `src/index.css`:

- A display font with real personality for the logo, timer and headings
- Panels that read as wood and parchment, not flat cream rectangles
- The gate progress bar as a carved track with pips, per `docs/reference/01-in-run-hud.png`
- Results panels matching the three-column layout in `docs/reference/03-results-screen.png`

**Keep `font-variant-numeric: tabular-nums` on the timer** — it is what stops the digits jittering as they change, and it is easy to lose in a restyle.

You own everything outside the `<Canvas>`. Nothing in this ticket should require touching game logic.

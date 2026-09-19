# F9 · Post-processing: bloom, vignette, colour grade

**Owner:** unclaimed — highest fidelity-per-hour on the board

Independent of everyone else's work, which is what makes it valuable: it lifts whatever exists at the time it lands.

`@react-three/postprocessing` with a restrained stack:

- Mild **bloom**, so lanterns and the gold HUD glow
- A **vignette** to pull the eye to the centre of frame
- A warm **colour grade** toward the reference palette
- Optionally slight **chromatic aberration at speed**, reinforcing the FOV stretch Kevin already built

Keep it subtle. Overdone bloom is the single fastest way to make something look like a tech demo instead of a game.

**Measure the frame cost before and after.** If it drops below 50fps it is not worth having, and it should be the first thing cut on demo day.

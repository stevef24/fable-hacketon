# public/audio/ — P5 (vivi09032000)

The game ships with **fully synthesized** sound (Web Audio API, in
`src/ui/audio.ts`), so no binary assets are required to run or deploy.

If you want to swap in real recordings later, source **CC0** clips from
[freesound.org](https://freesound.org) (filter: License → Creative Commons 0)
or a [Kenney audio pack](https://kenney.nl/assets?q=audio), drop them here as:

| File            | Used for                | Trigger                |
| --------------- | ----------------------- | ---------------------- |
| `bark.mp3`      | soi dog boost           | `emitEffect('dog')`    |
| `horn.mp3`      | motorbike horn          | `emitEffect('motorbike')` |
| `splash.mp3`    | Songkran water splash   | `emitEffect('splash')` |
| `murmur.mp3`    | market / massage stretch| `emitEffect('food' | 'massage')` |
| `music.mp3`     | looping background bed  | `startMusic()`         |

Then replace the synth generators in `src/ui/audio.ts` with a buffer loader —
the `play()` / `playForKind()` / `startMusic()` API stays the same.

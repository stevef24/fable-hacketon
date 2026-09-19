# F5 · Obstacle models to match the reference art

**Owner:** @keithrbennett (P3) · **Priority:** 3

`src/entities/Obstacles.tsx` has working shapes but they are crude — the motorbike is three boxes, the massage lady is a stack of boxes. The reference shows characterful voxel figures with real personality.

The hit test is completely independent of the visuals (distance along track + lane offset), so you can replace geometry freely without touching gameplay or retuning anything.

Priority order, by how often a player sees them:

1. **Motorbike** — most frequent, and the harshest penalty, so it must read instantly
2. **Massage lady** — the funniest one, per the reference speech bubbles
3. **Soi dog** — matters most emotionally, it is the obstacle players *want* to hit
4. **Food cart** — mango sticky rice, umbrella, steam
5. **Wet zone** — currently a flat blue disc; splash particles would sell it

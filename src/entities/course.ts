// OWNER: P3 (Keith). Where everything sits on the lap.
// Paced deliberately, not scattered: the first stretch is clear so players
// learn the controls, dogs sit just before long straights so the boost pays
// off, and the massage shops cluster the way they really do on the moat road.
import type { ObstacleKind, ObstacleSpec } from '../game/contract';

const specs: ObstacleSpec[] = [];
let n = 0;
const put = (kind: ObstacleKind, t: number, lane: number) =>
  specs.push({ id: `o${n++}`, kind, t, lane });

/** Evenly spread `count` obstacles between two points on the lap. */
const run = (kind: ObstacleKind, from: number, to: number, count: number, lanes: number[]) => {
  for (let i = 0; i < count; i++) {
    const t = from + ((to - from) * i) / Math.max(1, count - 1);
    put(kind, t, lanes[i % lanes.length]);
  }
};

// ── Leg 1: Tha Phae → Chiang Mai Gate. The tourist strip.
// Nothing before 0.04 so the player finds their feet.
run('massage', 0.05, 0.11, 4, [-0.7, 0.6, -0.5, 0.75]);
run('motorbike', 0.08, 0.2, 4, [0.3, -0.35, 0.45, -0.2]);
put('dog', 0.13, 0.1); // long clear stretch after this
run('food', 0.15, 0.22, 3, [0.65, -0.6, 0.5]);
put('splash', 0.21, -0.1);

// ── Leg 2: Chiang Mai → Suan Dok. Songkran water fight.
run('splash', 0.27, 0.42, 6, [0, -0.5, 0.5, 0.2, -0.3, 0.4]);
run('motorbike', 0.3, 0.46, 5, [-0.4, 0.35, 0, 0.5, -0.3]);
put('dog', 0.33, -0.4);
put('dog', 0.44, 0.35);
run('massage', 0.36, 0.44, 3, [0.7, -0.75, 0.6]);

// ── Leg 3: Suan Dok → Chang Phuak. Quieter, faster, the place to make time.
put('dog', 0.53, 0);
run('motorbike', 0.56, 0.72, 4, [0.4, -0.45, 0.25, -0.3]);
run('food', 0.6, 0.68, 3, [-0.65, 0.6, -0.5]);
put('dog', 0.7, 0.2);

// ── Leg 4: Chang Phuak → Finish. Night market crush, then a sprint home.
run('food', 0.78, 0.86, 4, [0.6, -0.55, 0.7, -0.65]);
run('massage', 0.8, 0.89, 4, [-0.75, 0.7, -0.6, 0.8]);
run('motorbike', 0.82, 0.95, 5, [0, 0.4, -0.4, 0.3, -0.25]);
run('splash', 0.87, 0.93, 3, [0.5, -0.5, 0.15]);
put('dog', 0.9, -0.15); // one last boost into the finish

export const COURSE: ObstacleSpec[] = specs.sort((a, b) => a.t - b.t);

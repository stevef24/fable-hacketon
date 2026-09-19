// OWNER: P3 (Keith). Where every obstacle sits. Designed, not scattered.
//
// THE MODEL. The lap runs CLOCKWISE (north up) from Tha Phae Gate on the east
// wall: south down the east moat, west along the south moat past Chiang Mai
// Gate, north up the west moat past Suan Prung and Suan Dok, east along the
// north moat past Chang Phuak, then down the east side again through Sri Phum
// and Moon Muang to the gate. Heading clockwise the city is on the RUNNER'S
// RIGHT and the moat on the left, so shopfronts and stalls sit at positive
// lane and parked/moving traffic favours the left.
//
// ANCHORS below are metres along the lap for a ~300 x 260 rounded-rectangle
// track with t=0 at Tha Phae Gate, mid east side, heading south. Every row is
// written as an anchor plus an offset, so if P2's real track puts a corner or
// gate somewhere else, retune ANCHORS and each cluster moves with its landmark.
// (Corners are ~72 m long, so a corner's exit is anchor + 36.)
//
// TUNING NUMBERS THAT DRIVE THE LAYOUT (see effects.ts / contract.ts):
//   - hit box is 3.0 m deep x 3.2 m wide on a 12 m road, so an obstacle with
//     |lane| < ~0.27 sits on the centreline and catches anyone who never
//     steers. Central lanes are the difficulty knob; edge lanes are gifts.
//   - lateral dodge speed is 9 m/s: crossing 6 m of road costs 0.67 s, i.e.
//     ~9 m of forward travel at 14 m/s and ~14 m at dog speed (21.7 m/s).
//   - a dog boost is ~65 m of road. Nothing is placed inside that window, so
//     the boost is spent on open tarmac (or the player is punished for
//     the reward: 21.7 m/s and a market stall do not mix).
import { BASE_SPEED, TRACK_LENGTH, type ObstacleSpec } from '../game/contract';

/**
 * Opening stretch that stays empty so players learn to steer, in METRES.
 *
 * This was a lap fraction (0.08), which was right for the 1200m track it was
 * written against -- 96m, about six seconds. On the real 6400m moat the same
 * fraction became 512m, so the first obstacle sat 38 seconds into the run and
 * the game looked empty. A learning zone is a fixed span of road, not a
 * proportion of the lap, so it is absolute now.
 */
export const CLEAR_ZONE_M = 110;

/** Metres along the lap. */
// Expressed as fractions of the lap so they survive TRACK_LENGTH changing.
// The three gate anchors line up exactly with GATES in contract.ts (t = 0.25,
// 0.5, 0.75); the corners sit halfway between them. Keith: the corner and
// minor-gate positions are my approximation, not yours -- retuning them is
// exactly issue #7.
export const ANCHORS = {
  thaPhaeGate: 0,
  seCorner: TRACK_LENGTH * 0.125,
  chiangMaiGate: TRACK_LENGTH * 0.25,
  swCorner: TRACK_LENGTH * 0.375,
  suanPrungGate: TRACK_LENGTH * 0.42,
  suanDokGate: TRACK_LENGTH * 0.5,
  nwCorner: TRACK_LENGTH * 0.625,
  changPhuakGate: TRACK_LENGTH * 0.75,
  sriPhumCorner: TRACK_LENGTH * 0.875,
  finish: TRACK_LENGTH,
} as const;

/**
 * Riders sit still until the runner is `trigger` metres away, then pull out
 * and ride toward the runner at `speed` m/s, like a real motorbike coming out
 * of a soi: no warning until it is committed. `spec.t` is where it WAITS. In
 * ROWS a rider's metre mark is where you will MEET it at base speed, so the
 * layout can be reasoned about; `pullOut` converts that to the waiting spot.
 */
export interface Ride {
  speed: number;
  trigger: number;
}

export interface CourseEntry extends ObstacleSpec {
  ride?: Ride;
}


const RIDE: Ride = { speed: 7, trigger: 32 };
/** How much closer than its waiting spot a rider meets a runner going BASE_SPEED. */
const pullOut = (r: Ride) => (r.trigger * r.speed) / (BASE_SPEED + r.speed);

type Row = [kind: ObstacleSpec['kind'], metres: number, lane: number, ride?: true];

const ROWS: Row[] = [];
const put = (kind: Row[0], metres: number, lane: number, ride?: true) =>
  ROWS.push([kind, metres, lane, ride]);

/**
 * A run of one kind spread evenly between two marks, cycling through lanes.
 * Authoring at this level keeps the intent of a stretch readable -- "the
 * massage strip runs from here to here, on the shop side" -- instead of a
 * wall of individual coordinates.
 */
const stretch = (
  kind: Row[0],
  from: number,
  to: number,
  count: number,
  lanes: number[],
  ride?: true,
) => {
  for (let i = 0; i < count; i++) {
    const m = count === 1 ? from : from + ((to - from) * i) / (count - 1);
    put(kind, m, lanes[i % lanes.length], ride);
  }
};

const A2 = ANCHORS;

// ═══ LEG 1 · Tha Phae → Chiang Mai Gate ═══════════════════════════════════
// Teach, then tempt. Nothing before CLEAR_ZONE_M. The first obstacles sit on
// the outer lanes and are free to ignore, so a new player learns that lanes
// matter before anything punishes them for not knowing.
stretch('splash', 170, 430, 3, [0.8, -0.75, 0.7]);
put('motorbike', 520, -0.55);
put('dog', 610, 0.35); // first boost, onto open road
stretch('massage', 760, 1040, 5, [0.7, -0.65, 0.75, -0.7, 0.65]); // Lanna massage strip
stretch('motorbike', 1120, 1330, 3, [0.35, -0.4, 0.2], true); // traffic out of the sois
stretch('food', 1400, 1560, 4, [-0.5, 0.45, -0.25, 0.5]); // market into the gate

// ═══ LEG 2 · Chiang Mai → Suan Dok ════════════════════════════════════════
// Songkran. Water everywhere, traffic threading through it. Lanes tighten.
put('dog', A2.chiangMaiGate + 90, -0.3);
stretch('splash', 1800, 2260, 7, [0, -0.45, 0.4, 0.15, -0.35, 0.5, -0.15]);
stretch('motorbike', 1900, 2340, 4, [-0.4, 0.3, -0.2, 0.45], true);
stretch('massage', 2420, 2660, 4, [0.6, -0.6, 0.55, -0.5]);
put('dog', 2740, 0.25);
stretch('splash', 2820, 3080, 5, [-0.2, 0.35, 0, -0.4, 0.3]);
stretch('food', 2960, 3160, 3, [0.5, -0.45, 0.25]);

// ═══ LEG 3 · Suan Dok → Chang Phuak ═══════════════════════════════════════
// The quiet leg, and where a good time is actually made. Fewer obstacles but
// meaner placement: more of them sit on the racing line.
put('dog', A2.suanDokGate + 70, 0);
stretch('motorbike', 3380, 3820, 4, [0.15, -0.2, 0.1, -0.15], true);
stretch('splash', 3900, 4080, 3, [-0.3, 0.25, 0]);
stretch('massage', 4140, 4340, 3, [0.55, -0.5, 0.15]);
put('dog', 4420, -0.2);
stretch('motorbike', 4480, 4760, 4, [0, 0.25, -0.25, 0.1], true);

// ═══ LEG 4 · Chang Phuak → Finish ═════════════════════════════════════════
// Night market crush, then the run home. Densest and most central: by now the
// player knows the controls, so this is where the lap earns its time.
stretch('food', 4880, 5180, 6, [0.4, -0.35, 0.2, -0.45, 0.3, -0.15]);
stretch('massage', 5060, 5380, 5, [-0.3, 0.35, -0.2, 0.4, 0]);
stretch('motorbike', 5240, 5720, 6, [0.1, -0.2, 0, 0.25, -0.15, 0.2], true);
put('dog', 5800, 0.3); // last boost, into the sprint
stretch('splash', 5880, 6180, 5, [0, -0.3, 0.25, -0.15, 0.2]);
stretch('motorbike', 6020, 6280, 3, [-0.2, 0.15, 0], true);
// Songkran gauntlet across the finish line itself.
stretch('splash', 6300, 6370, 3, [0.35, -0.35, 0]);

const counts: Record<string, number> = {};

export const COURSE: CourseEntry[] = ROWS.map(([kind, metres, lane, rides]) => {
  const n = (counts[kind] = (counts[kind] ?? 0) + 1);
  return {
    id: `${kind}-${n}`,
    kind,
    t: (metres + (rides ? pullOut(RIDE) : 0)) / TRACK_LENGTH,
    lane,
    ...(rides ? { ride: RIDE } : {}),
  };
}).sort((a, b) => a.t - b.t);

if (import.meta.env.DEV) {
  COURSE.forEach((o, i) => {
    if (o.t * TRACK_LENGTH < CLEAR_ZONE_M)
      console.warn(`course: ${o.id} sits inside the ${CLEAR_ZONE_M}m clear zone`);
    if (i > 0 && o.t < COURSE[i - 1].t) console.warn(`course: ${o.id} is out of order`);
  });
}

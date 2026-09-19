// OWNER: P3 (Keith). Where every obstacle sits. Designed, not generated.
//
// THE GEOMETRY (measured off the real curve in track.ts, 6400 m lap):
//   four straights of ~1205 m joined by four corners of ~395 m, and each GATE
//   sits at a corner EXIT (t = 0, .25, .5, .75). So a leg is: gate, a long
//   straight, a corner, the next gate. The obstacles below are written as
//   metres from the gate that opens the leg.
//
// THE MODEL. The lap runs CLOCKWISE (north up) from Tha Phae Gate: south down
// the east moat, along the south moat to Chiang Mai Gate, up the west moat past
// Suan Dok, along the north moat to Chang Phuak, and home down Moon Muang
// through Sri Phum. Heading clockwise the city is on the RUNNER'S RIGHT, so
// shopfronts, stalls and parked scooters sit at positive lane and the moving
// traffic favours the left. Real landmarks are matched to the game's gates and
// corners by ORDER, not by exact distance: in the game a corner is the last
// quarter of a leg, in real life it is the middle, so this is a caricature.
//
// THE DIFFICULTY RAMP. Legs carry 26 / 30 / 35 / 36 obstacles, and the last
// leg is the densest, so the run home is the hardest and you cannot coast it.
//
// THE RULES THIS FILE ENFORCES (see the DEV checks at the bottom):
//   - the first CLEAR_ZONE_M metres are empty so players learn to steer.
//     Kept short: a runner covers 16m a second, so 45m is under three
//     seconds. Longer than that and the game looks empty before it starts.
//   - nothing is closer than MIN_SPACING to its neighbour
//   - every dog is followed by BOOST_CLEAR metres of open road, so the 3 s
//     boost is spent on open tarmac and is felt as a reward, not spent
//     dodging a market at 25 m/s
//
// NUMBERS THAT DRIVE THE LAYOUT (see effects.ts / contract.ts):
//   - the hit box is 3.0 m deep x 3.2 m wide on a 12 m road, so an obstacle
//     with |lane| < ~0.27 sits on the centreline and catches anyone who never
//     steers. Central lanes are the difficulty knob; |lane| > 0.7 is a gift.
//   - lateral dodge is ~10 m/s: crossing half the road costs ~0.6 s, ~10 m of
//     forward travel at cruise and ~15 m at dog speed.
//   - a dog is worth ~1.65 s. Simulated, a player who takes every dog but
//     misses one obstacle in five (about eight bad hits) finishes in ~6:44,
//     right on the 6:42 target in docs/reference/03-results-screen.png. A
//     perfect dodger with no dogs is 6:40; one who never steers is ~7:52.
//   - the only gaps over ~95 m are the open road after a dog, and the two
//     deliberate beats of quiet before Chiang Mai Gate's market and Suan Dok's
//     junction, so those hit harder.
import { BASE_SPEED, TRACK_LENGTH, type ObstacleSpec } from '../game/contract';
import { EFFECTS } from './effects';

/**
 * Opening stretch that stays empty so players learn to steer, in METRES.
 * A learning zone is a fixed span of road, not a proportion of the lap.
 */
export const CLEAR_ZONE_M = 45;

/** Nothing sits closer than this to the obstacle before it, in metres. */
export const MIN_SPACING = 14;

/** Open road promised after every dog: its boost distance plus a margin. */
export const BOOST_CLEAR =
  Math.ceil(BASE_SPEED * EFFECTS.dog.multiplier * (EFFECTS.dog.durationMs / 1000)) + 15;

const lap = (metres: number) => (metres / 6400) * TRACK_LENGTH;

/** Metres along the lap. The gates match GATES in contract.ts. */
export const ANCHORS = {
  thaPhaeGate: 0,
  /** South-east corner: the last 395 m of leg one. */
  seCorner: [lap(1250), lap(1645)],
  chiangMaiGate: TRACK_LENGTH * 0.25,
  swCorner: [lap(2850), lap(3245)],
  suanDokGate: TRACK_LENGTH * 0.5,
  nwCorner: [lap(4450), lap(4845)],
  changPhuakGate: TRACK_LENGTH * 0.75,
  /** Sri Phum: the corner that ends the lap. Moon Muang and the finish are inside it. */
  sriPhumCorner: [lap(6050), lap(6445)],
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

/** kind, metres from the gate that opens the leg, lane -1..1 (+ = the city side), rider? */
type Row = [kind: ObstacleSpec['kind'], metres: number, lane: number, ride?: true];

/** Marks a motorbike as a rider that pulls out. Without it, a motorbike is parked. */
const R = true;

// ── LEG 1 · Tha Phae Gate → Chiang Mai Gate  (0 – 1600 m) ────────────────
// Down the east moat on Moon Muang, then round the south-east corner into the
// Chiang Mai Gate night market. The easiest leg: mostly outer-lane gifts and
// parked scooters, one massage pair, and three dogs to teach the reward.
const LEG1: Row[] = [
  ['splash', 62, 0.8], // the last of the Songkran crowd at Tha Phae: a gift
  ['massage', 112, -0.78], // first local calling you over, still wide
  ['motorbike', 168, 0.75], // rental scooters lined up outside the guesthouses
  // Moon Muang's massage row: two ladies on the shop side.
  ['massage', 240, 0.7],
  ['massage', 262, 0.65],
  ['food', 300, 0.7], // a cart on the kerb
  ['motorbike', 345, -0.25, R], // the first real dodge: something pulls out
  ['splash', 385, -0.5],
  ['dog', 430, 0.4], // first dog, on the open moat road: 115 m clear after it
  ['motorbike', 545, 0.75],
  ['motorbike', 585, -0.45, R],
  ['food', 630, -0.6],
  ['massage', 675, 0.7],
  ['dog', 770, -0.4], // 115 m clear after it
  ['motorbike', 885, 0.5, R],
  ['splash', 955, 0.35],
  ['food', 1005, -0.3],
  ['massage', 1050, 0.6],
  ['motorbike', 1095, 0.2, R],
  ['dog', 1180, 0.4], // the last boost carries you into the corner
  ['motorbike', 1300, -0.3, R], // south-east corner
  ['splash', 1350, 0.5],
  ['food', 1420, 0.55], // a vendor at the apex, as the market's smell reaches you
  // ...then a deliberate beat of quiet (110 m) before the market opens.
  // The Chiang Mai Gate night market: stalls zig-zag round the centreline so
  // the run has to weave. The gate itself is at 1600 m.
  ['food', 1530, -0.55],
  ['food', 1550, 0.2],
  ['food', 1570, -0.3],
  ['food', 1590, 0.55],
  ['food', 1610, -0.1],
  ['food', 1630, 0.3],
];

// ── LEG 2 · Chiang Mai Gate → Suan Dok Gate  (1600 – 3200 m) ─────────────
// Traffic spills out of the market, then the long quiet south-west moat with
// student scooters and songthaews, ending in the busiest junction on the loop.
const LEG2: Row[] = [
  ['massage', 50, 0.7], // straight out of the corner: the shopfront after the gate
  ['motorbike', 90, -0.4, R], // spill from the gate junction
  ['dog', 180, 0.4],
  ['food', 295, 0.7],
  ['motorbike', 335, -0.2, R],
  ['massage', 375, 0.65],
  ['motorbike', 450, 0.5, R],
  ['food', 490, -0.5],
  ['dog', 530, -0.4],
  ['motorbike', 645, 0.75],
  ['motorbike', 680, -0.3, R],
  ['massage', 720, 0.7],
  ['massage', 740, -0.15], // steps into the road to wave you in
  ['splash', 785, 0.55],
  ['food', 830, 0.2],
  ['motorbike', 875, 0.3, R],
  ['dog', 960, 0.4], // the boost carries you toward the corner
  ['motorbike', 1080, -0.6],
  ['motorbike', 1120, 0.4, R],
  ['food', 1210, 0.55],
  ['motorbike', 1300, -0.25, R], // south-west corner
  ['splash', 1350, 0.6],
  ['food', 1400, -0.4],
  // A beat of quiet (110 m), then...
  // Suan Dok Gate at 1600 m is where Suthep Road spills in: the densest
  // scooter cluster on the lap, then it drops off.
  ['motorbike', 1510, 0.45, R],
  ['motorbike', 1530, -0.25],
  ['motorbike', 1550, 0.1, R],
  ['motorbike', 1570, -0.5, R],
  ['motorbike', 1595, 0.35],
  ['motorbike', 1615, -0.15, R],
  ['splash', 1635, 0.5],
];

// ── LEG 3 · Suan Dok Gate → Chang Phuak Gate  (3200 – 4800 m) ────────────
// Up the west moat: the busiest straight for scooters, with massage shops
// every few hundred metres, then the north-west corner and the Chang Phuak
// night-food stalls at the gate.
const LEG3: Row[] = [
  ['massage', 70, 0.65], // just past the junction, on the shop side
  ['motorbike', 100, 0.35, R],
  ['dog', 140, -0.4],
  ['motorbike', 260, 0.75],
  ['food', 300, -0.5],
  ['motorbike', 340, -0.3, R],
  ['massage', 380, 0.65],
  ['motorbike', 460, 0.2, R],
  ['food', 500, 0.55],
  ['dog', 540, 0.4],
  ['massage', 660, 0.7],
  ['splash', 695, -0.45],
  ['motorbike', 735, -0.35, R],
  ['motorbike', 775, 0.5],
  ['food', 815, -0.2],
  ['massage', 855, 0.65],
  ['motorbike', 895, 0.3, R],
  ['splash', 935, -0.5],
  ['dog', 975, -0.4],
  ['motorbike', 1090, 0.4, R],
  ['food', 1125, -0.55],
  ['motorbike', 1200, -0.2, R],
  ['massage', 1280, 0.7], // north-west corner
  ['motorbike', 1320, 0.35, R],
  ['food', 1370, -0.4],
  ['splash', 1420, 0.5],
  ['motorbike', 1470, -0.3, R],
  ['motorbike', 1515, 0.6],
  // Chang Phuak Gate at 1600 m: night-market stalls, a tighter run than
  // Chiang Mai Gate's.
  ['food', 1535, 0.4],
  ['food', 1550, -0.45],
  ['food', 1565, 0.1],
  ['food', 1580, -0.5],
  ['food', 1595, 0.5],
];

// ── LEG 4 · Chang Phuak Gate → Tha Phae Gate  (4800 – 6400 m) ────────────
// The run home is the densest, and the last obstacle is on the finish line.
// Along the north moat, round Sri Phum, and down Moon Muang: the massage
// strip, then Songkran at the gate.
const LEG4: Row[] = [
  ['motorbike', 40, 0.35, R],
  ['massage', 80, 0.65],
  ['dog', 170, -0.4],
  ['motorbike', 285, 0.6],
  ['motorbike', 315, 0.3, R],
  ['food', 350, -0.5],
  ['motorbike', 420, -0.25, R],
  ['massage', 455, 0.65],
  ['motorbike', 490, 0.45, R],
  ['food', 560, 0.3],
  ['motorbike', 595, -0.5, R],
  ['massage', 630, -0.1],
  ['dog', 700, 0.4],
  ['motorbike', 815, -0.3, R],
  ['motorbike', 850, 0.7],
  ['motorbike', 885, 0.2, R],
  ['food', 920, -0.45],
  ['motorbike', 990, -0.15, R],
  ['massage', 1025, 0.6],
  ['motorbike', 1060, 0.4, R],
  ['food', 1130, 0.25],
  ['motorbike', 1165, -0.35, R],
  ['splash', 1200, 0.6],
  // Sri Phum: the second-busiest junction.
  ['motorbike', 1295, -0.4, R],
  ['motorbike', 1330, 0.1, R],
  ['motorbike', 1360, -0.5],
  // Moon Muang Road: the massage strip. Shopfronts on the city side, with one
  // lady stepping out to wave the runner in.
  ['massage', 1395, 0.7],
  ['massage', 1415, 0.65],
  ['massage', 1435, -0.15],
  ['massage', 1455, 0.7],
  ['food', 1480, 0.7], // Sompet-market side of the road
  ['motorbike', 1500, -0.25, R],
  // Songkran at the gate, right on the finish line: a last gauntlet.
  ['splash', 1530, 0.4],
  ['splash', 1545, -0.45],
  ['splash', 1560, 0.1],
  ['splash', 1575, -0.3],
];

const GATE_STARTS = [0, 0.25, 0.5, 0.75].map((f) => f * TRACK_LENGTH);
const ROWS: Row[] = [LEG1, LEG2, LEG3, LEG4].flatMap((leg, i) =>
  leg.map(([kind, metres, lane, rides]): Row => [kind, GATE_STARTS[i] + metres, lane, rides]),
);

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

// The rules in the header, checked on every hot reload so a hand edit that
// breaks the pacing says so immediately instead of at the booth.
if (import.meta.env.DEV) {
  const metres = (o: CourseEntry) => o.t * TRACK_LENGTH - (o.ride ? pullOut(o.ride) : 0);
  COURSE.forEach((o, i) => {
    const m = metres(o);
    if (m < CLEAR_ZONE_M) console.warn(`course: ${o.id} sits inside the ${CLEAR_ZONE_M}m clear zone`);
    if (i > 0) {
      const gap = m - metres(COURSE[i - 1]);
      if (gap < 0) console.warn(`course: ${o.id} is out of order`);
      else if (gap < MIN_SPACING) console.warn(`course: ${o.id} is only ${gap.toFixed(1)}m after ${COURSE[i - 1].id}`);
    }
    if (o.kind === 'dog') {
      const next = COURSE[i + 1];
      if (next && metres(next) - m < BOOST_CLEAR) {
        console.warn(
          `course: ${o.id}'s boost is cut short: ${next.id} is ${(metres(next) - m).toFixed(0)}m ahead, need ${BOOST_CLEAR}m`,
        );
      }
    }
  });
}

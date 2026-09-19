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

// Metres are where the runner meets the obstacle. Lane is -1..1 across the road;
// positive = the runner's right = the city side.
const A = ANCHORS;
const ROWS: Row[] = [
  // ── Tha Phae Gate → south-east corner ──────────────────────────────────
  // 0-96 m is the learn-to-steer zone, and the corner takes the rest of the
  // first breath. The first two obstacles are gifts on the outer lanes.
  ['splash', A.seCorner - 7, 0.75], // Songkran kid lingering from the gate crowd
  ['motorbike', A.seCorner + 27, -0.4], // first parked bike: a hard dodge, forgiving spacing

  // ── South moat: dog, then the Chiang Mai Gate night market ────────────
  ['dog', A.seCorner + 53, 0.4], // just out of the corner: ~65 m of open road to spend the boost on
  // The market opens 19 m after the boost ends. Stalls zig-zag around centre
  // so the run has to weave; refreshing (not stacking) food keeps it fair.
  ['food', A.chiangMaiGate - 24, -0.55],
  ['food', A.chiangMaiGate - 10, 0.2],
  ['food', A.chiangMaiGate + 4, -0.3], // ← Chiang Mai Gate itself at 286 m
  ['food', A.chiangMaiGate + 18, 0.55],
  ['food', A.chiangMaiGate + 32, -0.1],
  // Traffic spills out of the gate junction as the market ends.
  ['motorbike', A.chiangMaiGate + 60, 0.3, true],
  ['motorbike', A.chiangMaiGate + 78, -0.35, true],
  ['splash', A.swCorner - 48, -0.6], // breather: an outer-lane freebie into the corner

  // ── South-west corner → Suan Prung → west moat ────────────────────────
  ['massage', A.swCorner + 40, 0.65], // first shopfront after the SW corner, city side
  // The west moat is the longest straight, so this dog has the most road to spend.
  ['dog', A.swCorner + 66, -0.4], // ~65 m boost
  // Suan Dok Gate is the busiest junction on the loop (Suthep Rd + the
  // Nimman side spill in here); bike density peaks and then drops off.
  ['motorbike', A.suanDokGate + 10, 0.45, true],
  ['motorbike', A.suanDokGate + 24, -0.25],
  ['motorbike', A.suanDokGate + 37, 0.1, true],
  ['motorbike', A.suanDokGate + 54, -0.5, true],
  ['splash', A.suanDokGate + 82, 0.35],
  ['motorbike', A.nwCorner - 23, 0.35, true],
  ['splash', A.nwCorner + 13, -0.3], // north-west corner apex

  // ── North-west corner → north moat → Chang Phuak ──────────────────────
  ['massage', A.nwCorner + 45, 0.65], // straight after the corner
  ['dog', A.nwCorner + 67, -0.4], // ~65 m of open north straight to spend it on
  // Chang Phuak Gate's night-food stalls: a shorter, tighter market.
  ['food', A.changPhuakGate - 12, 0.4],
  ['food', A.changPhuakGate + 2, -0.45], // ← Chang Phuak Gate at 886 m
  ['food', A.changPhuakGate + 16, 0.1],
  ['motorbike', A.changPhuakGate + 40, -0.3, true],
  ['motorbike', A.changPhuakGate + 56, 0.4, true],
  ['motorbike', A.changPhuakGate + 74, -0.1],
  ['splash', A.sriPhumCorner - 54, 0.55],

  // ── Sri Phum corner → Moon Muang → Tha Phae Gate ──────────────────────
  ['motorbike', A.sriPhumCorner - 38, -0.15, true],
  ['motorbike', A.sriPhumCorner - 16, -0.4, true], // Sri Phum junction, second busiest
  ['motorbike', A.sriPhumCorner, 0.3, true],
  ['food', A.sriPhumCorner + 24, 0.7], // Sompet-market side of Moon Muang
  // Moon Muang Road: the massage strip. Shopfronts on the city side (right),
  // with one lady stepping out to wave the runner in.
  ['massage', A.sriPhumCorner + 52, 0.7],
  ['massage', A.sriPhumCorner + 68, 0.65],
  ['massage', A.sriPhumCorner + 84, -0.15], // steps into the road
  ['massage', A.sriPhumCorner + 100, 0.7],
  // Songkran at the gate, right on the finish line: a last gauntlet.
  ['splash', A.finish - 36, 0.4],
  ['splash', A.finish - 23, -0.45],
  ['splash', A.finish - 10, 0.1],
];

const counts: Record<string, number> = {};

const authored: CourseEntry[] = ROWS.map(([kind, metres, lane, rides]) => {
  const n = (counts[kind] = (counts[kind] ?? 0) + 1);
  return {
    id: `${kind}-${n}`,
    kind,
    t: (metres + (rides ? pullOut(RIDE) : 0)) / TRACK_LENGTH,
    lane,
    ...(rides ? { ride: RIDE } : {}),
  };
});

// ── Density fill ──────────────────────────────────────────────────────────
// The authored ROWS above were tuned for a 1200m lap. On the real 6400m moat
// their absolute-metre offsets leave gaps of up to 754m -- about 47 seconds of
// empty road. This walks the authored list and drops extra obstacles into any
// gap wider than MAX_GAP so there is always something coming.
//
// Keith: this is a stopgap for the demo, not a replacement for issue #7.
// Hand-authored pacing beats generated pacing every time; delete this the
// moment your retuned ROWS cover the lap.
const MAX_GAP = 58; // metres of clear road before we fill -- ~3.6s at base speed
const FILL_KINDS: ObstacleSpec['kind'][] = [
  'motorbike', 'splash', 'food', 'massage', 'motorbike', 'splash', 'massage', 'dog',
];
// Weighted toward the centre on purpose. Keith's own note: an obstacle with
// |lane| < ~0.27 sits on the centreline and catches anyone who never steers,
// so central lanes are the difficulty knob and edge lanes are gifts. Most of
// these must actually be dodged.
const FILL_LANES = [-0.15, 0.55, 0.1, -0.6, 0.22, -0.25, 0.65, 0, -0.45, 0.18];

function fill(list: CourseEntry[]): CourseEntry[] {
  const out: CourseEntry[] = [];
  let n = 0;
  const startM = CLEAR_ZONE_M;
  let cursor = startM;

  const push = (from: number, to: number) => {
    const span = to - from;
    if (span <= MAX_GAP) return;
    const count = Math.floor(span / MAX_GAP);
    const step = span / (count + 1);
    for (let i = 1; i <= count; i++) {
      const metres = from + step * i;
      const kind = FILL_KINDS[n % FILL_KINDS.length];
      out.push({
        id: `fill-${n}`,
        kind,
        t: metres / TRACK_LENGTH,
        lane: FILL_LANES[n % FILL_LANES.length],
      });
      n++;
    }
  };

  for (const entry of list) {
    const metres = entry.t * TRACK_LENGTH;
    push(cursor, metres);
    out.push(entry);
    cursor = metres;
  }
  push(cursor, TRACK_LENGTH - 25);
  return out.sort((a, b) => a.t - b.t);
}

export const COURSE: CourseEntry[] = fill(authored);

if (import.meta.env.DEV) {
  COURSE.forEach((o, i) => {
    if (o.t * TRACK_LENGTH < CLEAR_ZONE_M)
      console.warn(`course: ${o.id} sits inside the ${CLEAR_ZONE_M}m clear zone`);
    if (i > 0 && o.t < COURSE[i - 1].t) console.warn(`course: ${o.id} is out of order`);
  });
}

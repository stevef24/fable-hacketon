// OWNER: P2 (Kevin). The loop around the Chiang Mai moat.
import { CatmullRomCurve3, Vector3 } from 'three';
import { TRACK_LENGTH } from './contract';

// The real old city is roughly a 1.6km square. We build it at that shape,
// then scale the whole thing so one lap is exactly TRACK_LENGTH metres --
// that keeps `distance / TRACK_LENGTH` a true 0..1 position on the curve,
// which is what the gates and every obstacle placement rely on.
const HALF = 800;
const CORNER = 190; // how far back from each corner the bend starts

const shape = [
  new Vector3(-HALF + CORNER, 0, -HALF),
  new Vector3(HALF - CORNER, 0, -HALF),
  new Vector3(HALF, 0, -HALF + CORNER),
  new Vector3(HALF, 0, HALF - CORNER),
  new Vector3(HALF - CORNER, 0, HALF),
  new Vector3(-HALF + CORNER, 0, HALF),
  new Vector3(-HALF, 0, HALF - CORNER),
  new Vector3(-HALF, 0, -HALF + CORNER),
];

const draft = new CatmullRomCurve3(shape, true, 'catmullrom', 0.2);
const scale = TRACK_LENGTH / draft.getLength();

/** Built once at module scope. Never rebuild this per frame. */
export const curve = new CatmullRomCurve3(
  shape.map((p) => p.clone().multiplyScalar(scale)),
  true,
  'catmullrom',
  0.2,
);

/** Actual arc length, within a metre or so of TRACK_LENGTH. */
export const trackLength = curve.getLength();

const wrap = (t: number) => ((t % 1) + 1) % 1;

export function getPointAt(t: number, target = new Vector3()): Vector3 {
  return curve.getPointAt(wrap(t), target);
}

export function getTangentAt(t: number, target = new Vector3()): Vector3 {
  return curve.getTangentAt(wrap(t), target);
}

/**
 * Unit vector pointing across the road, to the runner's right.
 * Three.js is right-handed with +Y up, so right = forward x up, which for a
 * flat tangent (tx, 0, tz) is (-tz, 0, tx). Getting this sign backwards
 * inverts steering; see tests/steer.test.mjs.
 */
export function getRightAt(t: number, target = new Vector3()): Vector3 {
  getTangentAt(t, target);
  return target.set(-target.z, 0, target.x).normalize();
}

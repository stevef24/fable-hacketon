// OWNER: P2 (Kevin). PLACEHOLDER by P1 — a rounded rectangle standing in for
// the old city moat. Replace with the real loop; keep the signatures.
import { CatmullRomCurve3, Vector3 } from 'three';

const HALF_X = 150; // the moat is roughly 300m x 260m
const HALF_Z = 130;
const C = 40; // corner inset

const points = [
  new Vector3(-HALF_X + C, 0, -HALF_Z),
  new Vector3(HALF_X - C, 0, -HALF_Z),
  new Vector3(HALF_X, 0, -HALF_Z + C),
  new Vector3(HALF_X, 0, HALF_Z - C),
  new Vector3(HALF_X - C, 0, HALF_Z),
  new Vector3(-HALF_X + C, 0, HALF_Z),
  new Vector3(-HALF_X, 0, HALF_Z - C),
  new Vector3(-HALF_X, 0, -HALF_Z + C),
];

/** Built once at module scope. Never rebuild this per frame. */
export const curve = new CatmullRomCurve3(points, true, 'catmullrom', 0.3);

const wrap = (t: number) => ((t % 1) + 1) % 1;

export function getPointAt(t: number, target = new Vector3()): Vector3 {
  return curve.getPointAt(wrap(t), target);
}

export function getTangentAt(t: number, target = new Vector3()): Vector3 {
  return curve.getTangentAt(wrap(t), target);
}

/** Unit vector pointing across the road, to the runner's right. */
export function getRightAt(t: number, target = new Vector3()): Vector3 {
  getTangentAt(t, target);
  return target.set(target.z, 0, -target.x).normalize();
}

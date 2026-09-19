import { Vector3 } from 'three';
import { getTangentAt, getRightAt } from '../.tmp-test/track.js';

const UP = new Vector3(0, 1, 0);
let failures = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`);
  if (!ok) failures++;
};

// Oracle: in a right-handed system, right = forward x up.
for (const t of [0, 0.125, 0.25, 0.4, 0.5, 0.75, 0.9]) {
  const fwd = getTangentAt(t, new Vector3());
  const expected = fwd.clone().cross(UP).normalize();
  const actual = getRightAt(t, new Vector3());
  const dot = expected.dot(actual);
  check(
    `t=${t} right vector matches forward x up`,
    dot > 0.999,
    `dot=${dot.toFixed(3)} expected=(${expected.toArray().map(n=>n.toFixed(2))}) actual=(${actual.toArray().map(n=>n.toFixed(2))})`,
  );
}

// Concrete case: heading down -Z, "right" must be +X.
const t0 = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].find((t) => {
  const f = getTangentAt(t, new Vector3());
  return f.z < -0.98;
});
if (t0 !== undefined) {
  const r = getRightAt(t0, new Vector3());
  check(`heading -Z at t=${t0} gives right = +X`, r.x > 0.98, `got x=${r.x.toFixed(3)}`);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILING`);
process.exit(failures === 0 ? 0 : 1);

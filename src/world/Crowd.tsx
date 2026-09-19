// OWNER: P4 slot (unclaimed, picked up by P1). Animated spectators.
//
// Raw InstancedMesh rather than drei's <Instances>: drei owns the matrix
// buffer from its <Instance> children, so animating 520 of them per frame
// means fighting it. Here we write instanceMatrix directly, which is one
// buffer upload per frame regardless of crowd size.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';

export interface Person {
  pos: [number, number, number];
  c: string;
  h: number;
}

const m = new Matrix4();
const q = new Quaternion();
const pos = new Vector3();
const scl = new Vector3();
const up = new Vector3(0, 1, 0);

export default function Crowd({ people }: { people: Person[] }) {
  const bodies = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);

  // Each spectator gets their own phase and rhythm so the crowd never
  // pulses in unison, which is what makes instanced crowds look wrong.
  const phases = useMemo(
    () => people.map((_, i) => ({ p: (i * 2.399) % (Math.PI * 2), r: 0.75 + ((i * 7) % 10) / 12 })),
    [people],
  );

  useLayoutEffect(() => {
    const colour = new Color();
    people.forEach((person, i) => {
      colour.set(person.c);
      bodies.current?.setColorAt(i, colour);
    });
    if (bodies.current?.instanceColor) bodies.current.instanceColor.needsUpdate = true;
  }, [people]);

  useFrame(({ clock }) => {
    const b = bodies.current;
    const h = heads.current;
    if (!b || !h) return;
    const t = clock.elapsedTime;

    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      const { p, r } = phases[i];
      const bounce = Math.abs(Math.sin(t * r * 2.2 + p));
      const sway = Math.sin(t * r * 1.4 + p) * 0.13;

      q.setFromAxisAngle(up, sway);

      // Body: hops and squashes slightly on landing.
      const squash = 1 - bounce * 0.05;
      pos.set(person.pos[0], (0.55 * person.h + 0.1) * squash + bounce * 0.11, person.pos[2]);
      scl.set(1, person.h * squash, 1);
      b.setMatrixAt(i, m.compose(pos, q, scl));

      // Head rides a touch higher than the body so they stretch as they jump.
      pos.set(person.pos[0], (1.15 * person.h + 0.1) * squash + bounce * 0.15, person.pos[2]);
      scl.set(1, 1, 1);
      h.setMatrixAt(i, m.compose(pos, q, scl));
    }

    b.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={bodies} args={[undefined, undefined, people.length]} frustumCulled={false}>
        <boxGeometry args={[0.5, 1.1, 0.35]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, people.length]} frustumCulled={false}>
        <boxGeometry args={[0.34, 0.34, 0.3]} />
        <meshLambertMaterial color="#d9a06a" />
      </instancedMesh>
    </>
  );
}

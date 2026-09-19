// OWNER: P4 (1320group). The old city: road, moat, walls, buildings, gates.
import { useMemo, useRef } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Vector3, type Mesh } from 'three';
import { GATES } from '../game/contract';
import { getPointAt, getRightAt, getTangentAt } from '../game/track';
import Gate from './Gate';
import Crowd from './Crowd';

const SAMPLES = 420;

/** A flat ribbon following the track, `halfWidth` metres either side. */
function ribbon(halfWidth: number, y: number, offset = 0): BufferGeometry {
  const pos = new Float32Array(SAMPLES * 2 * 3);
  const idx: number[] = [];
  const p = new Vector3();
  const r = new Vector3();

  for (let i = 0; i < SAMPLES; i++) {
    const t = i / (SAMPLES - 1);
    getPointAt(t, p);
    getRightAt(t, r);
    const cx = p.x + r.x * offset;
    const cz = p.z + r.z * offset;
    const a = i * 6;
    pos[a] = cx - r.x * halfWidth;
    pos[a + 1] = y;
    pos[a + 2] = cz - r.z * halfWidth;
    pos[a + 3] = cx + r.x * halfWidth;
    pos[a + 4] = y;
    pos[a + 5] = cz + r.z * halfWidth;
    if (i < SAMPLES - 1) {
      const v = i * 2;
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Deterministic pseudo-random so the city looks the same every run. */
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A tapering temple spire: plinth, dome, spire, gold tip. Non-instanced --
 * there are only a handful, each needs distinct per-tier geometry anyway,
 * and a handful of extra draw calls is nothing next to the walls/buildings.
 */
function Chedi({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[9, 4, 9]} />
        <meshLambertMaterial color="#e8d5a8" />
      </mesh>
      <mesh position={[0, 5.5, 0]} castShadow>
        <boxGeometry args={[6.5, 3, 6.5]} />
        <meshLambertMaterial color="#d9c088" />
      </mesh>
      <mesh position={[0, 9, 0]} castShadow>
        <sphereGeometry args={[3.6, 12, 8]} />
        <meshLambertMaterial color="#efe0b8" />
      </mesh>
      <mesh position={[0, 15, 0]} castShadow>
        <coneGeometry args={[1.6, 9, 10]} />
        <meshStandardMaterial
          color="#f2c94c"
          emissive="#e8b23a"
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 20, 0]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial
          color="#fff2b8"
          emissive="#fff2b8"
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function City() {
  const road = useMemo(() => ribbon(8, 0, 0), []);
  const verge = useMemo(() => ribbon(13, -0.05, 0), []);
  // Inside the road, above the ground plane -- at y=-0.6 the ground occluded it.
  const moat = useMemo(() => ribbon(11, -0.12, -30), []);
  // Cache the flat y values so the ripple is a pure offset, never cumulative.
  const moatRest = useMemo(
    () => Float32Array.from((moat.getAttribute('position') as BufferAttribute).array),
    [moat],
  );
  const moatRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const mesh = moatRef.current;
    if (!mesh) return;
    const attr = mesh.geometry.getAttribute('position') as BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < arr.length; i += 3) {
      const x = moatRest[i];
      const z = moatRest[i + 2];
      arr[i + 1] =
        moatRest[i + 1] +
        Math.sin(x * 0.09 + t * 1.6) * 0.16 +
        Math.cos(z * 0.11 - t * 1.15) * 0.12;
    }
    attr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });

  const walls = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number; h: number }[] = [];
    for (let i = 0; i < 640; i++) {
      const t = i / 640;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      const f = getTangentAt(t, new Vector3());
      out.push({
        pos: [p.x - r.x * 46, 2.4, p.z - r.z * 46],
        yaw: Math.atan2(f.x, f.z),
        h: 4.8 + rand(i) * 0.6,
      });
    }
    return out;
  }, []);

  // Three archetypes rather than one box at a random scale (F3): a narrow
  // 2-storey shophouse, a wide single-storey market front, and a tall
  // narrow shophouse -- each with its own proportions, roof pitch and
  // balcony. A sparse deterministic subset (i % 37 === 11) is a landmark
  // building with a steeper, taller temple-style roof, so the skyline
  // isn't perfectly uniform. Every part below (walls/roof/awning/balcony)
  // is instanced separately but indexed by this same array.
  const BUILDING_COUNT = 300;
  const buildings = useMemo(() => {
    const out: {
      pos: [number, number, number];
      yaw: number;
      s: [number, number, number];
      c: string;
      roofH: number;
      roofC: string;
      hasBalcony: boolean;
      awningC: string;
    }[] = [];
    const palette = ['#c98b5e', '#b5764f', '#d9a978', '#a86b47', '#c2a074', '#8f5f3f'];
    const roofPalette = ['#7d3a28', '#5c3a2e', '#8a4a2f'];
    const awningPalette = ['#d7263d', '#2f7fbf', '#f2b134', '#57a05a'];
    for (let i = 0; i < BUILDING_COUNT; i++) {
      const t = i / BUILDING_COUNT;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      const f = getTangentAt(t, new Vector3());
      const depth = 20 + rand(i) * 55;
      const archetype = i % 3; // 0 narrow shophouse, 1 wide market front, 2 tall shophouse
      const landmark = i % 37 === 11;
      const w = archetype === 1 ? 11 + rand(i * 2.3) * 6 : 6 + rand(i * 2.3) * 4;
      const d = 7 + rand(i * 5.9) * 6;
      const h = landmark
        ? 15 + rand(i * 3.1) * 4
        : archetype === 1
          ? 4.5 + rand(i * 3.1) * 1.5
          : archetype === 2
            ? 9 + rand(i * 3.1) * 6
            : 6.5 + rand(i * 3.1) * 3;
      out.push({
        pos: [p.x + r.x * depth, h / 2, p.z + r.z * depth],
        yaw: Math.atan2(f.x, f.z) + (rand(i * 7.7) - 0.5) * 0.35,
        s: [w, h, d],
        c: palette[Math.floor(rand(i * 9.1) * palette.length)],
        roofH: (landmark ? 6.5 : archetype === 1 ? 2.2 : 3.2) + rand(i * 4.4) * 1.2,
        roofC: roofPalette[Math.floor(rand(i * 5.5) * roofPalette.length)],
        hasBalcony: !landmark && archetype !== 1,
        awningC: awningPalette[Math.floor(rand(i * 6.6) * awningPalette.length)],
      });
    }
    return out;
  }, []);

  // Every building gets a hip roof (a 4-sided cone reads as a pyramid once
  // rotated 45 deg to align its faces with the box below, scaled non-
  // uniformly so a rectangular footprint gives a rectangular-based roof).
  const roofs = useMemo(
    () =>
      buildings.map((b) => ({
        pos: [b.pos[0], b.pos[1] + b.s[1] / 2 + b.roofH / 2, b.pos[2]] as [number, number, number],
        yaw: b.yaw + Math.PI / 4,
        s: [b.s[0] / 2 + 0.4, b.roofH, b.s[2] / 2 + 0.4] as [number, number, number],
        c: b.roofC,
      })),
    [buildings],
  );

  // Ground-floor awning on the building's long face, tilted down slightly.
  const awnings = useMemo(
    () =>
      buildings.map((b) => {
        const faceD = b.s[2] / 2 + 0.5;
        return {
          pos: [
            b.pos[0] + Math.sin(b.yaw) * faceD,
            b.pos[1] - b.s[1] / 2 + 2.4,
            b.pos[2] + Math.cos(b.yaw) * faceD,
          ] as [number, number, number],
          yaw: b.yaw,
          w: b.s[0] * 0.85,
          c: b.awningC,
        };
      }),
    [buildings],
  );

  // Second-storey balcony railing, narrow shophouses and tall shophouses only.
  const balconies = useMemo(
    () =>
      buildings
        .filter((b) => b.hasBalcony)
        .map((b) => {
          const faceD = b.s[2] / 2 + 0.15;
          return {
            pos: [
              b.pos[0] + Math.sin(b.yaw) * faceD,
              b.pos[1] + b.s[1] * 0.12,
              b.pos[2] + Math.cos(b.yaw) * faceD,
            ] as [number, number, number],
            yaw: b.yaw,
            w: b.s[0] * 0.7,
          };
        }),
    [buildings],
  );

  // Temple chedis: a handful of tapering spires across the moat from the
  // road, sparse and non-instanced -- there are only a few, and their
  // stepped silhouette (plinth/dome/spire) needs distinct geometry per
  // tier anyway. Placed past the wall so they read as skyline landmarks.
  const chedis = useMemo(() => {
    const ts = [0.06, 0.22, 0.47, 0.58, 0.82, 0.93];
    return ts.map((t, i) => {
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      return { id: i, pos: [p.x - r.x * 68, 0, p.z - r.z * 68] as [number, number, number] };
    });
  }, []);

  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 200; i++) {
      const t = i / 200;
      const p = getPointAt(t + 0.0012, new Vector3());
      const r = getRightAt(t, new Vector3());
      const side = i % 2 === 0 ? -12 : 15;
      out.push([p.x + r.x * side, 2.6, p.z + r.z * side]);
    }
    return out;
  }, []);

  const lanterns = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 260; i++) {
      const t = i / 260;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      out.push([p.x + r.x * 11, 4.6, p.z + r.z * 11]);
    }
    return out;
  }, []);

  // Spectators lining the city side, plus market stalls and umbrellas.
  // Everything instanced: this is several hundred objects on a 6.4km lap.
  const crowd = useMemo(() => {
    const out: { pos: [number, number, number]; c: string; h: number }[] = [];
    const shirts = ['#e8442f', '#f2b134', '#2f7fbf', '#f0f0f0', '#57a05a', '#d46aa8'];
    for (let i = 0; i < 520; i++) {
      const t = i / 520;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      const side = rand(i * 1.7) > 0.35 ? 1 : -1;
      const off = side * (9.5 + rand(i * 2.9) * 3.5);
      out.push({
        pos: [p.x + r.x * off, 0, p.z + r.z * off],
        c: shirts[Math.floor(rand(i * 4.3) * shirts.length)],
        h: 0.85 + rand(i * 6.1) * 0.3,
      });
    }
    return out;
  }, []);

  const stalls = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number; c: string }[] = [];
    const canopy = ['#e8442f', '#f2b134', '#2f7fbf', '#f0f0f0'];
    for (let i = 0; i < 120; i++) {
      const t = i / 120 + 0.004;
      const p = getPointAt(t, new Vector3());
      const r = getRightAt(t, new Vector3());
      const f = getTangentAt(t, new Vector3());
      const off = 14 + rand(i * 3.7) * 4;
      out.push({
        pos: [p.x + r.x * off, 0, p.z + r.z * off],
        yaw: Math.atan2(f.x, f.z),
        c: canopy[Math.floor(rand(i * 8.3) * canopy.length)],
      });
    }
    return out;
  }, []);

  const roadDashes = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number }[] = [];
    for (let i = 0; i < 640; i++) {
      const t = i / 640;
      const p = getPointAt(t, new Vector3());
      const f = getTangentAt(t, new Vector3());
      out.push({ pos: [p.x, 0.03, p.z], yaw: Math.atan2(f.x, f.z) });
    }
    return out;
  }, []);

  const gates = useMemo(() => {
    // Tha Phae is both start and finish, so it is drawn at t=0 and the other
    // three at their checkpoint positions.
    const thai: Record<string, string> = {
      'Tha Phae Gate': 'ประตูท่าแพ',
      'Chiang Mai Gate': 'ประตูเชียงใหม่',
      'Suan Dok Gate': 'ประตูสวนดอก',
      'Chang Phuak Gate': 'ประตูช้างเผือก',
    };
    return [{ id: 'start', name: 'Tha Phae Gate', t: 0 }, ...GATES.slice(0, 3)].map((g) => {
      const p = getPointAt(g.t, new Vector3());
      const f = getTangentAt(g.t, new Vector3());
      return {
        id: g.id,
        name: g.name,
        thai: thai[g.name] ?? 'ประตู',
        pos: [p.x, 0, p.z] as [number, number, number],
        yaw: Math.atan2(f.x, f.z),
      };
    });
  }, []);

  return (
    <>
      <color attach="background" args={['#ffd9a0']} />
      <fog attach="fog" args={['#ffcf93', 150, 1000]} />
      {/* Low warm key, cool sky fill -- golden hour, per docs/reference/. */}
      <hemisphereLight args={['#bfe0ff', '#6b4a2a', 0.75]} />
      <directionalLight position={[-320, 90, 140]} intensity={2.6} color="#ffc77d" />
      <directionalLight position={[220, 60, -180]} intensity={0.4} color="#8fb6ff" />
      <ambientLight intensity={0.18} color="#ffd9a8" />

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <planeGeometry args={[4200, 4200]} />
        <meshLambertMaterial color="#8a9a52" />
      </mesh>

      <mesh geometry={verge}>
        <meshLambertMaterial color="#b09a72" />
      </mesh>
      <mesh geometry={road}>
        <meshLambertMaterial color="#d8c49c" />
      </mesh>
      <mesh geometry={moat} ref={moatRef}>
        {/* Standard, not Lambert: the specular highlight is what makes the
            ripples read as water once bloom catches it. */}
        <meshStandardMaterial
          color="#2e9fc4"
          roughness={0.18}
          metalness={0.34}
          emissive="#0a3d55"
          emissiveIntensity={0.28}
        />
      </mesh>

      <Instances limit={walls.length} range={walls.length}>
        <boxGeometry args={[10.4, 1, 2.2]} />
        <meshLambertMaterial color="#c4603f" />
        {walls.map((w, i) => (
          <Instance key={i} position={w.pos} rotation={[0, w.yaw, 0]} scale={[1, w.h, 1]} />
        ))}
      </Instances>

      <Instances limit={buildings.length} range={buildings.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
        {buildings.map((b, i) => (
          <Instance key={i} position={b.pos} rotation={[0, b.yaw, 0]} scale={b.s} color={b.c} />
        ))}
      </Instances>

      {/* Hip roofs: a 4-sided cone rotated 45deg reads as a pyramid whose
          faces align with the box below. */}
      <Instances limit={roofs.length} range={roofs.length}>
        <coneGeometry args={[1, 1, 4]} />
        <meshLambertMaterial />
        {roofs.map((rf, i) => (
          <Instance key={i} position={rf.pos} rotation={[0, rf.yaw, 0]} scale={rf.s} color={rf.c} />
        ))}
      </Instances>

      {/* Ground-floor shopfront awnings. */}
      <Instances limit={awnings.length} range={awnings.length}>
        <boxGeometry args={[1, 0.15, 1.4]} />
        <meshLambertMaterial />
        {awnings.map((a, i) => (
          <Instance
            key={i}
            position={a.pos}
            rotation={[0.5, a.yaw, 0]}
            scale={[a.w, 1, 1]}
            color={a.c}
          />
        ))}
      </Instances>

      {/* Second-storey balcony railings. */}
      <Instances limit={balconies.length} range={balconies.length}>
        <boxGeometry args={[1, 1.1, 0.12]} />
        <meshLambertMaterial color="#5c3a2e" />
        {balconies.map((bc, i) => (
          <Instance key={i} position={bc.pos} rotation={[0, bc.yaw, 0]} scale={[bc.w, 1, 1]} />
        ))}
      </Instances>

      {/* Temple chedis: rare skyline landmarks across the moat. */}
      {chedis.map((c) => (
        <Chedi key={c.id} position={c.pos} />
      ))}

      <Instances limit={trees.length} range={trees.length}>
        <sphereGeometry args={[2.6, 6, 5]} />
        <meshLambertMaterial color="#3f6b35" />
        {trees.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      <Instances limit={roadDashes.length} range={roadDashes.length}>
        <boxGeometry args={[0.32, 0.02, 3.4]} />
        <meshLambertMaterial color="#efe3c4" />
        {roadDashes.map((d, i) => (
          <Instance key={i} position={d.pos} rotation={[0, d.yaw, 0]} />
        ))}
      </Instances>

      <Crowd people={crowd} />

      {/* market stall canopies */}
      <Instances limit={stalls.length} range={stalls.length}>
        <boxGeometry args={[3.4, 0.18, 2.4]} />
        <meshLambertMaterial />
        {stalls.map((st, i) => (
          <Instance key={i} position={[st.pos[0], 2.5, st.pos[2]]} rotation={[0, st.yaw, 0]} color={st.c} />
        ))}
      </Instances>
      {/* stall tables */}
      <Instances limit={stalls.length} range={stalls.length}>
        <boxGeometry args={[3, 0.9, 1.6]} />
        <meshLambertMaterial color="#8a6a4a" />
        {stalls.map((st, i) => (
          <Instance key={i} position={[st.pos[0], 0.45, st.pos[2]]} rotation={[0, st.yaw, 0]} />
        ))}
      </Instances>

      <Instances limit={lanterns.length} range={lanterns.length}>
        <boxGeometry args={[0.85, 1.3, 0.85]} />
        <meshStandardMaterial
          color="#ff7a2f"
          emissive="#ff9440"
          emissiveIntensity={2.6}
          toneMapped={false}
        />
        {lanterns.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      {gates.map((g) => (
        <group key={g.id} position={g.pos} rotation={[0, g.yaw, 0]}>
          <Gate thai={g.thai} roman={g.name} />
        </group>
      ))}
    </>
  );
}

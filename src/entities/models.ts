// OWNER: P3 (Keith). Voxel-style obstacle models, built once and shared.
//
// Every model is a list of coloured boxes merged into ONE vertex-coloured
// BufferGeometry, so an obstacle costs one draw call however many boxes it has.
// Nothing here touches gameplay: the hit test lives in effects.ts and only
// knows distance along the lap and lane.
//
// Conventions: metres, origin on the ground at the model's centre, and local
// +z is the way the figure FACES. Obstacles are placed facing the runner.
import { BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, SRGBColorSpace } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** x, y, z, w, h, d: x/z are the box centre, y is its BOTTOM. Then a colour. */
type Part = [x: number, y: number, z: number, w: number, h: number, d: number, color: string];

// ── palette ──────────────────────────────────────────────────────────────
const SKIN = '#e0a070';
const SKIN_LIGHT = '#f0bf94';
const HAIR = '#2a1a14';
const TIRE = '#222226';
const RED = '#d8281e';
const EYE = '#20130e';

/** Cheap deterministic hash so each box gets a slightly different shade: hand-built, not flat. */
const jitter = (i: number) => 0.93 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.1;

function build(parts: Part[], scale = 1): BufferGeometry {
  const geos = parts.map(([x, y, z, w, h, d, hex], i) => {
    const g = new BoxGeometry(w * scale, h * scale, d * scale);
    g.translate(x * scale, (y + h / 2) * scale, z * scale);
    const c = new Color(hex).multiplyScalar(jitter(i));
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) colors.set([c.r, c.g, c.b], v * 3);
    g.setAttribute('color', new BufferAttribute(colors, 3));
    return g;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}

/** Mirror a part across x = 0 as well. */
const sym = (x: number, y: number, z: number, w: number, h: number, d: number, c: string): Part[] => [
  [x, y, z, w, h, d, c],
  [-x, y, z, w, h, d, c],
];

// ── the scooter, the thing you fear most ─────────────────────────────────

function scooter(): Part[] {
  return [
    // wheels, hubs, mudguards
    [0, 0, 0.78, 0.16, 0.62, 0.62, TIRE],
    [0, 0, -0.72, 0.18, 0.62, 0.62, TIRE],
    [0, 0.2, 0.78, 0.2, 0.22, 0.22, '#c8c8c8'],
    [0, 0.2, -0.72, 0.22, 0.22, 0.22, '#c8c8c8'],
    [0, 0.62, 0.8, 0.24, 0.08, 0.7, RED],
    [0, 0.6, -0.78, 0.26, 0.08, 0.5, RED],
    // front fork, leg shield, floorboard, body cowl
    [0, 0.3, 0.66, 0.08, 0.72, 0.1, '#3a3a3e'],
    [0, 0.34, 0.44, 0.52, 0.78, 0.14, RED],
    [0, 0.26, 0.05, 0.5, 0.08, 0.66, '#2b2b2e'],
    [0, 0.34, -0.36, 0.46, 0.44, 0.86, RED],
    [0, 0.5, -0.36, 0.48, 0.06, 0.88, '#f5f0e6'], // cream trim stripe
    // seat, rear rack, exhaust
    [0, 0.78, -0.4, 0.4, 0.12, 0.72, '#1c1c20'],
    [0, 0.72, -0.86, 0.4, 0.05, 0.3, '#555'],
    [0.26, 0.2, -0.5, 0.08, 0.1, 0.5, '#8a8a8a'],
    // handlebar, grips, headlamp housing, mirrors
    [0, 1.02, 0.42, 0.74, 0.07, 0.09, '#2d2d30'],
    ...sym(0.36, 1.0, 0.42, 0.1, 0.1, 0.12, '#111'),
    [0, 0.84, 0.5, 0.24, 0.22, 0.16, RED],
    ...sym(0.3, 1.1, 0.4, 0.05, 0.14, 0.05, '#2d2d30'),
    ...sym(0.3, 1.24, 0.4, 0.1, 0.07, 0.03, '#9ac4d8'),
  ];
}

/** Lit parts: headlamp lens and tail light, drawn unlit so they glow and bloom. */
function scooterGlow(): Part[] {
  return [
    [0, 0.86, 0.585, 0.17, 0.15, 0.03, '#fff6c0'],
    [0, 0.66, -1.02, 0.18, 0.08, 0.03, '#ff3030'],
  ];
}

function rider(helmet: string, shirt: string): Part[] {
  return [
    // legs sit on the seat and drop to the floorboard
    ...sym(0.2, 0.9, -0.28, 0.17, 0.16, 0.6, '#35507a'),
    ...sym(0.2, 0.32, 0.26, 0.17, 0.64, 0.17, '#35507a'),
    ...sym(0.2, 0.28, 0.28, 0.17, 0.08, 0.26, '#222'),
    // torso and arms reaching for the bars
    [0, 0.9, -0.42, 0.46, 0.6, 0.28, shirt],
    ...sym(0.31, 1.06, -0.05, 0.11, 0.11, 0.62, shirt),
    ...sym(0.31, 1.0, 0.34, 0.1, 0.1, 0.1, SKIN),
    // head, helmet, visor, stripe, chin strap
    [0, 1.5, -0.4, 0.3, 0.28, 0.3, SKIN],
    [0, 1.62, -0.4, 0.4, 0.26, 0.42, helmet],
    [0, 1.88, -0.4, 0.1, 0.03, 0.42, '#fafafa'],
    [0, 1.66, -0.185, 0.34, 0.1, 0.03, '#1a1d24'],
    [0, 1.5, -0.4, 0.32, 0.03, 0.32, '#f5f5f5'],
  ];
}

// ── the massage lady ─────────────────────────────────────────────────────

function massage(): Part[] {
  const TOP = '#b25ad6';
  return [
    ...sym(0.1, 0, 0, 0.16, 0.8, 0.18, '#6a2f8f'),
    ...sym(0.1, 0, 0.04, 0.17, 0.07, 0.26, '#2a2a2a'),
    [0, 0.8, 0, 0.42, 0.56, 0.24, TOP],
    [0, 0.8, 0, 0.44, 0.08, 0.26, '#f2c94c'], // sash
    [0.28, 0.8, 0, 0.11, 0.54, 0.13, TOP], // one hand on hip
    [0.28, 0.7, 0, 0.1, 0.1, 0.12, SKIN],
    [-0.32, 1.12, 0.15, 0.11, 0.11, 0.42, TOP], // one arm out, holding the sign
    [-0.42, 1.08, 0.4, 0.13, 0.13, 0.13, SKIN],
    // head and the bun
    [0, 1.36, 0, 0.32, 0.32, 0.3, SKIN],
    [0, 1.36, -0.11, 0.36, 0.36, 0.14, HAIR],
    [0, 1.62, -0.02, 0.36, 0.09, 0.34, HAIR],
    [0, 1.56, -0.24, 0.2, 0.2, 0.2, HAIR], // the bun, at the back of her head
    ...sym(0.08, 1.5, 0.152, 0.05, 0.05, 0.02, EYE),
    ...sym(0.11, 1.42, 0.152, 0.06, 0.04, 0.02, '#f08a7a'),
    [0, 1.41, 0.152, 0.1, 0.03, 0.02, '#b8322a'],
    // the sign's post and frame; the lettering is a texture on top (SIGN below)
    [-0.58, 0.9, 0.49, 0.07, 0.2, 0.07, '#8a5a2b'],
    [-0.58, 1.0, 0.5, 0.8, 0.6, 0.05, '#8a5a2b'],
  ];
}

/** Where the sign's lettering plane sits, in the massage model's own (unscaled) units. */
export const SIGN = { x: -0.58, y: 1.3, z: 0.53, w: 0.72, h: 0.5, scale: 1.1 };

// ── the soi dog: a corgi ─────────────────────────────────────────────────

const ORANGE = '#e69a3c';
const CREAM = '#f7f0e4';

function corgi(): Part[] {
  return [
    [0, 0.2, 0, 0.4, 0.36, 0.78, ORANGE],
    [0, 0.2, 0.2, 0.42, 0.16, 0.4, CREAM], // chest and belly
    ...sym(0.13, 0, 0.28, 0.1, 0.22, 0.12, CREAM),
    ...sym(0.13, 0, -0.26, 0.1, 0.22, 0.12, CREAM),
    [0, 0.42, 0.5, 0.34, 0.3, 0.3, ORANGE], // head
    [0, 0.42, 0.72, 0.18, 0.14, 0.16, CREAM], // snout
    [0, 0.5, 0.81, 0.08, 0.06, 0.03, '#15110f'], // nose
    [0, 0.46, 0.78, 0.06, 0.02, 0.1, '#e8677a'], // happy tongue
    [0, 0.5, 0.5, 0.1, 0.22, 0.31, CREAM], // white blaze
    ...sym(0.12, 0.7, 0.44, 0.09, 0.18, 0.07, ORANGE), // big corgi ears
    ...sym(0.12, 0.72, 0.475, 0.05, 0.1, 0.02, '#f0a8a8'),
    ...sym(0.09, 0.56, 0.655, 0.05, 0.05, 0.02, EYE),
    [0, 0.42, -0.42, 0.11, 0.11, 0.11, ORANGE], // stub tail
  ];
}

// ── the mango sticky rice cart ───────────────────────────────────────────

function cart(): Part[] {
  const STRAW = '#e6c27a';
  const TEAL = '#2aa39a';
  const stripes = (w: number, y: number, size: number, n: number, colours: string[]): Part[] =>
    Array.from({ length: n }, (_, i): Part => [
      -w / 2 + (i + 0.5) * (w / n), y, 0.1, w / n, 0.1, size, colours[i % colours.length],
    ]);
  return [
    // cart body, counter, wheels, front sign board
    [0, 0.3, 0.1, 1.5, 0.6, 0.9, '#8a5a2b'],
    [0, 0.9, 0.1, 1.6, 0.06, 1.0, '#c49a5a'],
    ...sym(0.8, 0, 0.3, 0.14, 0.5, 0.5, TIRE),
    [0, 0.45, 0.56, 1.2, 0.34, 0.03, '#ffd54a'],
    [0, 0.5, 0.58, 0.9, 0.06, 0.02, '#e8382c'],
    // the goods: mango slices and sticky rice
    [-0.4, 0.96, 0.15, 0.5, 0.2, 0.5, '#ffc21a'],
    [-0.5, 1.16, 0.1, 0.16, 0.08, 0.16, '#ff9f1a'],
    [-0.3, 1.16, 0.2, 0.16, 0.08, 0.16, '#ff9f1a'],
    [0.32, 0.96, 0.15, 0.5, 0.2, 0.5, '#f7f1dc'],
    [0.32, 1.16, 0.15, 0.36, 0.06, 0.36, '#fffbea'],
    // umbrella: pole, two layers of stripes, finial
    [0, 0.96, -0.35, 0.06, 1.24, 0.06, '#555'],
    ...stripes(2.1, 2.2, 2.1, 5, ['#e8382c', '#ffc21a']),
    ...stripes(1.3, 2.3, 1.3, 3, ['#ffc21a', '#e8382c']),
    [0, 2.4, 0.1, 0.12, 0.14, 0.12, '#8a5a2b'],
    // the vendor behind the counter, in a straw hat
    ...sym(0.1, 0, -0.78, 0.16, 0.7, 0.18, '#3b3b6b'),
    [0, 0.7, -0.78, 0.42, 0.55, 0.24, TEAL],
    ...sym(0.27, 0.98, -0.55, 0.11, 0.11, 0.42, TEAL),
    [0, 1.25, -0.78, 0.3, 0.3, 0.28, SKIN_LIGHT],
    [0, 1.5, -0.78, 0.66, 0.05, 0.66, STRAW],
    [0, 1.55, -0.78, 0.48, 0.05, 0.48, STRAW],
    [0, 1.6, -0.78, 0.3, 0.05, 0.3, STRAW],
    [0, 1.65, -0.78, 0.14, 0.05, 0.14, STRAW],
    ...sym(0.075, 1.39, -0.638, 0.05, 0.05, 0.02, EYE),
    [0, 1.31, -0.638, 0.1, 0.03, 0.02, '#b8322a'],
  ];
}

function cartGlow(): Part[] {
  return [...sym(0.98, 1.98, 1.0, 0.14, 0.18, 0.14, '#ffb347'), ...sym(0.98, 1.98, -0.8, 0.14, 0.18, 0.14, '#ffb347')];
}

// ── the Songkran kid ─────────────────────────────────────────────────────

function kid(): Part[] {
  const SHIRT = '#ff7a3d';
  return [
    ...sym(0.1, 0.05, 0, 0.14, 0.42, 0.16, SKIN_LIGHT),
    ...sym(0.1, 0.4, 0, 0.17, 0.22, 0.2, '#2f6fbd'),
    ...sym(0.1, 0, 0.03, 0.15, 0.06, 0.22, '#e04a3a'),
    [0, 0.62, 0, 0.4, 0.46, 0.24, SHIRT],
    // the loud floral pattern
    [0.1, 0.86, 0.125, 0.1, 0.1, 0.02, '#1fb5a8'],
    [-0.08, 0.74, 0.125, 0.1, 0.1, 0.02, '#ffe14d'],
    [0.09, 0.66, 0.125, 0.08, 0.08, 0.02, '#f4f4f4'],
    // both arms flung forward with a bucket
    ...sym(0.27, 0.98, 0.05, 0.11, 0.12, 0.14, SHIRT),
    ...sym(0.27, 1.0, 0.2, 0.1, 0.1, 0.4, SKIN_LIGHT),
    [0, 0.96, 0.62, 0.34, 0.28, 0.34, '#19b8ff'],
    [0, 1.24, 0.62, 0.38, 0.03, 0.38, '#ffffff'],
    // head with a huge curly mop of hair and a huge grin
    [0, 1.08, 0, 0.32, 0.32, 0.3, SKIN_LIGHT],
    [0, 1.32, -0.02, 0.38, 0.16, 0.36, HAIR],
    ...sym(0.18, 1.1, 0, 0.06, 0.24, 0.3, HAIR),
    [0, 1.08, -0.14, 0.36, 0.3, 0.06, HAIR],
    ...sym(0.08, 1.24, 0.152, 0.05, 0.05, 0.02, EYE),
    [0, 1.14, 0.152, 0.16, 0.05, 0.02, '#7a1f1f'],
    [0, 1.155, 0.153, 0.12, 0.02, 0.02, '#fff'],
  ];
}

/** The wet patch on the road in front of the kid. Flat, so the zone reads at a glance. */
function puddle(): Part[] {
  return [
    [0, 0.02, 1.2, 2.2, 0.02, 1.8, '#3fb6e8'],
    [-0.5, 0.04, 1.0, 0.7, 0.01, 0.6, '#8fdcff'],
    [0.6, 0.04, 1.6, 0.5, 0.01, 0.5, '#8fdcff'],
    [0.1, 0.04, 1.9, 0.4, 0.01, 0.4, '#d6f4ff'],
  ];
}

// ── registry ─────────────────────────────────────────────────────────────

export interface Model {
  solid: BufferGeometry;
  /** Unlit and bright, for lamps. Drawn with a basic material so it blooms. */
  glow?: BufferGeometry;
}

const HELMETS = ['#e2312a', '#f2c230', '#2f80ed'];
const SHIRTS = ['#2d6cdf', '#f2f2f2', '#e97b2f'];
export const RIDER_VARIANTS = HELMETS.length;

const cache = new Map<string, Model>();

/**
 * Model keys: `parked`, `rider0..2`, `dog`, `massage`, `cart`, `kid`.
 * Built lazily on first use, then shared by every obstacle of that key.
 */
export function getModel(key: string): Model {
  let m = cache.get(key);
  if (m) return m;
  const rv = /^rider(\d)$/.exec(key);
  if (rv) {
    const v = Number(rv[1]) % RIDER_VARIANTS;
    m = { solid: build([...scooter(), ...rider(HELMETS[v], SHIRTS[v])]), glow: build(scooterGlow()) };
  } else if (key === 'parked') {
    m = { solid: build(scooter()), glow: build(scooterGlow()) };
  } else if (key === 'dog') {
    m = { solid: build(corgi(), 1.3) };
  } else if (key === 'massage') {
    m = { solid: build(massage(), SIGN.scale) };
  } else if (key === 'cart') {
    m = { solid: build(cart()), glow: build(cartGlow()) };
  } else if (key === 'kid') {
    m = { solid: build([...kid(), ...puddle()], 1.15) };
  } else {
    throw new Error(`unknown model ${key}`);
  }
  cache.set(key, m);
  return m;
}

// ── canvas textures: speech bubbles and the massage sign ────────────────

const textures = new Map<string, CanvasTexture>();

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A comic speech bubble like the ones in docs/reference/01-in-run-hud.png. */
export function bubbleTexture(text: string): CanvasTexture {
  const key = `bubble:${text}`;
  let t = textures.get(key);
  if (t) return t;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fffdf6';
  ctx.strokeStyle = '#3a2418';
  ctx.lineWidth = 8;
  roundRect(ctx, 8, 8, 496, 128, 36);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath(); // tail
  ctx.moveTo(210, 132);
  ctx.lineTo(240, 186);
  ctx.lineTo(276, 132);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fffdf6'; // hide the seam where tail meets bubble
  ctx.fillRect(216, 126, 54, 14);
  ctx.fillStyle = '#3a2418';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 74, 460);
  t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  textures.set(key, t);
  return t;
}

/** Hand-held sign for the massage lady. */
export function signTexture(): CanvasTexture {
  let t = textures.get('sign');
  if (t) return t;
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 224;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f6e7c1';
  ctx.fillRect(0, 0, 320, 224);
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 306, 210);
  ctx.fillStyle = '#4a2a18';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText('Massage?', 160, 78);
  ctx.fillStyle = '#c2255c';
  ctx.fillText('Relax! ♥', 160, 150);
  t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  textures.set('sign', t);
  return t;
}

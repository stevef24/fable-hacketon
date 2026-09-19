// OWNER: P5 (vivi09032000). Sound effects, music, and the effect event bus.
// Reads nothing from the game loop. The game signals effects by calling
// emitEffect(kind); the HUD and this module react to that. This is the only
// integration point other people touch: one line in P3's applyEffect().

import type { ObstacleKind } from '../game/contract';

// ── Effect event bus ────────────────────────────────────────────────
// Decoupled so P5 never imports runner and P3 never imports UI. When an
// obstacle fires, the game calls emitEffect(kind); the HUD shows a caption
// and this module plays the matching sound.

type EffectListener = (kind: ObstacleKind) => void;
const effectListeners = new Set<EffectListener>();

export function subscribeEffect(fn: EffectListener): () => void {
  effectListeners.add(fn);
  return () => effectListeners.delete(fn);
}

/** Call this from the game when an obstacle effect fires (integration hook). */
export function emitEffect(kind: ObstacleKind): void {
  playForKind(kind);
  for (const fn of effectListeners) fn(kind);
}

// ── Mute state (persisted) ──────────────────────────────────────────

const MUTE_KEY = 'cmd.muted';

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

let muted = loadMuted();
const muteListeners = new Set<(m: boolean) => void>();

export function isMuted(): boolean {
  return muted;
}

export function subscribeMute(fn: (m: boolean) => void): () => void {
  muteListeners.add(fn);
  return () => muteListeners.delete(fn);
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    // private browsing — the choice just will not persist
  }
  if (next) stopMusic();
  else if (audioReady) startMusic();
  for (const fn of muteListeners) fn(next);
}

export function toggleMute(): boolean {
  setMuted(!muted);
  return muted;
}

// ── Web Audio context ───────────────────────────────────────────────
// Everything is synthesized so the game needs no binary assets to ship.
// Drop CC0 files into public/audio/ and swap playBuffer in later if wanted.

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let audioReady = false;

/**
 * Must be called from a user gesture (the Start button) so the browser
 * autoplay policy does not block the context.
 */
export function init(): void {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  const AC: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;

  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  audioReady = true;
}

function now(): number {
  return ctx ? ctx.currentTime : 0;
}

function canPlay(): boolean {
  return audioReady && !muted && ctx !== null && master !== null;
}

// ── Small synthesis helpers ─────────────────────────────────────────

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  destination: AudioNode,
  endFreq?: number,
): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noiseBurst(
  start: number,
  dur: number,
  peak: number,
  filterHz: number,
  destination: AudioNode,
  sweepTo?: number,
): void {
  if (!ctx) return;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterHz, start);
  if (sweepTo !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(80, sweepTo), start + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  src.connect(filter).connect(gain).connect(destination);
  src.start(start);
  src.stop(start + dur + 0.02);
}

// ── One-shot sound effects ──────────────────────────────────────────

export type SoundName = 'bark' | 'horn' | 'splash' | 'murmur';

const SOUNDS: Record<SoundName, (t: number, out: AudioNode) => void> = {
  // Soi dog: two rising yips.
  bark(t, out) {
    tone(420, t, 0.12, 'square', 0.35, out, 300);
    tone(520, t + 0.14, 0.14, 'square', 0.32, out, 360);
  },
  // Motorbike / scooter: a nasal two-tone horn.
  horn(t, out) {
    tone(440, t, 0.35, 'sawtooth', 0.28, out);
    tone(556, t, 0.35, 'sawtooth', 0.22, out);
  },
  // Water splash: filtered noise with a downward sweep.
  splash(t, out) {
    noiseBurst(t, 0.4, 0.5, 6000, out, 500);
    tone(900, t, 0.18, 'sine', 0.12, out, 300);
  },
  // Market murmur: soft band of noise, the food/massage stretch.
  murmur(t, out) {
    noiseBurst(t, 0.7, 0.18, 900, out, 500);
  },
};

export function play(name: SoundName): void {
  if (!canPlay() || !master) return;
  SOUNDS[name](now(), master);
}

const KIND_SOUND: Record<ObstacleKind, SoundName> = {
  motorbike: 'horn',
  dog: 'bark',
  massage: 'murmur',
  food: 'murmur',
  splash: 'splash',
};

export function playForKind(kind: ObstacleKind): void {
  play(KIND_SOUND[kind]);
}

// ── Looping background music ────────────────────────────────────────
// A warm, low pentatonic drone with a slow shimmer. Deliberately quiet so
// it sits under the sound effects.

let musicNodes: { osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode }[] = [];
let musicOn = false;

export function startMusic(): void {
  if (!ctx || !master || muted || musicOn) return;
  musicOn = true;

  const bed = ctx.createGain();
  bed.gain.value = 0.12;
  bed.connect(master);

  // A gentle E-minor-pentatonic-ish chord.
  const freqs = [110, 164.81, 220, 329.63];
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;

    const gain = ctx.createGain();
    gain.gain.value = 0.25;

    // Slow amplitude shimmer per voice.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.06 + Math.random() * 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(gain.gain);

    osc.connect(gain).connect(bed);
    osc.start();
    lfo.start();
    musicNodes.push({ osc, lfo, gain });
  }
}

export function stopMusic(): void {
  if (!musicOn) return;
  musicOn = false;
  const t = now();
  for (const { osc, lfo, gain } of musicNodes) {
    try {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.stop(t + 0.45);
      lfo.stop(t + 0.45);
    } catch {
      // already stopped
    }
  }
  musicNodes = [];
}

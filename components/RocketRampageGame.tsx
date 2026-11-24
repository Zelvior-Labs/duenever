'use client';

import { rocketCombo, clearHostileFire } from '@/lib/arcade-features';
import { absorbHit, chooseRocketDrop, type RocketDrop } from '@/lib/arcade-upgrades';
import { SOUND_KEY } from '@/lib/game-audio';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Pause, Play, Rocket as RocketIcon, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import { getStoredSettings } from '@/lib/storage';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const W = 900; // logical playfield width
const H = 560; // logical playfield height
const BEST_KEY = 'duenever_rocket_best_v1';
const MUTE_KEY = SOUND_KEY;

const PLAYER_SPEED = 350;
const PLAYER_R = 16;
const BULLET_SPEED = 620;
const FIRE_COOLDOWN = 0.16;
const BURST_COOLDOWN = 2.2;
const MAX_LIVES = 3;
const INVULN_TIME = 2.2;
const WAVE_EVERY = 25;

const ROCK_TIERS = [
  { draw: 104, r: 44, hp: 3, score: 20 }, // large  → splits
  { draw: 64, r: 27, hp: 2, score: 15 }, // medium → splits
  { draw: 36, r: 15, hp: 1, score: 10 }, // small
] as const;

const ENEMY_R = 24;
const GUNNER_SCORE = 40;
const DIVER_SCORE = 60;

const FOE_CAP = 6; // low-perf mode lowers this
const PART_MAX = 700; // fixed particle pool (zero per-frame allocation)

const ASSET_SRC = {
  rocket: '/games/rocket-rampage/rocket.png',
  asteroid: '/games/rocket-rampage/asteroid.png',
  enemy: '/games/rocket-rampage/enemy.png',
  shield: '/games/rocket-rampage/shield.png',
  emp: '/games/rocket-rampage/emp.png',
} as const;

type AssetKey = keyof typeof ASSET_SRC;
type GameAssets = Partial<Record<AssetKey, HTMLImageElement>>;

/* ------------------------------------------------------------------ */
/* Star field — pre-rendered once to offscreen canvases and scrolled   */
/* with 2 drawImage calls per layer (instead of 124 alpha fills/frame) */
/* ------------------------------------------------------------------ */

const STAR_LAYERS = [
  { n: 60, speed: 22, size: 1.0, alpha: 0.35 },
  { n: 40, speed: 50, size: 1.6, alpha: 0.55 },
  { n: 24, speed: 95, size: 2.3, alpha: 0.9 },
];

const STAR_DEFS = STAR_LAYERS.map((l) => ({
  ...l,
  stars: Array.from({ length: l.n }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    a: 0.5 + Math.random() * 0.5,
  })),
}));

function buildStarCanvas(layer: (typeof STAR_DEFS)[number]): HTMLCanvasElement | null {
  try {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const cx = c.getContext('2d');
    if (!cx) return null;
    for (const s of layer.stars) {
      cx.globalAlpha = layer.alpha * s.a;
      cx.fillStyle = '#DDE6FF';
      cx.fillRect(s.x, s.y, layer.size, layer.size);
    }
    return c;
  } catch {
    return null;
  }
}

/** White-tinted copy of a sprite, pre-rendered once — replaces ctx.filter (very slow). */
function buildFlash(img: HTMLImageElement): HTMLCanvasElement | null {
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const cx = c.getContext('2d');
    if (!cx) return null;
    cx.drawImage(img, 0, 0);
    cx.globalCompositeOperation = 'source-atop';
    cx.fillStyle = 'rgba(255, 235, 210, 0.9)';
    cx.fillRect(0, 0, c.width, c.height);
    return c;
  } catch {
    return null;
  }
}

interface RenderCache {
  gradient: CanvasGradient | null;
  stars: (HTMLCanvasElement | null)[];
  flash: Partial<Record<AssetKey, HTMLCanvasElement | null>>;
}

/* ------------------------------------------------------------------ */
/* Sound synth (WebAudio, no assets)                                   */
/* ------------------------------------------------------------------ */

class Sfx {
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private sources = new Set<AudioScheduledSourceNode>();
  muted = false;
  stop() { for (const source of this.sources) { try { source.stop(); } catch {} } this.sources.clear(); }
  private track(source: AudioScheduledSourceNode) { this.sources.add(source); source.onended = () => { this.sources.delete(source); source.disconnect(); }; }

  ensure() {
    if (typeof window === 'undefined' || this.muted) return;
    try {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.5), this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
    } catch { this.close(); } // Audio support must not interrupt the game.
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    this.track(osc);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, freq: number, vol: number) {
    if (!this.ctx || this.muted || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    this.track(src);
    src.start(t);
    src.stop(t + dur);
  }

  laser() {
    this.tone('square', 880, 190, 0.08, 0.035);
  }
  burst() {
    this.tone('sawtooth', 620, 140, 0.16, 0.05);
  }
  foeLaser() {
    this.tone('sawtooth', 300, 110, 0.14, 0.03);
  }
  telegraph() {
    this.tone('sine', 240, 540, 0.22, 0.03);
  }
  boom(size: number) {
    this.noise(0.3 + size * 0.02, 1400, 0.15);
    this.tone('triangle', 120, 35, 0.3, 0.11);
  }
  bigBoom() {
    this.noise(0.6, 900, 0.22);
    this.tone('triangle', 90, 28, 0.5, 0.16);
  }
  hurt() {
    this.tone('sawtooth', 220, 55, 0.28, 0.12);
    this.noise(0.25, 800, 0.1);
  }
  pickup() {
    this.tone('sine', 660, 660, 0.07, 0.07);
    this.tone('sine', 990, 990, 0.12, 0.07, .07);
  }
  wave() {
    this.tone('square', 440, 440, 0.09, 0.04);
    this.tone('square', 660, 660, 0.14, 0.04, .09);
  }
  close() {
    this.stop();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}

/* ------------------------------------------------------------------ */
/* World model                                                         */
/* ------------------------------------------------------------------ */

type Status = 'loading' | 'menu' | 'playing' | 'paused' | 'gameover';

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tilt: number;
  cool: number;
  burstCool: number;
  burstReq: boolean;
  inv: number;
}

interface Bolt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  friendly: boolean;
  dead: boolean;
}

interface Rock {
  tier: 0 | 1 | 2;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  hp: number;
  r: number;
  size: number;
  hit: number;
}

/** Foe AI modes: 0 = maneuver (hover/strafe/dodge), 1 = telegraph, 2 = committed dive */
interface Foe {
  kind: 0 | 1; // 0 = gunner (aims & bursts), 1 = diver (lines up & charges)
  elite: boolean;
  mode: 0 | 1 | 2;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  hp: number;
  r: number;
  hit: number;
  teleT: number;
  burst: number;
  burstT: number;
  fireCd: number;
  diveCd: number;
  prefY: number;
  dodgeT: number;
  dodgeDir: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  ring: boolean;
  maxR: number;
}

interface Drop {
  x: number;
  y: number;
  vy: number;
  dead: boolean;
  kind: RocketDrop;
}

interface Pop {
  x: number;
  y: number;
  text: string;
  life: number;
}

interface World {
  player: Player;
  rocks: Rock[];
  foes: Foe[];
  bolts: Bolt[];
  parts: Particle[]; // fixed-size pool
  partI: number; // ring-buffer write index
  pops: Pop[];
  drops: Drop[];
  score: number;
  combo: number;
  comboT: number;
  multiplier: number;
  best: number;
  lives: number;
  shield: boolean;
  emp: boolean;
  elapsed: number;
  wave: number;
  waveBannerT: number;
  waveTimer: number;
  power: 'rapid' | 'spread' | null;
  powerT: number;
  rockT: number;
  foeT: number;
  shake: number;
  dying: number;
  over: boolean;
}

interface Opts {
  reducedMotion: boolean;
  lowPerf: boolean;
}

interface IO {
  keys: Set<string>;
  pointer: { x: number; y: number; active: boolean };
  sfx: Sfx;
  opts: Opts;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const hit = (x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const rr = r1 + r2;
  return dx * dx + dy * dy < rr * rr;
};

const mkBolt = (x: number, y: number, vx: number, vy: number, friendly: boolean): Bolt => ({
  x,
  y,
  vx,
  vy,
  friendly,
  dead: false,
});

/** In-place compaction — no per-frame array allocation (GC jitter killer). */
function compact<T>(arr: T[], keep: (v: T) => boolean): void {
  let j = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (keep(v)) arr[j++] = v;
  }
  arr.length = j;
}

const pop = (x: number, y: number, text: string): Pop => ({ x, y, text, life: 0.9 });

function readBest(): number {
  try {
    return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function createWorld(): World {
  return {
    player: {
      x: W / 2,
      y: H - 90,
      vx: 0,
      vy: 0,
      tilt: 0,
      cool: 0.3,
      burstCool: 0,
      burstReq: false,
      inv: 1.2,
    },
    rocks: [],
    foes: [],
    bolts: [],
    parts: Array.from({ length: PART_MAX }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 0,
      color: '#FFF',
      ring: false,
      maxR: 0,
    })),
    partI: 0,
    pops: [],
    drops: [],
    score: 0,
    combo: 0, comboT: 0, multiplier: 1,
    best: readBest(),
    lives: MAX_LIVES,
    shield: false,
    emp: false,
    elapsed: 0,
    wave: 1,
    waveBannerT: 2,
    waveTimer: WAVE_EVERY,
    power: null,
    powerT: 0,
    rockT: 0.6,
    foeT: 0,
    shake: 0,
    dying: 0,
    over: false,
  };
}

const EXPLOSION_COLORS = ['#FFA03C', '#FFE08A', '#FF5A3C', '#FFFFFF'];

/** Write a particle into the fixed pool (ring buffer — oldest slot is reused). */
function emit(
  w: World,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  size: number,
  color: string,
  ring = false,
  maxR = 0,
) {
  const pt = w.parts[w.partI];
  pt.x = x;
  pt.y = y;
  pt.vx = vx;
  pt.vy = vy;
  pt.life = life;
  pt.maxLife = life;
  pt.size = size;
  pt.color = color;
  pt.ring = ring;
  pt.maxR = maxR;
  w.partI = (w.partI + 1) % PART_MAX;
}

function spark(w: World, x: number, y: number, opts: Opts) {
  const n = opts.reducedMotion ? 2 : opts.lowPerf ? 3 : 4;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 120;
    emit(w, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.18 + Math.random() * 0.12, 1.6 + Math.random() * 1.8, i % 2 ? '#9FE8FF' : '#FFE08A');
  }
}

function explode(w: World, x: number, y: number, size: number, opts: Opts, sfx: Sfx) {
  const n = opts.reducedMotion ? 8 : Math.round((10 + size * 0.22) * (opts.lowPerf ? 0.6 : 1));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 50 + Math.random() * (60 + size * 2.4);
    emit(
      w,
      x,
      y,
      Math.cos(a) * sp,
      Math.sin(a) * sp,
      0.4 + Math.random() * 0.35,
      2 + Math.random() * 3.5,
      EXPLOSION_COLORS[(Math.random() * EXPLOSION_COLORS.length) | 0],
    );
  }
  emit(w, x, y, 0, 0, 0.35, 0, '#FFC46B', true, size * 1.15);
  w.shake = Math.min(22, w.shake + size * 0.16);
  sfx.boom(size);
}

function spawnRock(w: World) {
  const tier: 0 | 1 | 2 =
    w.elapsed < 14
      ? Math.random() < 0.85
        ? 0
        : 1
      : Math.random() < 0.58
        ? 0
        : Math.random() < 0.8
          ? 1
          : 2;
  const t = ROCK_TIERS[tier];
  w.rocks.push({
    tier,
    x: 40 + Math.random() * (W - 80),
    y: -70,
    vx: (Math.random() - 0.5) * 70,
    vy: Math.min(210, 75 + w.elapsed * 1.6 + Math.random() * 55),
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 3,
    hp: t.hp,
    r: t.r,
    size: t.draw,
    hit: 0,
  });
}

/* ------------------------------------------------------------------ */
/* Smart opponents                                                     */
/* ------------------------------------------------------------------ */

function spawnFoe(w: World) {
  // Divers unlock after the early game and get more common over time
  const diverChance = w.elapsed < 25 ? 0 : Math.min(0.45, 0.18 + w.elapsed * 0.004);
  const kind: 0 | 1 = Math.random() < diverChance ? 1 : 0;
  const elite = w.wave >= 3 && Math.random() < 0.22;
  const amp = 40 + Math.random() * 60;
  const baseX = amp + 30 + Math.random() * Math.max(60, W - amp * 2 - 60);
  w.foes.push({
    kind,
    elite,
    mode: 0,
    x: baseX,
    y: -60,
    vx: 0,
    vy: kind === 0 ? 70 : 95,
    t: 0,
    hp: (kind === 0 ? 3 + Math.floor(w.elapsed / 45) : 2 + Math.floor(w.elapsed / 50)) * (elite ? 2 : 1),
    r: ENEMY_R,
    hit: 0,
    teleT: 0,
    burst: 0,
    burstT: 0,
    fireCd: 1.2 + Math.random() * 1.2,
    diveCd: 1.6 + Math.random() * 1.4,
    prefY: kind === 0 ? 90 + Math.random() * 130 : 100 + Math.random() * 90,
    dodgeT: 0,
    dodgeDir: 1,
  });
}

/** Perceive incoming friendly bullets and set an evasion impulse (dogfight dodging). */
function scanThreat(w: World, f: Foe) {
  for (const b of w.bolts) {
    if (!b.friendly || b.dead) continue;
    const dy = f.y - b.y;
    if (dy <= 4 || dy > 200) continue; // only bullets rising toward the foe
    const ttc = dy / BULLET_SPEED; // time-to-close
    if (ttc > 0.6) continue;
    const bx = b.x + b.vx * ttc;
    if (Math.abs(bx - f.x) < f.r + 16) {
      f.dodgeDir = bx >= f.x ? -1 : 1;
      f.dodgeT = 0.26;
      return;
    }
  }
}

/** Aimed shot that LEADS the player's movement (interception, not point-at). */
function fireLed(w: World, f: Foe, speed: number, sfx: Sfx, spread: number) {
  const p = w.player;
  const dx = p.x + p.vx * 0.3 - f.x;
  const dy = p.y + p.vy * 0.3 - f.y;
  const d = Math.hypot(dx, dy) || 1;
  let ax = dx / d;
  let ay = dy / d;
  if (spread) {
    const c = Math.cos(spread);
    const s = Math.sin(spread);
    const nx = ax * c - ay * s;
    ay = ax * s + ay * c;
    ax = nx;
  }
  w.bolts.push(mkBolt(f.x, f.y + 20, ax * speed, ay * speed, false));
  sfx.foeLaser();
}

function updateFoes(w: World, dt: number, sfx: Sfx, opts: Opts) {
  const p = w.player;
  const boltSpeed = 235 + Math.min(90, w.elapsed);

  for (const f of w.foes) {
    f.t += dt;
    if (f.hit > 0) f.hit -= dt;
    if (f.teleT > 0) f.teleT -= dt;

    // --- dodge incoming friendly fire (unless committed to a dive) ---
    if (f.dodgeT > 0) f.dodgeT -= dt;
    else if (f.mode !== 2) scanThreat(w, f);

    if (f.mode === 2) {
      // Committed dive — hold velocity, leave a hot trail
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (!opts.reducedMotion) {
        emit(w, f.x + (Math.random() - 0.5) * 14, f.y - 26, 0, 0, 0.22, 2.6, '#FF8A5C');
      }
      if (f.y > H - 70 || f.x < -40 || f.x > W + 40) {
        // Break off and climb back to a hover band
        f.mode = 0;
        f.prefY = 100 + Math.random() * 110;
        f.diveCd = 2.6 + Math.random() * 1.6;
        f.vx = 0;
        f.vy = -90;
      }
      continue;
    }

    // --- steering: hover at preferred altitude, strafe toward player's future x ---
    const bob = Math.sin(f.t * 2.1) * 26;
    let dvy: number;
    if (f.y < f.prefY - 14) dvy = 85;
    else if (f.y > f.prefY + 14) dvy = -70;
    else dvy = bob;

    const predX = clamp(p.x + p.vx * 0.35, 40, W - 40);
    let dvx = clamp((predX - f.x) * 0.9, -125, 125) + Math.sin(f.t * 1.3) * 34;
    if (f.dodgeT > 0) dvx += f.dodgeDir * 205; // evasion burst overrides strafe

    const k = 1 - Math.exp(-3.4 * dt);
    f.vx += (dvx - f.vx) * k;
    f.vy += (dvy - f.vy) * k;
    f.x = clamp(f.x + f.vx * dt, 30, W - 30);
    f.y = Math.max(-60, f.y + f.vy * dt);

    // --- attacks ---
    if (f.kind === 0) {
      // Gunner: telegraphed burst fire with lead prediction
      if (f.burst > 0) {
        f.burstT -= dt;
        if (f.burstT <= 0) {
          f.burstT = 0.14;
          f.burst -= 1;
          fireLed(w, f, boltSpeed, sfx, 0.06 * f.burst);
          if (f.burst === 0) {
            f.fireCd = Math.max(0.9, 1.9 - w.elapsed * 0.012) + Math.random() * 0.9;
          }
        }
      } else {
        f.fireCd -= dt;
        if (f.fireCd <= 0 && f.y > 60 && f.y < H - 210) {
          f.burst = 2 + (w.elapsed > 55 ? 1 : 0) + (w.elapsed > 120 ? 1 : 0) + (f.elite ? 1 : 0);
          f.burstT = 0.26; // acts as telegraph before the first shot
          f.teleT = 0.26;
          sfx.telegraph();
        }
      }
    } else {
      // Diver: lines up above the player's predicted x, telegraphs, then charges
      f.diveCd -= dt;
      if (f.diveCd <= 0 && f.y > 46 && f.y < H * 0.45) {
        const tta = Math.max(0, (p.y - f.y) / 260);
        const aimX = clamp(p.x + p.vx * tta, 40, W - 40);
        if (Math.abs(aimX - f.x) < 90) {
          f.mode = 1;
          f.teleT = 0.32;
          sfx.telegraph();
        } else {
          f.diveCd = 0.35; // keep adjusting toward alignment
        }
      }
    }
  }

  // Telegraph → strike (divers)
  for (const f of w.foes) {
    if (f.mode === 1 && f.teleT <= 0) {
      const dx = p.x + p.vx * 0.22 - f.x;
      const dy = p.y + p.vy * 0.22 - f.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = 330 + Math.min(110, w.elapsed);
      f.vx = (dx / d) * sp;
      f.vy = Math.max(sp * 0.55, (dy / d) * sp);
      f.mode = 2;
    }
  }

  // --- separation steering so foes don't stack into one blob ---
  for (let i = 0; i < w.foes.length; i++) {
    for (let j = i + 1; j < w.foes.length; j++) {
      const a = w.foes[i];
      const b = w.foes[j];
      if (a.mode === 2 || b.mode === 2) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.001 && d < 66) {
        const push = ((66 - d) / 66) * 46 * dt;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push * 0.6;
        b.x += ux * push;
        b.y += uy * push * 0.6;
      }
    }
  }
}

function awardKill(w: World, base: number): number {
  const award = rocketCombo(w.combo, w.comboT, base);
  w.combo = award.streak; w.comboT = award.remaining; w.multiplier = award.multiplier;
  w.score += award.points;
  return award.points;
}

function destroyRock(w: World, r: Rock, sfx: Sfx, opts: Opts, noScore = false) {
  const tier = ROCK_TIERS[r.tier];
  explode(w, r.x, r.y, tier.draw * 0.6, opts, sfx);
  if (!noScore) {
    const points = awardKill(w, tier.score);
    w.pops.push(pop(r.x, r.y, `+${points}`));
  }
  if (r.tier < 2) {
    for (const dir of [-1, 1] as const) {
      const nt = (r.tier + 1) as 1 | 2;
      const t2 = ROCK_TIERS[nt];
      w.rocks.push({
        tier: nt,
        x: r.x,
        y: r.y,
        vx: dir * (55 + Math.random() * 70),
        vy: Math.max(60, r.vy * (0.75 + Math.random() * 0.4)),
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 3.4,
        hp: t2.hp,
        r: t2.r,
        size: t2.draw,
        hit: 0,
      });
    }
  } else if (!noScore && Math.random() < 0.12) {
    w.drops.push({ x: r.x, y: r.y, vy: 95, dead: false, kind: chooseRocketDrop() });
  }
  r.hp = 0;
}

function destroyFoe(w: World, f: Foe, sfx: Sfx, opts: Opts, noScore = false) {
  explode(w, f.x, f.y, 95, opts, sfx);
  if (!noScore) {
    const pts = (f.kind === 1 ? DIVER_SCORE : GUNNER_SCORE) * (f.elite ? 2 : 1);
    const points = awardKill(w, pts);
    w.pops.push(pop(f.x, f.y, `+${points}`));
    if (Math.random() < 0.25) w.drops.push({ x: f.x, y: f.y, vy: 95, dead: false, kind: chooseRocketDrop() });
  }
  f.hp = 0;
}

function damagePlayer(w: World, sfx: Sfx, opts: Opts) {
  const p = w.player;
  w.combo = 0; w.comboT = 0; w.multiplier = 1;
  const wasShielded = w.shield;
  const result = absorbHit(w.lives, w.shield);
  w.lives = result.lives; w.shield = result.shield;
  if (wasShielded) w.pops.push(pop(p.x, p.y, 'SHIELD BLOCKED'));
  w.shake = 16;
  sfx.hurt();
  explode(w, p.x, p.y, 70, opts, sfx);
  if (w.lives <= 0) {
    w.dying = 1.1;
    sfx.bigBoom();
    explode(w, p.x, p.y, 130, opts, sfx);
  } else {
    p.inv = INVULN_TIME;
    // Small mercy: clear enemy fire near the player
    for (const b of w.bolts) {
      if (!b.friendly && Math.hypot(b.x - p.x, b.y - p.y) < 110) b.dead = true;
    }
  }
}

function updateFx(w: World, dt: number) {
  for (let i = 0; i < PART_MAX; i++) {
    const pt = w.parts[i];
    if (pt.life > 0) {
      pt.life -= dt;
      if (pt.life > 0) {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
      }
    }
  }
  for (const s of w.pops) {
    s.life -= dt;
    s.y -= 34 * dt;
  }
  compact(w.pops, (s) => s.life > 0);
  w.shake *= Math.exp(-6 * dt);
  if (w.shake < 0.2) w.shake = 0;
}

/* ------------------------------------------------------------------ */
/* Simulation                                                          */
/* ------------------------------------------------------------------ */

function updateWorld(w: World, dt: number, io: IO) {
  const { keys, pointer, sfx, opts } = io;
  const p = w.player;

  // Death animation → game over
  if (w.dying > 0) {
    w.dying -= dt;
    updateFx(w, dt);
    if (w.dying <= 0) w.over = true;
    return;
  }

  w.elapsed += dt;
  w.comboT = Math.max(0, w.comboT - dt);
  if (!w.comboT) { w.combo = 0; w.multiplier = 1; }
  if (w.waveBannerT > 0) w.waveBannerT -= dt;
  w.waveTimer -= dt;
  if (w.waveTimer <= 0) {
    w.wave += 1;
    w.waveBannerT = 2;
    sfx.wave();
    w.waveTimer = WAVE_EVERY;
  }

  // ----- steering -----
  let kx = 0;
  let ky = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) kx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) kx += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) ky -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) ky += 1;

  if (kx !== 0 || ky !== 0) {
    const len = Math.hypot(kx, ky);
    p.vx = (kx / len) * PLAYER_SPEED;
    p.vy = (ky / len) * PLAYER_SPEED;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    pointer.active = false;
  } else if (pointer.active) {
    // Frame-rate-independent exponential approach with a dead-zone —
    // no more oscillation/jitter around the cursor.
    const dxp = pointer.x - p.x;
    const dyp = pointer.y - p.y;
    if (Math.hypot(dxp, dyp) > 2.5) {
      const k = 1 - Math.exp(-13 * dt);
      const nx = p.x + dxp * k;
      const ny = p.y + dyp * k;
      p.vx = (nx - p.x) / dt;
      p.vy = (ny - p.y) / dt;
      p.x = nx;
      p.y = ny;
    } else {
      p.vx = 0;
      p.vy = 0;
    }
  } else {
    const damp = Math.exp(-10 * dt);
    p.vx *= damp;
    p.vy *= damp;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  p.x = clamp(p.x, 26, W - 26);
  p.y = clamp(p.y, 44, H - 30);
  p.tilt += (clamp(p.vx * 0.00075, -0.32, 0.32) - p.tilt) * Math.min(1, dt * 12);

  if (w.powerT > 0) { w.powerT -= dt; if (w.powerT <= 0) w.power = null; }

  // ----- guns -----
  p.cool -= dt;
  p.burstCool -= dt;
  if (p.cool <= 0) {
    p.cool = w.power === 'rapid' ? FIRE_COOLDOWN * 0.55 : FIRE_COOLDOWN;
    w.bolts.push(mkBolt(p.x - 13, p.y - 20, p.vx * 0.18, -BULLET_SPEED, true));
    w.bolts.push(mkBolt(p.x + 13, p.y - 20, p.vx * 0.18, -BULLET_SPEED, true));
    if (w.power === 'spread') {
      w.bolts.push(mkBolt(p.x, p.y - 20, -170, -BULLET_SPEED, true));
      w.bolts.push(mkBolt(p.x, p.y - 20, 170, -BULLET_SPEED, true));
    }
    sfx.laser();
  }
  if (p.burstReq && p.burstCool <= 0) {
    p.burstCool = BURST_COOLDOWN;
    for (const a of [-0.24, -0.12, 0, 0.12, 0.24]) {
      w.bolts.push(
        mkBolt(p.x, p.y - 26, Math.sin(a) * BULLET_SPEED * 0.92, -Math.cos(a) * BULLET_SPEED * 0.92, true),
      );
    }
    sfx.burst();
  }
  p.burstReq = false;
  if (p.inv > 0) p.inv -= dt;

  // ----- engine trail -----
  if (!opts.reducedMotion) {
    const n = opts.lowPerf ? 1 : 2;
    for (let i = 0; i < n; i++) {
      emit(
        w,
        p.x + (Math.random() - 0.5) * 10,
        p.y + 30,
        (Math.random() - 0.5) * 30,
        130 + Math.random() * 60,
        0.3,
        2.2 + Math.random() * 1.6,
        Math.random() < 0.5 ? '#FF9A3C' : '#FFD23C',
      );
    }
  }

  // ----- spawning -----
  w.rockT -= dt;
  if (w.rockT <= 0) {
    spawnRock(w);
    if (w.wave >= 2 && !opts.lowPerf && Math.random() < 0.12 && w.rocks.length < 24) {
      spawnRock(w);
      const a = w.rocks[w.rocks.length - 2], b = w.rocks[w.rocks.length - 1];
      b.x = clamp(a.x + (a.x < W / 2 ? 85 : -85), 40, W - 40);
      b.y = a.y - 60;
    }
    w.rockT = Math.max(0.42, 1.25 - w.elapsed * 0.012) * (opts.lowPerf ? 1.3 : 1);
  }
  if (w.elapsed > 10) {
    w.foeT -= dt;
    if (w.foeT <= 0) {
      if (w.foes.length < (opts.lowPerf ? 3 : FOE_CAP)) spawnFoe(w);
      w.foeT = Math.max(2.1, 6.2 - w.elapsed * 0.05);
    }
  }

  // ----- rocks -----
  for (const r of w.rocks) {
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.rot += r.vr * dt;
    if (r.hit > 0) r.hit -= dt;
    if (r.x < r.r * 0.4 && r.vx < 0) r.vx *= -1;
    if (r.x > W - r.r * 0.4 && r.vx > 0) r.vx *= -1;
  }

  // ----- smart foes -----
  updateFoes(w, dt, sfx, opts);

  // ----- bolts & drops -----
  for (const b of w.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  for (const d of w.drops) d.y += d.vy * dt;

  // ----- collisions: friendly bolts -----
  for (const b of w.bolts) {
    if (!b.friendly || b.dead) continue;
    for (const r of w.rocks) {
      if (r.hp <= 0) continue;
      if (hit(b.x, b.y, 5, r.x, r.y, r.r)) {
        b.dead = true;
        r.hp -= 1;
        r.hit = 0.09;
        spark(w, b.x, b.y + 4, opts);
        if (r.hp <= 0) destroyRock(w, r, sfx, opts);
        break;
      }
    }
    if (b.dead) continue;
    for (const f of w.foes) {
      if (f.hp <= 0) continue;
      if (hit(b.x, b.y, 5, f.x, f.y, ENEMY_R)) {
        b.dead = true;
        f.hp -= 1;
        f.hit = 0.09;
        spark(w, b.x, b.y + 4, opts);
        if (f.hp <= 0) destroyFoe(w, f, sfx, opts);
        break;
      }
    }
  }

  // ----- collisions: player -----
  if (p.inv <= 0) {
    let hitPlayer = false;
    for (const b of w.bolts) {
      if (!b.friendly && hit(b.x, b.y, 4, p.x, p.y, PLAYER_R)) {
        b.dead = true;
        hitPlayer = true;
        break;
      }
    }
    if (!hitPlayer) {
      for (const r of w.rocks) {
        if (r.hp > 0 && hit(p.x, p.y, PLAYER_R, r.x, r.y, r.r * 0.82)) {
          destroyRock(w, r, sfx, opts, true);
          hitPlayer = true;
          break;
        }
      }
    }
    if (!hitPlayer) {
      for (const f of w.foes) {
        if (f.hp > 0 && hit(p.x, p.y, PLAYER_R, f.x, f.y, ENEMY_R * 0.8)) {
          destroyFoe(w, f, sfx, opts, true);
          hitPlayer = true;
          break;
        }
      }
    }
    if (hitPlayer) damagePlayer(w, sfx, opts);
  }

  // ----- pickups -----
  for (const d of w.drops) {
    if (!d.dead && hit(p.x, p.y, PLAYER_R + 6, d.x, d.y, 13)) {
      d.dead = true;
      if (d.kind === 'emp') {
        w.emp = true; w.pops.push(pop(d.x, d.y, 'EMP READY'));
      } else if (d.kind === 'shield') {
        w.shield = true;
        w.pops.push(pop(d.x, d.y, 'SHIELD READY'));
      } else if (d.kind !== 'repair') {
        w.power = d.kind;
        w.powerT = 12;
        w.pops.push(pop(d.x, d.y, d.kind === 'rapid' ? 'RAPID FIRE' : 'SPREAD FIRE'));
      } else if (w.lives < MAX_LIVES) {
        w.lives += 1;
        w.pops.push(pop(d.x, d.y, '+1 LIFE'));
      } else {
        w.score += 50;
        w.pops.push(pop(d.x, d.y, '+50'));
      }
      sfx.pickup();
    }
  }

  updateFx(w, dt);

  // ----- cull (in-place, allocation-free) -----
  compact(w.rocks, (r) => r.hp > 0 && r.y < H + 80);
  compact(w.foes, (f) => f.hp > 0 && f.y < H + 70);
  compact(w.bolts, (b) => !b.dead && b.y > -30 && b.y < H + 30 && b.x > -30 && b.x < W + 30);
  compact(w.drops, (d) => !d.dead && d.y < H + 30);
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function drawBolt(ctx: CanvasRenderingContext2D, b: Bolt) {
  if (b.friendly) {
    ctx.fillStyle = 'rgba(90, 220, 255, 0.5)';
    ctx.fillRect(b.x - 3, b.y - 9, 6, 18);
    ctx.fillStyle = '#EAFBFF';
    ctx.fillRect(b.x - 1.5, b.y - 6, 3, 12);
  } else {
    ctx.fillStyle = 'rgba(255, 80, 60, 0.55)';
    ctx.fillRect(b.x - 3, b.y - 8, 6, 16);
    ctx.fillStyle = '#FFD0C0';
    ctx.fillRect(b.x - 1.5, b.y - 5, 3, 10);
  }
}

function drawDrop(ctx: CanvasRenderingContext2D, d: Drop, time: number, shield?: HTMLImageElement, emp?: HTMLImageElement) {
  if (d.kind === 'emp' && emp) { ctx.drawImage(emp, d.x - 18, d.y - 18, 36, 36); return; }
  if (d.kind === 'shield' && shield) { ctx.drawImage(shield, d.x - 18, d.y - 18, 36, 36); return; }
  const r = 11 + Math.sin(time * 6 + d.x) * 1.2;
  ctx.fillStyle = d.kind === 'repair' ? '#3EE06E' : d.kind === 'rapid' ? '#FFB22C' : '#AD8CFF';
  ctx.beginPath();
  ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  if (d.kind === 'repair') {
    ctx.fillRect(d.x - 1.8, d.y - 6, 3.6, 12);
    ctx.fillRect(d.x - 6, d.y - 1.8, 12, 3.6);
  } else {
    ctx.font = `bold 14px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(d.kind === 'rapid' ? 'R' : d.kind === 'emp' ? 'E' : 'S', d.x, d.y + 5);
  }
}

function drawPlaceholderRocket(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = '#E44D3C';
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(16, 26);
  ctx.lineTo(-16, 26);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, w: World, rocket?: HTMLImageElement) {
  ctx.textAlign = 'left';
  ctx.font = `bold 20px ${MONO}`;
  ctx.fillStyle = '#CCFF00';
  ctx.fillText(`SCORE ${String(w.score).padStart(6, '0')}`, 18, 32);
  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(`BEST ${String(Math.max(w.best, w.score)).padStart(6, '0')}`, 18, 50);

  if (w.power) {
    ctx.fillStyle = '#FFD23C';
    ctx.fillText(`${w.power === 'rapid' ? 'RAPID' : 'SPREAD'} ${Math.ceil(w.powerT)}s`, 18, 67);
  }

  if (w.shield) { ctx.fillStyle = '#76ecff'; ctx.fillText('SHIELD READY', 18, 84); }

  if (w.combo > 0) { ctx.fillStyle = '#ffcf6b'; ctx.fillText(`COMBO ${w.combo} · ${w.multiplier}x`, 18, 101); }

  if (w.emp) { ctx.fillStyle = '#d6aaff'; ctx.fillText('EMP READY · E', 18, 118); }

  // Lives as mini rocket icons
  for (let i = 0; i < w.lives; i++) {
    const x = W - 32 - i * 24;
    if (rocket) {
      const dw = 20 * (rocket.width / rocket.height);
      ctx.drawImage(rocket, x - dw / 2, 14, dw, 20);
    } else {
      drawPlaceholderRocket(ctx, x, 24, 0);
    }
  }
}

function drawWaveBanner(ctx: CanvasRenderingContext2D, w: World) {
  if (w.waveBannerT <= 0) return;
  const a = Math.min(1, (2 - w.waveBannerT) / 0.25) * Math.min(1, w.waveBannerT / 0.5);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#CCFF00';
  ctx.font = `900 44px ${MONO}`;
  ctx.fillText(`WAVE ${w.wave}`, W / 2, H / 2 - 40);
  ctx.font = `13px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('hostiles inbound', W / 2, H / 2 - 16);
  ctx.globalAlpha = 1;
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  w: World,
  assets: GameAssets,
  rc: RenderCache,
  opts: Opts,
  time: number,
  status: Status,
) {
  // Background (gradient cached — never rebuilt per frame)
  if (rc.gradient) {
    ctx.fillStyle = rc.gradient;
  } else {
    ctx.fillStyle = '#0a0d1e';
  }
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (w.shake > 0 && !opts.reducedMotion) {
    ctx.translate((Math.random() - 0.5) * w.shake, (Math.random() - 0.5) * w.shake);
  }

  // Pre-rendered star layers — 2 drawImage calls each, zero per-star state changes
  for (let li = 0; li < STAR_DEFS.length; li++) {
    const c = rc.stars[li];
    if (!c) continue;
    const off = (time * STAR_DEFS[li].speed) % H;
    ctx.drawImage(c, 0, off - H);
    ctx.drawImage(c, 0, off);
  }

  if (status === 'menu') {
    ctx.restore();
    return;
  }

  const p = w.player;

  // Drops
  for (const d of w.drops) drawDrop(ctx, d, time, assets.shield, assets.emp);

  // Rocks (flash variant pre-rendered — no ctx.filter)
  const rockFlash = rc.flash.asteroid;
  for (const r of w.rocks) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    const img = r.hit > 0 && rockFlash ? rockFlash : assets.asteroid;
    if (img) {
      ctx.drawImage(img, -r.size / 2, -r.size / 2, r.size, r.size);
    } else {
      ctx.fillStyle = '#7A6A5A';
      ctx.beginPath();
      ctx.arc(0, 0, r.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Foes (tilt into their velocity, flash on hit, glow when telegraphing)
  const foeFlash = rc.flash.enemy;
  for (const f of w.foes) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(clamp(f.vx * 0.0011, -0.26, 0.26));
    if (f.hit > 0 && foeFlash) {
      const dh = 64;
      const dw = dh * (foeFlash.width / foeFlash.height);
      ctx.drawImage(foeFlash, -dw / 2, -dh / 2, dw, dh);
    } else if (assets.enemy) {
      const dh = 64;
      const dw = dh * (assets.enemy.width / assets.enemy.height);
      ctx.drawImage(assets.enemy, -dw / 2, -dh / 2, dw, dh);
    } else {
      ctx.fillStyle = '#333344';
      ctx.fillRect(-22, -26, 44, 52);
    }
    ctx.restore();

    if (f.elite) {
      ctx.strokeStyle = '#FFD23C'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.arc(f.x, f.y, ENEMY_R + 5, 0, Math.PI * 2); ctx.stroke();
    }
    if (f.teleT > 0) {
      ctx.globalAlpha = 0.45 + 0.45 * Math.sin(time * 24);
      ctx.strokeStyle = '#FF5A3C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, ENEMY_R + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Bolts
  for (const b of w.bolts) drawBolt(ctx, b);

  // Player rocket (blinks while invulnerable, hidden while dying)
  if (!w.dying) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt);
    if (p.inv > 0) ctx.globalAlpha = 0.3 + 0.25 * Math.sin(time * 26);
    if (assets.rocket) {
      const dh = 66;
      const dw = dh * (assets.rocket.width / assets.rocket.height);
      ctx.drawImage(assets.rocket, -dw / 2, -dh / 2, dw, dh);
    } else {
      drawPlaceholderRocket(ctx, 0, 0, 0);
    }
    ctx.restore();
  }

  // Particles (fixed pool)
  for (let i = 0; i < PART_MAX; i++) {
    const pt = w.parts[i];
    if (pt.life <= 0) continue;
    const a = Math.max(0, pt.life / pt.maxLife);
    if (pt.ring) {
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (1 - a) * pt.maxR + 4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
  }
  ctx.globalAlpha = 1;

  // Score pops
  ctx.textAlign = 'center';
  ctx.font = `bold 13px ${MONO}`;
  for (const s of w.pops) {
    ctx.globalAlpha = Math.min(1, s.life / 0.5);
    ctx.fillStyle = '#CCFF00';
    ctx.fillText(s.text, s.x, s.y);
  }
  ctx.globalAlpha = 1;

  drawHud(ctx, w, assets.rocket);
  drawWaveBanner(ctx, w);

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* React component                                                     */
/* ------------------------------------------------------------------ */

export function RocketRampageGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World | null>(null);
  const assetsRef = useRef<GameAssets>({});
  const rcRef = useRef<RenderCache>({ gradient: null, stars: [], flash: {} });
  const keysRef = useRef<Set<string>>(new Set());
  const pointerRef = useRef({ x: W / 2, y: H - 90, active: false });
  const statusRef = useRef<Status>('loading');
  const sfxRef = useRef<Sfx | null>(null);
  const optsRef = useRef<Opts>({ reducedMotion: false, lowPerf: false });
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const [status, setStatus] = useState<Status>('loading');
  const [best, setBest] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [muted, setMuted] = useState(false);
  const [empReady, setEmpReady] = useState(false);
  const empMirror = useRef(false);

  const applyStatus = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') { sfxRef.current?.stop(); applyStatus('paused'); }
    else if (statusRef.current === 'paused') { sfxRef.current?.ensure(); applyStatus('playing'); }
  }, [applyStatus]);

  const startGame = useCallback(() => {
    sfxRef.current?.ensure();
    worldRef.current = createWorld();
    empMirror.current = false; setEmpReady(false);
    setFinalScore(0);
    setNewBest(false);
    applyStatus('playing');
  }, [applyStatus]);

  const useEmp = useCallback(() => {
    const w = worldRef.current;
    if (!w || statusRef.current !== 'playing' || !w.emp || w.dying > 0 || w.over) return;
    w.emp = false; clearHostileFire(w.bolts);
    w.pops.push(pop(w.player.x, w.player.y, 'EMP PULSE'));
    sfxRef.current?.burst(); empMirror.current = false; setEmpReady(false);
  }, []);
  const useEmpRef = useRef(useEmp); useEmpRef.current = useEmp;

  const togglePauseRef = useRef(togglePause);
  togglePauseRef.current = togglePause;

  const bestRef = useRef(0);
  const gameOverRef = useRef<() => void>(() => undefined);
  gameOverRef.current = () => {
    const w = worldRef.current;
    if (!w) return;
    setFinalScore(w.score);
    const isBest = w.score > bestRef.current;
    setNewBest(isBest);
    if (isBest) {
      bestRef.current = w.score;
      setBest(w.score);
      try {
        localStorage.setItem(BEST_KEY, String(w.score));
      } catch {
        /* storage full / private mode */
      }
    }
    applyStatus('gameover');
  };

  const toggleMute = () => {
    const next = !muted;
    if (sfxRef.current) { sfxRef.current.muted = next; if (next) sfxRef.current.stop(); else sfxRef.current.ensure(); }
    setMuted(next);
    try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch {}
  };

  // Main engine effect (mount once)
  useEffect(() => {
    let storedMute = false;
    try {
      const b = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
      bestRef.current = b;
      setBest(b);
      storedMute = (localStorage.getItem(MUTE_KEY) ?? localStorage.getItem('duenever_rocket_muted_v1')) === '1';
      setMuted(storedMute);
      const s = getStoredSettings();
      optsRef.current = { reducedMotion: s.reducedMotion, lowPerf: s.lowPerformance };
    } catch {
      /* ignore */
    }
    if (!sfxRef.current) sfxRef.current = new Sfx();
    sfxRef.current.muted = storedMute;

    const canvas = canvasRef.current;
    if (!canvas) return;
    // Cap devicePixelRatio — a full 2x backing store is a big cost on low-end GPUs
    const dpr = Math.min(optsRef.current.lowPerf ? 1 : 1.75, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Build the render cache: background gradient + pre-rendered star layers
    const rc = rcRef.current;
    try {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#04050d');
      g.addColorStop(0.55, '#0a0d1e');
      g.addColorStop(1, '#101228');
      rc.gradient = g;
    } catch {
      /* gradient optional */
    }
    if (rc.stars.length === 0) {
      rc.stars = STAR_DEFS.map((l) => buildStarCanvas(l));
    }

    let cancelled = false;
    const loadPromise = Promise.all(
      (Object.entries(ASSET_SRC) as [AssetKey, string][]).map(
        ([k, src]) =>
          new Promise<[AssetKey, HTMLImageElement]>((res, rej) => {
            const im = new Image();
            im.onload = () => res([k, im]);
            im.onerror = () => rej(new Error(`failed to load ${src}`));
            im.src = src;
          }),
      ),
    );
    loadPromise
      .then((entries) => {
        if (cancelled) return;
        for (const [k, im] of entries) {
          assetsRef.current[k] = im;
          rc.flash[k] = buildFlash(im);
        }
        worldRef.current = createWorld();
        applyStatus('menu');
      })
      .catch(() => {
        // Still playable with placeholder vector art if images fail
        if (!cancelled) {
          worldRef.current = createWorld();
          applyStatus('menu');
        }
      });

    const io: IO = {
      keys: keysRef.current,
      pointer: pointerRef.current,
      sfx: sfxRef.current,
      opts: optsRef.current,
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const w = worldRef.current;
      if (!w) return;
      if (statusRef.current === 'playing') {
        updateWorld(w, dt, io);
        if (w.emp !== empMirror.current) { empMirror.current = w.emp; setEmpReady(w.emp); }
        if (w.over && statusRef.current === 'playing') gameOverRef.current();
      }
      drawWorld(ctx, w, assetsRef.current, rc, optsRef.current, now / 1000, statusRef.current);
    };
    raf = requestAnimationFrame(tick);
    const syncMute = (event: StorageEvent) => {
      if (event.key !== MUTE_KEY || !sfxRef.current) return;
      const next = event.newValue === '1'; sfxRef.current.muted = next; setMuted(next);
      if (next) sfxRef.current.stop();
    };
    window.addEventListener('storage', syncMute);

    return () => {
      window.removeEventListener('storage', syncMute);
      cancelled = true;
      cancelAnimationFrame(raf);
      sfxRef.current?.close();
      sfxRef.current = null;
    };
  }, [applyStatus]);

  // Keyboard + visibility handling (mount once)
  useEffect(() => {
    const BLOCK = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
    const down = (e: KeyboardEvent) => {
      const st = statusRef.current;
      if (st === 'playing' || st === 'paused') {
        if (BLOCK.has(e.code)) e.preventDefault();
        keysRef.current.add(e.code);
        if (e.code === 'KeyP' || e.code === 'Escape') {
          e.preventDefault();
          togglePauseRef.current();
        }
        if (e.code === 'KeyE' && st === 'playing' && !e.repeat) useEmpRef.current();
        if (e.code === 'Space' && st === 'playing') {
          const w = worldRef.current;
          if (w) w.player.burstReq = true;
        }
      } else if (st === 'gameover' && e.code === 'Escape') {
        onBackRef.current();
      }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const vis = () => {
      if (document.hidden && statusRef.current === 'playing') togglePauseRef.current();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      document.removeEventListener('visibilitychange', vis);
      keysRef.current.clear();
    };
  }, []);

  const toLogical = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top) * (H / rect.height),
    };
  };

  const touchRef = useRef<{ id: number; x: number; y: number; px: number; py: number } | null>(null);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (statusRef.current !== 'playing') return;
    const pt = toLogical(e.clientX, e.clientY);
    if (!pt) return;
    const touch = touchRef.current;
    if (e.pointerType === 'touch') {
      if (!touch || touch.id !== e.pointerId) return;
      pointerRef.current.x = touch.px + pt.x - touch.x;
      pointerRef.current.y = touch.py + pt.y - touch.y;
    } else {
      pointerRef.current.x = pt.x;
      pointerRef.current.y = pt.y;
    }
    pointerRef.current.active = true;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (statusRef.current !== 'playing') return;
    const pt = toLogical(e.clientX, e.clientY);
    if (e.pointerType === 'touch' && pt && worldRef.current) {
      e.currentTarget.setPointerCapture(e.pointerId);
      const player = worldRef.current.player;
      touchRef.current = { id: e.pointerId, x: pt.x, y: pt.y, px: player.x, py: player.y };
      pointerRef.current.active = true;
      pointerRef.current.x = player.x;
      pointerRef.current.y = player.y;
      return;
    }
    if (pt) {
      pointerRef.current.x = pt.x;
      pointerRef.current.y = pt.y;
      pointerRef.current.active = true;
    }
    const w = worldRef.current;
    if (w) w.player.burstReq = true;
  };

  const playing = status === 'playing';

  return (
    <div
      className="fixed inset-0 z-[70] h-[100dvh] overflow-hidden bg-black font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Rocket Rampage game"
    >
      <div className="w-full h-full flex flex-col gap-0">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between font-mono text-xs px-2 py-1 bg-neutral-950">
          <div className="flex items-center gap-2 text-neutral-200 font-bold tracking-wide">
            <RocketIcon className="w-4 h-4 text-[color:var(--accent)]" />
            ROCKET RAMPAGE
          </div>
          <div className="flex items-center gap-2">
            {best > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-300">
                <Trophy className="w-3.5 h-3.5 text-[color:var(--accent)]" /> Best {best}
              </span>
            )}
            <button
              onClick={toggleMute}
              className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg transition-colors cursor-pointer"
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {(playing || status === 'paused') && (
              <button
                onClick={togglePause}
                className="p-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg transition-colors cursor-pointer"
                aria-label={playing ? 'Pause game' : 'Resume game'}
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" /> <span className="hidden sm:inline">Quit</span>
            </button>
          </div>
        </div>

        {/* Playfield */}
        <div
          className="relative w-full flex-1 min-h-0 overflow-hidden bg-black"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={(e) => { if (touchRef.current?.id === e.pointerId) { touchRef.current = null; pointerRef.current.active = false; } }}
          onPointerCancel={() => { touchRef.current = null; pointerRef.current.active = false; }}
          style={{ touchAction: playing ? 'none' : 'pan-y' }}
        >
          <canvas ref={canvasRef} className="block w-full h-full select-none" aria-label="Rocket Rampage playfield" />

          {/* Loading overlay */}
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#050508]">
              <span className="font-mono text-xs text-neutral-400 animate-pulse">LOADING ASSETS…</span>
            </div>
          )}

          {/* Menu overlay */}
          {status === 'menu' && (
            <div className="absolute inset-0 flex flex-col items-center justify-start sm:justify-center gap-2 sm:gap-4 overflow-y-auto bg-black/80 px-3 py-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/games/rocket-rampage/rocket.png"
                alt=""
                draggable={false}
                className="hidden sm:block w-16 animate-pulse drop-shadow-[0_0_18px_rgba(204,255,0,0.35)]"
              />
              <h2 className="font-mono text-xl sm:text-4xl font-black tracking-tight text-neutral-50">
                ROCKET <span className="text-[color:var(--accent)]">RAMPAGE</span>
              </h2>
              <p className="font-mono text-xs text-neutral-300 max-w-md leading-relaxed">
                Collect an EMP charge and press E to clear enemy fire. Grab repairs, weapons and shields.
                <br />
                Chain takedowns within four seconds for up to 4× points. Cannons auto-fire.
              </p>
              <div className="hidden sm:flex flex-row items-center gap-3 font-mono text-[11px] text-neutral-400">
                <span className="px-2 py-1 bg-neutral-900/80 border border-neutral-700 rounded">MOUSE / WASD — steer</span>
                <span className="px-2 py-1 bg-neutral-900/80 border border-neutral-700 rounded">SPACE / TAP — spread burst</span>
                <span className="px-2 py-1 bg-neutral-900/80 border border-neutral-700 rounded">P / ESC — pause</span>
              </div>
              {best > 0 && (
                <span className="flex items-center gap-1.5 font-mono text-xs text-[color:var(--accent)]">
                  <Trophy className="w-3.5 h-3.5" /> Best score: {best}
                </span>
              )}
              <button
                onClick={startGame}
                className="mt-1 px-8 py-3 bg-[var(--accent)] hover:bg-lime-300 text-black font-mono font-bold text-sm rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.25)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
              >
                ▶ LAUNCH MISSION
              </button>
            </div>
          )}

          {/* Paused overlay */}
          {status === 'paused' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-[2px] text-center">
              <h2 className="font-mono text-3xl font-black tracking-widest text-neutral-100">PAUSED</h2>
              <button
                onClick={togglePause}
                className="px-6 py-2.5 bg-[var(--accent)] hover:bg-lime-300 text-black font-mono font-bold text-sm rounded-lg border-2 border-black transition-colors cursor-pointer"
              >
                ▶ Resume
              </button>
              <p className="font-mono text-[11px] text-neutral-400">P / Esc to resume</p>
            </div>
          )}

          {/* Game over overlay */}
          {status === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-start sm:justify-center gap-2 overflow-y-auto bg-black/90 text-center px-3 py-2">
              <h2 className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-rose-400">GAME OVER</h2>
              {newBest && (
                <span className="font-mono text-xs font-bold text-[color:var(--accent)] animate-pulse tracking-widest">
                  ★ NEW BEST SCORE ★
                </span>
              )}
              <div className="font-mono text-5xl sm:text-6xl font-black text-neutral-50 my-1">{finalScore}</div>
              <div className="font-mono text-xs text-neutral-400">best {Math.max(best, finalScore)}</div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 bg-[var(--accent)] hover:bg-lime-300 text-black font-mono font-bold text-sm rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.25)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
                >
                  ⟳ Play again
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-600 text-neutral-200 font-mono text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        {playing && <div className="flex gap-1"><button type="button" onClick={() => { if (worldRef.current) worldRef.current.player.burstReq = true; }} className="sm:hidden min-h-12 flex-1 rounded-lg bg-[var(--accent)] text-black font-mono font-bold">FIRE SPREAD BURST</button><button type="button" onClick={useEmp} disabled={!empReady} className="min-h-12 flex-1 rounded-lg bg-violet-800 text-white font-mono font-bold disabled:opacity-40">{empReady ? 'USE EMP · E' : 'EMP EMPTY'}</button></div>}
        <p className="hidden sm:block text-[10px] font-mono text-neutral-500 text-center">Drag to steer on touch · burst button fires spread · mouse / WASD and Space on desktop · collect R or S power-ups · E fires a stored EMP</p>
      </div>
    </div>
  );
}

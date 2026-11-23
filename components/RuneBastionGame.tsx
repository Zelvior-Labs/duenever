'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Pause, Play, Shield, Volume2, VolumeX, X } from 'lucide-react';
import { getStoredSettings } from '@/lib/storage';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const W = 900;
const H = 560;
const BEST_KEY = 'duenever_rune_best_v1';
const MUTE_KEY = 'duenever_rune_muted_v1';

const START_GOLD = 180;
const START_LIVES = 20;
const BUILD_TIME = 16; // auto-start countdown between waves (s)
const SPEED_MULT = 2; // fast-forward factor

/** Marching path — enemies enter left, weave through the bastion, exit right. */
const PATH: ReadonlyArray<readonly [number, number]> = [
  [-40, 140],
  [220, 140],
  [220, 340],
  [500, 340],
  [500, 140],
  [780, 140],
  [780, 430],
  [940, 430],
];

const PATH_HALF = 27;
const SEG_LEN: number[] = [];
const SEG_CUM: number[] = [0];
for (let i = 0; i < PATH.length - 1; i++) {
  const [x1, y1] = PATH[i];
  const [x2, y2] = PATH[i + 1];
  SEG_LEN.push(Math.hypot(x2 - x1, y2 - y1));
  SEG_CUM.push(SEG_CUM[i] + SEG_LEN[i]);
}
const PATH_TOTAL = SEG_CUM[SEG_CUM.length - 1];

/** Fixed build pads (validated ≥ 62px from the path corridor). */
const PADS: ReadonlyArray<readonly [number, number]> = [
  [110, 250],
  [110, 60],
  [330, 90],
  [330, 235],
  [410, 430],
  [410, 55],
  [600, 230],
  [600, 450],
  [690, 60],
  [860, 240],
  [860, 80],
  [110, 430],
];

type TowerKind = 0 | 1 | 2; // mage | ranger | frost

const TOWERS: Record<TowerKind, { name: string; cost: number; dmg: number; range: number; rate: number; blurb: string }> = {
  0: { name: 'Arcane Spire', cost: 70, dmg: 24, range: 132, rate: 0.9, blurb: 'Homing bolts' },
  1: { name: 'Ranger Post', cost: 50, dmg: 10, range: 152, rate: 0.34, blurb: 'Rapid arrows' },
  2: { name: 'Frost Keep', cost: 90, dmg: 8, range: 122, rate: 1.1, blurb: 'AoE chill 45%' },
};

interface Tower {
  kind: TowerKind;
  pad: number;
  level: number; // 1..3
  cool: number;
  invested: number;
  aim: number; // aim angle for drawing
}

interface Enemy {
  kind: 0 | 1 | 2; // goblin | brute | dragon boss
  wp: number;
  x: number;
  y: number;
  prog: number; // distance travelled along path (targeting priority)
  speed: number;
  slowT: number;
  hp: number;
  maxHp: number;
  bounty: number;
  dmg: number;
  hit: number;
  t: number;
}

interface Proj {
  kind: TowerKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  dmg: number;
  target: Enemy | null;
  tx: number;
  ty: number;
  dead: boolean;
}

interface Blast {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  color: string;
  dmg: number;
  slow: boolean;
  hitDone: boolean;
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

interface Pop {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

interface SpawnItem {
  kind: 0 | 1 | 2;
  at: number; // wave-relative spawn time
}

interface World {
  towers: (Tower | null)[];
  enemies: Enemy[];
  projs: Proj[];
  blasts: Blast[];
  parts: Particle[];
  partI: number;
  pops: Pop[];
  gold: number;
  lives: number;
  wave: number; // last completed / current wave number
  phase: 'build' | 'combat';
  buildT: number;
  spawnQ: SpawnItem[];
  spawnT: number;
  score: number;
  best: number;
  shake: number;
  over: boolean;
  time: number;
}

interface Opts {
  reducedMotion: boolean;
  lowPerf: boolean;
}

const ASSET_SRC = {
  mage: '/games/rune-bastion/tower-mage.png',
  ranger: '/games/rune-bastion/tower-ranger.png',
  frost: '/games/rune-bastion/tower-frost.png',
  goblin: '/games/rune-bastion/enemy-goblin.png',
  brute: '/games/rune-bastion/enemy-brute.png',
  dragon: '/games/rune-bastion/enemy-dragon.png',
} as const;

type AssetKey = keyof typeof ASSET_SRC;
type GameAssets = Partial<Record<AssetKey, HTMLImageElement>>;

interface RenderCache {
  map: HTMLCanvasElement | null;
  flash: Partial<Record<AssetKey, HTMLCanvasElement | null>>;
}

/* ------------------------------------------------------------------ */
/* Sound                                                               */
/* ------------------------------------------------------------------ */

class Sfx {
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  ensure() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.5), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, freq: number, vol: number, delay = 0) {
    if (!this.ctx || this.muted || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.ctx.destination);
    src.start(t);
    src.stop(t + dur);
  }

  mage() {
    this.tone('sine', 760, 240, 0.14, 0.045);
  }
  arrow() {
    this.tone('square', 1400, 500, 0.05, 0.025);
  }
  frost() {
    this.tone('triangle', 980, 340, 0.16, 0.04);
  }
  shatter() {
    this.noise(0.2, 2200, 0.08);
    this.tone('triangle', 700, 190, 0.18, 0.05);
  }
  die() {
    this.noise(0.22, 1100, 0.11);
    this.tone('triangle', 160, 45, 0.22, 0.09);
  }
  bossDie() {
    this.noise(0.55, 900, 0.2);
    this.tone('triangle', 90, 26, 0.5, 0.15);
  }
  leak() {
    this.tone('sawtooth', 190, 55, 0.3, 0.12);
  }
  build() {
    this.tone('square', 180, 90, 0.12, 0.07);
    this.noise(0.12, 700, 0.06);
  }
  upgrade() {
    this.tone('sine', 520, 520, 0.07, 0.06);
    window.setTimeout(() => this.tone('sine', 780, 780, 0.12, 0.06), 70);
  }
  sell() {
    this.tone('sine', 700, 350, 0.12, 0.05);
  }
  horn() {
    this.tone('sawtooth', 220, 220, 0.28, 0.06);
    window.setTimeout(() => this.tone('sawtooth', 330, 330, 0.36, 0.06), 220);
  }
  deny() {
    this.tone('square', 140, 90, 0.12, 0.06);
  }
  over() {
    this.tone('sawtooth', 300, 60, 0.7, 0.14);
    this.noise(0.7, 800, 0.16);
  }
  close() {
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function compact<T>(arr: T[], keep: (v: T) => boolean): void {
  let j = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (keep(v)) arr[j++] = v;
  }
  arr.length = j;
}

const PART_MAX = 500;

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

function sparks(w: World, x: number, y: number, color: string, n: number, opts: Opts) {
  if (opts.reducedMotion) n = Math.min(2, n);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 110;
    emit(w, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.22 + Math.random() * 0.15, 1.8 + Math.random() * 1.6, color);
  }
}

function readBest(): number {
  try {
    return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function createWorld(): World {
  return {
    towers: PADS.map(() => null),
    enemies: [],
    projs: [],
    blasts: [],
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
    gold: START_GOLD,
    lives: START_LIVES,
    wave: 0,
    phase: 'build',
    buildT: BUILD_TIME,
    spawnQ: [],
    spawnT: 0,
    score: 0,
    best: readBest(),
    shake: 0,
    over: false,
    time: 0,
  };
}

/** Composition of wave n: goblin stream + brutes + a boss every 8th wave. */
function buildWave(n: number): SpawnItem[] {
  const items: SpawnItem[] = [];
  const goblins = 5 + n * 2;
  const gap = Math.max(0.34, 0.85 - n * 0.02);
  for (let i = 0; i < goblins; i++) items.push({ kind: 0, at: 0.4 + i * gap });
  const brutes = Math.floor(n / 3);
  for (let i = 0; i < brutes; i++) items.push({ kind: 1, at: 2.5 + i * 2.4 });
  if (n % 8 === 0) items.push({ kind: 2, at: 4 + brutes * 2.4 });
  items.sort((a, b) => a.at - b.at);
  return items;
}

function spawnEnemy(w: World, kind: 0 | 1 | 2, n: number) {
  const [x, y] = PATH[0];
  let hp: number;
  let speed: number;
  let bounty: number;
  let dmg: number;
  if (kind === 0) {
    hp = 55 * (1 + (n - 1) * 0.18);
    speed = 62 + Math.min(26, n * 0.8);
    bounty = 8 + Math.floor(n / 4);
    dmg = 1;
  } else if (kind === 1) {
    hp = 310 * (1 + Math.max(0, n - 3) * 0.15);
    speed = 34;
    bounty = 25 + Math.floor(n / 3);
    dmg = 3;
  } else {
    hp = 1500 * (1 + Math.max(0, n / 8 - 1) * 0.85);
    speed = 40;
    bounty = 120;
    dmg = 6;
  }
  w.enemies.push({
    kind,
    wp: 1,
    x,
    y,
    prog: 0,
    speed,
    slowT: 0,
    hp,
    maxHp: hp,
    bounty,
    dmg,
    hit: 0,
    t: Math.random() * 6,
  });
}

function callWave(w: World, sfx: Sfx) {
  if (w.phase !== 'build') return;
  w.wave += 1;
  w.phase = 'combat';
  w.spawnQ = buildWave(w.wave);
  w.spawnT = 0;
  sfx.horn();
}

function damageEnemy(w: World, e: Enemy, dmg: number, opts: Opts, sfx: Sfx) {
  e.hp -= dmg;
  e.hit = 0.08;
  if (e.hp <= 0) {
    w.gold += e.bounty;
    w.score += e.bounty;
    w.pops.push({ x: e.x, y: e.y - 14, text: `+${e.bounty}`, life: 0.9, color: '#FFD23C' });
    const big = e.kind === 2;
    if (big) {
      sfx.bossDie();
      w.shake = Math.min(20, w.shake + 12);
      if (!opts.reducedMotion) emit(w, e.x, e.y, 0, 0, 0.5, 0, '#C09AFF', true, 110);
    } else {
      sfx.die();
      w.shake = Math.min(14, w.shake + 3);
    }
    const n = opts.reducedMotion ? 6 : big ? 26 : e.kind === 1 ? 16 : 9;
    const colors = e.kind === 2 ? ['#C09AFF', '#7C4DFF', '#FFD23C'] : e.kind === 1 ? ['#FFA03C', '#FFD08A'] : ['#7CC94A', '#A8E06A'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 130;
      emit(w, e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.35 + Math.random() * 0.3, 2 + Math.random() * 3, colors[i % colors.length]);
    }
  }
}

function towerStats(kind: TowerKind, level: number) {
  const b = TOWERS[kind];
  const dmgM = 1 + (level - 1) * 0.35;
  const rateM = 1 / (1 + (level - 1) * 0.12);
  const rngM = 1 + (level - 1) * 0.07;
  return { dmg: b.dmg * dmgM, rate: b.rate * rateM, range: b.range * rngM };
}

function updateWorld(w: World, dt: number, sfx: Sfx, opts: Opts) {
  w.time += dt;

  // ----- phase logic -----
  if (w.phase === 'build') {
    w.buildT -= dt;
    if (w.buildT <= 0) callWave(w, sfx);
  } else {
    w.spawnT += dt;
    while (w.spawnQ.length > 0 && w.spawnQ[0].at <= w.spawnT) {
      spawnEnemy(w, w.spawnQ[0].kind, w.wave);
      w.spawnQ.shift();
    }
    if (w.spawnQ.length === 0 && w.enemies.length === 0) {
      // Wave cleared — bonus gold
      const bonus = 20 + w.wave * 4;
      w.gold += bonus;
      w.score += bonus;
      w.pops.push({ x: W / 2, y: H / 2 - 60, text: `WAVE ${w.wave} CLEARED  +${bonus}`, life: 1.6, color: '#FFD23C' });
      w.phase = 'build';
      w.buildT = BUILD_TIME;
    }
  }

  // ----- enemies -----
  for (const e of w.enemies) {
    e.t += dt;
    if (e.hit > 0) e.hit -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    const sp = e.speed * (e.slowT > 0 ? 0.55 : 1);
    let step = sp * dt;
    while (step > 0 && e.wp < PATH.length) {
      const [tx, ty] = PATH[e.wp];
      const dx = tx - e.x;
      const dy = ty - e.y;
      const d = Math.hypot(dx, dy);
      if (d <= step) {
        e.x = tx;
        e.y = ty;
        e.prog += d;
        step -= d;
        e.wp += 1;
      } else {
        e.x += (dx / d) * step;
        e.y += (dy / d) * step;
        e.prog += step;
        step = 0;
      }
    }
    if (e.wp >= PATH.length) {
      // Leaked through the bastion
      e.hp = 0;
      e.wp = PATH.length + 1; // mark for cull
      w.lives -= e.dmg;
      w.shake = 14;
      sfx.leak();
      w.pops.push({ x: W - 60, y: 60, text: `-${e.dmg}`, life: 1.1, color: '#FF5A5A' });
      if (w.lives <= 0) {
        w.over = true;
        sfx.over();
      }
    }
  }

  // ----- towers -----
  for (let i = 0; i < w.towers.length; i++) {
    const tw = w.towers[i];
    if (!tw) continue;
    tw.cool -= dt;
    const [px, py] = PADS[i];
    const st = towerStats(tw.kind, tw.level);
    if (tw.cool > 0) continue;

    // Target: deepest-progress enemy within range
    let target: Enemy | null = null;
    let bestProg = -1;
    for (const e of w.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.x - px, e.y - py);
      if (d <= st.range && e.prog > bestProg) {
        bestProg = e.prog;
        target = e;
      }
    }
    if (!target) continue;

    tw.cool = st.rate;
    tw.aim = Math.atan2(target.y - py, target.x - px);

    if (tw.kind === 0) {
      // Homing arcane bolt
      const a = tw.aim;
      w.projs.push({
        kind: 0,
        x: px + Math.cos(a) * 18,
        y: py + Math.sin(a) * 18,
        vx: Math.cos(a) * 300,
        vy: Math.sin(a) * 300,
        speed: 300,
        dmg: st.dmg,
        target,
        tx: target.x,
        ty: target.y,
        dead: false,
      });
      sfx.mage();
    } else if (tw.kind === 1) {
      // Fast arrow
      const a = tw.aim;
      w.projs.push({
        kind: 1,
        x: px + Math.cos(a) * 16,
        y: py + Math.sin(a) * 16,
        vx: Math.cos(a) * 520,
        vy: Math.sin(a) * 520,
        speed: 520,
        dmg: st.dmg,
        target,
        tx: target.x,
        ty: target.y,
        dead: false,
      });
      sfx.arrow();
    } else {
      // Frost shard — lobbed at the target's current position, AoE on arrival
      const a = Math.atan2(target.y - py, target.x - px);
      w.projs.push({
        kind: 2,
        x: px + Math.cos(a) * 18,
        y: py + Math.sin(a) * 18,
        vx: Math.cos(a) * 300,
        vy: Math.sin(a) * 300,
        speed: 300,
        dmg: st.dmg,
        target: null,
        tx: target.x,
        ty: target.y,
        dead: false,
      });
      sfx.frost();
    }
  }

  // ----- projectiles -----
  for (const pr of w.projs) {
    if (pr.kind === 0 && pr.target && pr.target.hp > 0) {
      // Home in on the target
      const dx = pr.target.x - pr.x;
      const dy = pr.target.y - pr.y;
      const d = Math.hypot(dx, dy) || 1;
      pr.vx = (dx / d) * pr.speed;
      pr.vy = (dy / d) * pr.speed;
    }
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;

    if (pr.kind === 2) {
      // Frost shard detonates at its landing point
      if (Math.hypot(pr.x - pr.tx, pr.y - pr.ty) < 14) {
        w.blasts.push({
          x: pr.tx,
          y: pr.ty,
          r: 0,
          maxR: 58,
          life: 0.32,
          maxLife: 0.32,
          color: '#8FD8FF',
          dmg: pr.dmg,
          slow: true,
          hitDone: false,
        });
        pr.dead = true;
        sfx.shatter();
      }
      continue;
    }

    // Direct-impact projectiles: check the intended target first, then anyone
    let hitE: Enemy | null = null;
    if (pr.target && pr.target.hp > 0 && Math.hypot(pr.target.x - pr.x, pr.target.y - pr.y) < 20) {
      hitE = pr.target;
    } else {
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - pr.x, e.y - pr.y) < 16) {
          hitE = e;
          break;
        }
      }
    }
    if (hitE) {
      damageEnemy(w, hitE, pr.dmg, opts, sfx);
      sparks(w, pr.x, pr.y, pr.kind === 0 ? '#C09AFF' : '#FFE08A', pr.kind === 0 ? 5 : 3, opts);
      pr.dead = true;
    } else if (pr.x < -20 || pr.x > W + 20 || pr.y < -20 || pr.y > H + 20) {
      pr.dead = true;
    }
  }

  // ----- blasts (frost AoE) -----
  for (const b of w.blasts) {
    b.life -= dt;
    b.r = (1 - b.life / b.maxLife) * b.maxR;
    if (!b.hitDone && b.life < b.maxLife * 0.6) {
      b.hitDone = true;
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < b.maxR) {
          damageEnemy(w, e, b.dmg, opts, sfx);
          e.slowT = 2;
        }
      }
    }
  }

  // ----- particles / pops -----
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
    s.y -= 30 * dt;
  }
  compact(w.pops, (s) => s.life > 0);
  w.shake *= Math.exp(-6 * dt);
  if (w.shake < 0.2) w.shake = 0;

  // ----- cull -----
  compact(w.enemies, (e) => e.hp > 0 && e.wp < PATH.length);
  compact(w.projs, (p) => !p.dead);
  compact(w.blasts, (b) => b.life > 0);
}

/* ------------------------------------------------------------------ */
/* Pre-rendered map                                                    */
/* ------------------------------------------------------------------ */

function buildMap(): HTMLCanvasElement | null {
  try {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    if (!x) return null;

    // Dungeon floor
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#141726');
    g.addColorStop(0.6, '#1a1d30');
    g.addColorStop(1, '#12141f');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);

    // Stone speckle
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 420; i++) {
      const sx = rnd() * W;
      const sy = rnd() * H;
      const sw = 4 + rnd() * 26;
      x.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.16)';
      x.fillRect(sx, sy, sw, 3 + rnd() * 5);
    }

    // Faint rune circles (decorative)
    x.strokeStyle = 'rgba(140,110,255,0.07)';
    for (const [rx, ry, rr] of [[150, 460, 60], [740, 300, 80], [420, 100, 55]] as const) {
      x.lineWidth = 10;
      x.beginPath();
      x.arc(rx, ry, rr, 0, Math.PI * 2);
      x.stroke();
      x.lineWidth = 3;
      x.beginPath();
      x.arc(rx, ry, rr - 16, 0, Math.PI * 2);
      x.stroke();
    }

    // Path — wide stone causeway
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.strokeStyle = '#3a3350';
    x.lineWidth = PATH_HALF * 2 + 8;
    x.beginPath();
    x.moveTo(PATH[0][0], PATH[0][1]);
    for (const [px, py] of PATH.slice(1)) x.lineTo(px, py);
    x.stroke();
    x.strokeStyle = '#4a4162';
    x.lineWidth = PATH_HALF * 2;
    x.beginPath();
    x.moveTo(PATH[0][0], PATH[0][1]);
    for (const [px, py] of PATH.slice(1)) x.lineTo(px, py);
    x.stroke();

    // Path edge glow
    x.strokeStyle = 'rgba(160,130,255,0.16)';
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(PATH[0][0], PATH[0][1]);
    for (const [px, py] of PATH.slice(1)) x.lineTo(px, py);
    x.stroke();

    // Path flagstones
    for (let i = 0; i < PATH.length - 1; i++) {
      const [x1, y1] = PATH[i];
      const [x2, y2] = PATH[i + 1];
      const len = SEG_LEN[i];
      const n = Math.floor(len / 34);
      for (let j = 0; j <= n; j++) {
        const t = j / n;
        const fx = x1 + (x2 - x1) * t + (rnd() - 0.5) * 6;
        const fy = y1 + (y2 - y1) * t + (rnd() - 0.5) * 6;
        x.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.13)';
        x.fillRect(fx - 12, fy - 5, 24, 9);
      }
    }

    // Build pads — rune circles
    for (const [px, py] of PADS) {
      x.fillStyle = 'rgba(20,18,34,0.9)';
      x.beginPath();
      x.arc(px, py, 24, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = 'rgba(190,160,255,0.4)';
      x.lineWidth = 2;
      x.beginPath();
      x.arc(px, py, 22, 0, Math.PI * 2);
      x.stroke();
      x.strokeStyle = 'rgba(190,160,255,0.22)';
      x.lineWidth = 1.5;
      x.beginPath();
      x.arc(px, py, 15, 0, Math.PI * 2);
      x.stroke();
      // little rune ticks
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.3;
        x.beginPath();
        x.moveTo(px + Math.cos(a) * 17, py + Math.sin(a) * 17);
        x.lineTo(px + Math.cos(a) * 21, py + Math.sin(a) * 21);
        x.stroke();
      }
    }

    // Torch braziers at path bends
    for (const [bx, by] of PATH.slice(1, -1)) {
      const ox = bx > 450 ? 52 : -52;
      x.fillStyle = '#2a2438';
      x.beginPath();
      x.arc(bx + ox, by, 9, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = '#584970';
      x.lineWidth = 2;
      x.stroke();
    }

    return c;
  } catch {
    return null;
  }
}

const TORCHES = PATH.slice(1, -1).map(([bx, by]) => ({ x: bx > 450 ? bx + 52 : bx - 52, y: by }));

function buildFlash(img: HTMLImageElement): HTMLCanvasElement | null {
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const cx = c.getContext('2d');
    if (!cx) return null;
    cx.drawImage(img, 0, 0);
    cx.globalCompositeOperation = 'source-atop';
    cx.fillStyle = 'rgba(255,235,210,0.9)';
    cx.fillRect(0, 0, c.width, c.height);
    return c;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, assets: GameAssets, flash: RenderCache['flash'], time: number) {
  const key = e.kind === 0 ? 'goblin' : e.kind === 1 ? 'brute' : 'dragon';
  const img = assets[key];
  const size = e.kind === 2 ? 62 : e.kind === 1 ? 52 : 34;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(Math.sin(e.t * 2.4) * 0.08);
  const chilled = e.slowT > 0;
  if (e.hit > 0 && flash[key]) {
    const f = flash[key]!;
    ctx.drawImage(f, -size / 2, -size / 2, size, size);
  } else if (img) {
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
  } else {
    ctx.fillStyle = e.kind === 2 ? '#7C4DFF' : e.kind === 1 ? '#8a7a6a' : '#5a8a3a';
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (chilled) {
    ctx.strokeStyle = 'rgba(140,215,255,0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(e.x, e.y, size / 2 + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // HP bar when damaged
  if (e.hp < e.maxHp) {
    const bw = e.kind === 2 ? 52 : 34;
    const frac = clamp(e.hp / e.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - bw / 2, e.y - size / 2 - 9, bw, 4.5);
    ctx.fillStyle = frac > 0.5 ? '#6EE86E' : frac > 0.25 ? '#FFC23C' : '#FF5A5A';
    ctx.fillRect(e.x - bw / 2, e.y - size / 2 - 9, bw * frac, 4.5);
  }
}

function drawTowerAt(
  ctx: CanvasRenderingContext2D,
  kind: TowerKind,
  level: number,
  px: number,
  py: number,
  aim: number,
  assets: GameAssets,
  flash: RenderCache['flash'],
  hitFlash: boolean,
  hover: boolean,
  selected: boolean,
  opts: Opts,
) {
  const key = kind === 0 ? 'mage' : kind === 1 ? 'ranger' : 'frost';
  const img = assets[key];
  const size = 46;
  ctx.save();
  ctx.translate(px, py);
  if (hover || selected) {
    const st = towerStats(kind, level);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = kind === 0 ? '#7C4DFF' : kind === 1 ? '#7CC94A' : '#5AC8FF';
    ctx.beginPath();
    ctx.arc(0, 0, st.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = kind === 0 ? '#B08AFF' : kind === 1 ? '#A8E06A' : '#8FD8FF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // barrel aims at target
  ctx.save();
  ctx.rotate(aim);
  ctx.fillStyle = kind === 0 ? '#9A6AFF' : kind === 1 ? '#8a6a3a' : '#6AB8E8';
  ctx.fillRect(4, -3.5, 15, 7);
  ctx.restore();

  if (hitFlash && flash[key]) {
    const f = flash[key]!;
    ctx.drawImage(f, -size / 2, -size / 2 - 6, size, size);
  } else if (img) {
    ctx.drawImage(img, -size / 2, -size / 2 - 6, size, size);
  } else {
    ctx.fillStyle = kind === 0 ? '#6a3aa8' : kind === 1 ? '#4a6a3a' : '#3a6a8a';
    ctx.fillRect(-14, -22, 28, 34);
  }
  ctx.restore();

  // Level pips
  for (let i = 0; i < level; i++) {
    ctx.fillStyle = '#FFD23C';
    ctx.beginPath();
    ctx.arc(px - 8 + i * 8, py + 26, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!opts.reducedMotion && kind === 0) {
    // arcane orb idle sparkle
    ctx.globalAlpha = 0.4 + 0.3 * Math.sin(performance.now() / 300 + px);
    ctx.fillStyle = '#C09AFF';
    ctx.beginPath();
    ctx.arc(px, py - 6, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawHud(ctx: CanvasRenderingContext2D, w: World) {
  ctx.font = `bold 17px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFD23C';
  ctx.fillText(`⛁ ${w.gold}`, 16, 28);
  ctx.fillStyle = '#FF6A6A';
  ctx.fillText(`⛨ ${Math.max(0, w.lives)}`, 110, 28);
  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(`WAVE ${Math.max(1, w.wave)} · SCORE ${w.score}`, 16, 48);
  ctx.textAlign = 'right';
  if (w.phase === 'build') {
    ctx.fillStyle = '#8FD8FF';
    ctx.fillText(`next wave in ${Math.ceil(w.buildT)}s`, W - 16, 28);
  } else {
    ctx.fillStyle = '#C09AFF';
    ctx.fillText(`${w.enemies.length} hostiles`, W - 16, 28);
  }
  ctx.font = `11px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(`BEST ${w.best}`, W - 16, 48);
  ctx.textAlign = 'left';
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  w: World,
  assets: GameAssets,
  rc: RenderCache,
  ui: UiState,
  opts: Opts,
  status: Status,
) {
  if (rc.map) {
    ctx.drawImage(rc.map, 0, 0);
  } else {
    ctx.fillStyle = '#141726';
    ctx.fillRect(0, 0, W, H);
  }

  ctx.save();
  if (w.shake > 0 && !opts.reducedMotion) {
    ctx.translate((Math.random() - 0.5) * w.shake, (Math.random() - 0.5) * w.shake);
  }

  // Torch flames (animated)
  if (!opts.reducedMotion) {
    for (const t of TORCHES) {
      const fl = 5 + Math.sin(w.time * 11 + t.x) * 2;
      ctx.fillStyle = 'rgba(255,150,40,0.16)';
      ctx.beginPath();
      ctx.arc(t.x, t.y - 6, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFB03C';
      ctx.beginPath();
      ctx.ellipse(t.x, t.y - 8, 3.2, fl, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFE08A';
      ctx.beginPath();
      ctx.ellipse(t.x, t.y - 7, 1.6, fl * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Towers
  for (let i = 0; i < w.towers.length; i++) {
    const tw = w.towers[i];
    if (!tw) continue;
    const [px, py] = PADS[i];
    drawTowerAt(
      ctx,
      tw.kind,
      tw.level,
      px,
      py,
      tw.aim,
      assets,
      rc.flash,
      false,
      ui.hoverPad === i,
      ui.selPad === i,
      opts,
    );
  }

  // Enemies (sorted so bosses draw on top)
  const sorted = [...w.enemies].sort((a, b) => b.kind - a.kind);
  for (const e of sorted) drawEnemy(ctx, e, assets, rc.flash, w.time);

  // Projectiles
  for (const pr of w.projs) {
    if (pr.kind === 0) {
      ctx.fillStyle = '#C09AFF';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(192,154,255,0.3)';
      ctx.beginPath();
      ctx.arc(pr.x - pr.vx * 0.012, pr.y - pr.vy * 0.012, 2.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (pr.kind === 1) {
      const a = Math.atan2(pr.vy, pr.vx);
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(a);
      ctx.strokeStyle = '#E8D8B0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();
      ctx.fillStyle = '#B0B0C0';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(4, -2.6);
      ctx.lineTo(4, 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(w.time * 9);
      ctx.fillStyle = '#8FD8FF';
      ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.restore();
    }
  }

  // Frost blasts
  for (const b of w.blasts) {
    const a = b.life / b.maxLife;
    ctx.globalAlpha = a * 0.75;
    ctx.strokeStyle = '#8FD8FF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = a * 0.22;
    ctx.fillStyle = '#8FD8FF';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Particles
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

  // Floating pops
  ctx.textAlign = 'center';
  ctx.font = `bold 13px ${MONO}`;
  for (const s of w.pops) {
    ctx.globalAlpha = Math.min(1, s.life / 0.5);
    ctx.fillStyle = s.color;
    ctx.fillText(s.text, s.x, s.y);
  }
  ctx.globalAlpha = 1;

  // Build preview on hovered empty pad
  if (ui.buildChoice !== null && ui.hoverPad !== null && w.towers[ui.hoverPad] === null) {
    const [px, py] = PADS[ui.hoverPad];
    ctx.globalAlpha = 0.5;
    const ok = w.gold >= TOWERS[ui.buildChoice].cost;
    ctx.fillStyle = ok ? '#6EE86E' : '#FF5A5A';
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, w);
  ctx.restore();

  // Death vignette
  if (w.over || status === 'gameover') {
    ctx.fillStyle = 'rgba(40,0,0,0.25)';
    ctx.fillRect(0, 0, W, H);
  }
}

interface UiState {
  hoverPad: number | null;
  selPad: number | null;
  buildChoice: TowerKind | null;
}

type Status = 'loading' | 'menu' | 'playing' | 'paused' | 'gameover';

interface HudMirror {
  gold: number;
  lives: number;
  wave: number;
  phase: 'build' | 'combat';
  buildT: number;
  score: number;
  enemies: number;
}

/* ------------------------------------------------------------------ */
/* React component                                                     */
/* ------------------------------------------------------------------ */

export function RuneBastionGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World | null>(null);
  const assetsRef = useRef<GameAssets>({});
  const rcRef = useRef<RenderCache>({ map: null, flash: {} });
  const statusRef = useRef<Status>('loading');
  const sfxRef = useRef<Sfx | null>(null);
  const optsRef = useRef<Opts>({ reducedMotion: false, lowPerf: false });
  const speedRef = useRef(1);
  const uiRef = useRef<UiState>({ hoverPad: null, selPad: null, buildChoice: null });
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const [status, setStatus] = useState<Status>('loading');
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState<HudMirror>({ gold: START_GOLD, lives: START_LIVES, wave: 1, phase: 'build', buildT: BUILD_TIME, score: 0, enemies: 0 });
  const [speed, setSpeed] = useState(1);
  const [choice, setChoice] = useState<TowerKind | null>(null);
  const [selPad, setSelPad] = useState<number | null>(null);
  const [best, setBest] = useState(0);
  const [finalStats, setFinalStats] = useState({ score: 0, wave: 1 });
  const [newBest, setNewBest] = useState(false);

  const applyStatus = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const startGame = useCallback(() => {
    sfxRef.current?.ensure();
    worldRef.current = createWorld();
    uiRef.current = { hoverPad: null, selPad: null, buildChoice: null };
    setChoice(null);
    setSelPad(null);
    setFinalStats({ score: 0, wave: 1 });
    setNewBest(false);
    applyStatus('playing');
  }, [applyStatus]);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') applyStatus('paused');
    else if (statusRef.current === 'paused') applyStatus('playing');
  }, [applyStatus]);

  const togglePauseRef = useRef(togglePause);
  togglePauseRef.current = togglePause;

  const gameOverRef = useRef<() => void>(() => undefined);
  gameOverRef.current = () => {
    const w = worldRef.current;
    if (!w) return;
    setFinalStats({ score: w.score, wave: Math.max(1, w.wave) });
    const isBest = w.score > w.best;
    setNewBest(isBest);
    setBest(Math.max(w.best, w.score));
    if (isBest) {
      try {
        localStorage.setItem(BEST_KEY, String(w.score));
      } catch {
        /* ignore */
      }
    }
    applyStatus('gameover');
  };

  const toggleMute = () => {
    setMuted((m) => {
      const nm = !m;
      if (sfxRef.current) sfxRef.current.muted = nm;
      try {
        localStorage.setItem(MUTE_KEY, nm ? '1' : '0');
      } catch {
        /* ignore */
      }
      return nm;
    });
  };

  const toggleSpeed = () => {
    setSpeed((s) => {
      const ns = s === 1 ? SPEED_MULT : 1;
      speedRef.current = ns;
      return ns;
    });
  };

  const pickTower = useCallback((k: TowerKind) => {
    sfxRef.current?.ensure();
    uiRef.current.buildChoice = k;
    uiRef.current.selPad = null;
    setChoice(k);
    setSelPad(null);
  }, []);

  const cancelPick = useCallback(() => {
    uiRef.current.buildChoice = null;
    uiRef.current.selPad = null;
    setChoice(null);
    setSelPad(null);
  }, []);

  const upgradeSelected = useCallback(() => {
    const w = worldRef.current;
    const i = uiRef.current.selPad;
    const sfx = sfxRef.current;
    if (!w || i === null || !sfx) return;
    const tw = w.towers[i];
    if (!tw || tw.level >= 3) return;
    const cost = Math.round(TOWERS[tw.kind].cost * 0.8 * tw.level);
    if (w.gold < cost) {
      sfx.deny();
      return;
    }
    w.gold -= cost;
    tw.level += 1;
    tw.invested += cost;
    sfx.upgrade();
  }, []);

  const sellSelected = useCallback(() => {
    const w = worldRef.current;
    const i = uiRef.current.selPad;
    const sfx = sfxRef.current;
    if (!w || i === null || !sfx) return;
    const tw = w.towers[i];
    if (!tw) return;
    const refund = Math.round(tw.invested * 0.7);
    w.gold += refund;
    w.towers[i] = null;
    const [px, py] = PADS[i];
    w.pops.push({ x: px, y: py - 20, text: `+${refund}`, life: 0.9, color: '#FFD23C' });
    sfx.sell();
    uiRef.current.selPad = null;
    setSelPad(null);
  }, []);

  const callNextWave = useCallback(() => {
    const w = worldRef.current;
    const sfx = sfxRef.current;
    if (!w || !sfx) return;
    if (w.phase === 'build') {
      const bonus = Math.max(0, Math.floor(w.buildT * 2));
      if (bonus > 0) {
        w.gold += bonus;
        w.pops.push({ x: W / 2, y: 84, text: `+${bonus} early bonus`, life: 1.4, color: '#FFD23C' });
      }
      callWave(w, sfx);
    }
  }, []);

  // Engine
  useEffect(() => {
    let storedMute = false;
    try {
      storedMute = localStorage.getItem(MUTE_KEY) === '1';
      setMuted(storedMute);
      setBest(parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0);
      const s = getStoredSettings();
      optsRef.current = { reducedMotion: s.reducedMotion, lowPerf: s.lowPerformance };
    } catch {
      /* ignore */
    }
    if (!sfxRef.current) sfxRef.current = new Sfx();
    sfxRef.current.muted = storedMute;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(optsRef.current.lowPerf ? 1 : 1.75, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    rcRef.current.map = buildMap();

    let cancelled = false;
    Promise.all(
      (Object.entries(ASSET_SRC) as [AssetKey, string][]).map(
        ([k, src]) =>
          new Promise<[AssetKey, HTMLImageElement | null]>((res) => {
            const im = new Image();
            im.onload = () => res([k, im]);
            im.onerror = () => res([k, null]);
            im.src = src;
          }),
      ),
    ).then((entries) => {
      if (cancelled) return;
      for (const [k, im] of entries) {
        if (im) {
          assetsRef.current[k] = im;
          rcRef.current.flash[k] = buildFlash(im);
        }
      }
      worldRef.current = createWorld();
      applyStatus('menu');
    });

    let lastHud = 0;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const rawDt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const w = worldRef.current;
      if (!w) return;
      if (statusRef.current === 'playing') {
        const dt = rawDt * speedRef.current;
        updateWorld(w, dt, sfxRef.current!, optsRef.current);
        if (w.over && statusRef.current === 'playing') gameOverRef.current();
      }
      drawWorld(ctx, w, assetsRef.current, rcRef.current, uiRef.current, optsRef.current, statusRef.current);
      if (now - lastHud > 250) {
        lastHud = now;
        setHud({
          gold: w.gold,
          lives: w.lives,
          wave: Math.max(1, w.wave),
          phase: w.phase,
          buildT: w.buildT,
          score: w.score,
          enemies: w.enemies.length,
        });
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      sfxRef.current?.close();
      sfxRef.current = null;
    };
  }, [applyStatus]);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const st = statusRef.current;
      if (st === 'playing' || st === 'paused') {
        if (e.code === 'KeyP' || e.code === 'Escape') {
          e.preventDefault();
          if (e.code === 'Escape' && (uiRef.current.buildChoice !== null || uiRef.current.selPad !== null)) {
            cancelPick();
          } else {
            togglePauseRef.current();
          }
        }
        if (e.code === 'Digit1') pickTower(0);
        if (e.code === 'Digit2') pickTower(1);
        if (e.code === 'Digit3') pickTower(2);
        if (e.code === 'KeyU') upgradeSelected();
        if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) sellSelected();
        if (e.code === 'Space' || e.code === 'KeyN') {
          e.preventDefault();
          callNextWave();
        }
      } else if (st === 'gameover' && e.code === 'Escape') {
        onBackRef.current();
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [cancelPick, pickTower, upgradeSelected, sellSelected, callNextWave]);

  // Pointer → pad hover / click
  const padAt = (lx: number, ly: number): number | null => {
    for (let i = 0; i < PADS.length; i++) {
      const [px, py] = PADS[i];
      if (Math.hypot(lx - px, ly - py) < 27) return i;
    }
    return null;
  };

  const toLogical = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left) * (W / rect.width), y: (clientY - rect.top) * (H / rect.height) };
  };

  const handleMove = (e: React.PointerEvent) => {
    if (statusRef.current !== 'playing') return;
    const pt = toLogical(e.clientX, e.clientY);
    if (!pt) return;
    uiRef.current.hoverPad = padAt(pt.x, pt.y);
  };

  const handleClick = (e: React.PointerEvent) => {
    if (statusRef.current !== 'playing') return;
    const w = worldRef.current;
    if (!w) return;
    const pt = toLogical(e.clientX, e.clientY);
    if (!pt) return;
    const pad = padAt(pt.x, pt.y);
    if (pad === null) {
      cancelPick();
      return;
    }
    const existing = w.towers[pad];
    if (existing) {
      uiRef.current.buildChoice = null;
      setChoice(null);
      uiRef.current.selPad = pad;
      setSelPad(pad);
      return;
    }
    const choiceKind = uiRef.current.buildChoice;
    if (choiceKind === null) {
      sfxRef.current?.deny();
      return;
    }
    const cost = TOWERS[choiceKind].cost;
    if (w.gold < cost) {
      sfxRef.current?.deny();
      w.pops.push({ x: PADS[pad][0], y: PADS[pad][1] - 26, text: 'need gold', life: 0.9, color: '#FF5A5A' });
      return;
    }
    w.gold -= cost;
    w.towers[pad] = { kind: choiceKind, pad, level: 1, cool: 0.25, invested: cost, aim: -Math.PI / 2 };
    sfxRef.current?.build();
    sparks(w, PADS[pad][0], PADS[pad][1], '#C09AFF', 8, optsRef.current);
    // Keep the choice selected so players can drop several towers quickly
  };

  const playing = status === 'playing';
  const selTower = selPad !== null ? worldRef.current?.towers[selPad] ?? null : null;
  const upgradeCost = selTower && selTower.level < 3 ? Math.round(TOWERS[selTower.kind].cost * 0.8 * selTower.level) : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-2 sm:p-6 font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Rune Bastion game"
    >
      <div className="w-full max-w-5xl flex flex-col gap-3">
        {/* Top bar */}
        <div className="flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2 text-neutral-200 font-bold tracking-wide">
            <Shield className="w-4 h-4 text-[color:var(--accent)]" />
            RUNE BASTION
          </div>
          <div className="flex items-center gap-2">
            {best > 0 && (
              <span className="hidden sm:inline px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-300">
                Best {best}
              </span>
            )}
            <button
              onClick={toggleSpeed}
              className="px-2.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg transition-colors cursor-pointer font-bold"
              aria-label="Toggle game speed"
            >
              {speed}×
            </button>
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
          className="relative w-full rounded-xl border-2 border-neutral-700 overflow-hidden bg-black shadow-[0_0_70px_rgba(124,77,255,0.12)]"
          onPointerMove={handleMove}
          onPointerDown={handleClick}
          style={{ touchAction: 'none' }}
        >
          <canvas ref={canvasRef} className="block w-full h-auto select-none" aria-label="Rune Bastion playfield" />

          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#050508]">
              <span className="font-mono text-xs text-neutral-400 animate-pulse">RAISING THE BASTION…</span>
            </div>
          )}

          {status === 'menu' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-[2px] px-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/games/rune-bastion/tower-mage.png" alt="" draggable={false} className="w-14 animate-pulse" />
              <h2 className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-neutral-50">
                RUNE <span className="text-[#C09AFF]">BASTION</span>
              </h2>
              <p className="font-mono text-xs text-neutral-300 max-w-md leading-relaxed">
                Goblins march. Golems smash. Dragons burn.
                <br />
                Raise mage, ranger and frost towers — nothing gets past the runes.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 font-mono text-[11px] text-neutral-400">
                <span className="px-2 py-1 bg-neutral-900/80 border border-neutral-700 rounded">1 / 2 / 3 — pick tower</span>
                <span className="px-2 py-1 bg-neutral-900/80 border border-neutral-700 rounded">CLICK PAD — build</span>
                <span className="px-2 py-1 bg-neutral-900/80 border border-neutral-700 rounded">SPACE — call wave</span>
              </div>
              {best > 0 && (
                <span className="font-mono text-xs text-[#FFD23C]">Best score: {best}</span>
              )}
              <button
                onClick={startGame}
                className="mt-1 px-8 py-3 bg-[var(--accent)] hover:bg-lime-300 text-black font-mono font-bold text-sm rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.25)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
              >
                ▶ DEFEND THE BASTION
              </button>
            </div>
          )}

          {status === 'paused' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-[2px] text-center">
              <h2 className="font-mono text-3xl font-black tracking-widest text-neutral-100">PAUSED</h2>
              <button
                onClick={togglePause}
                className="px-6 py-2.5 bg-[var(--accent)] hover:bg-lime-300 text-black font-mono font-bold text-sm rounded-lg border-2 border-black transition-colors cursor-pointer"
              >
                ▶ Resume
              </button>
            </div>
          )}

          {status === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 backdrop-blur-[2px] text-center px-6">
              <h2 className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-rose-400">THE BASTION HAS FALLEN</h2>
              {newBest && (
                <span className="font-mono text-xs font-bold text-[#FFD23C] animate-pulse tracking-widest">★ NEW BEST SCORE ★</span>
              )}
              <div className="font-mono text-5xl sm:text-6xl font-black text-neutral-50 my-1">{finalStats.score}</div>
              <div className="font-mono text-xs text-neutral-400">
                survived {finalStats.wave} wave{finalStats.wave === 1 ? '' : 's'} · best {Math.max(best, finalStats.score)}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 bg-[var(--accent)] hover:bg-lime-300 text-black font-mono font-bold text-sm rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(255,255,255,0.25)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
                >
                  ⟳ Rebuild & retry
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

        {/* Build / command bar */}
        <div className="flex flex-wrap items-stretch justify-center gap-2 font-mono text-xs">
          {([0, 1, 2] as TowerKind[]).map((k) => {
            const t = TOWERS[k];
            const selected = choice === k;
            const img = k === 0 ? '/games/rune-bastion/tower-mage.png' : k === 1 ? '/games/rune-bastion/tower-ranger.png' : '/games/rune-bastion/tower-frost.png';
            return (
              <button
                key={k}
                onClick={() => pickTower(k)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-2 transition-colors cursor-pointer text-left ${
                  selected ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]' : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
                } ${hud.gold < t.cost ? 'opacity-55' : ''}`}
                title={`${t.name} — ${t.blurb}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="w-7 h-7 object-contain" draggable={false} />
                <span>
                  <span className="block text-neutral-100 font-bold leading-tight">{t.name}</span>
                  <span className="block text-[#FFD23C] leading-tight">⛁ {t.cost} · {t.blurb}</span>
                </span>
              </button>
            );
          })}

          {selTower && (
            <>
              <button
                onClick={upgradeSelected}
                disabled={selTower.level >= 3 || upgradeCost === null || hud.gold < upgradeCost}
                className="px-3 py-1.5 rounded-lg border-2 border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-bold"
              >
                {selTower.level >= 3 ? 'MAX LEVEL' : `⬆ Upgrade · ⛁ ${upgradeCost}`}
              </button>
              <button
                onClick={sellSelected}
                className="px-3 py-1.5 rounded-lg border-2 border-rose-500/60 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer font-bold"
              >
                ⛁ Sell {Math.round(selTower.invested * 0.7)}
              </button>
            </>
          )}

          <button
            onClick={callNextWave}
            disabled={hud.phase !== 'build' || !playing}
            className="px-4 py-1.5 rounded-lg border-2 border-[var(--accent)] bg-[var(--accent)] text-black font-bold hover:bg-lime-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {hud.phase === 'build' ? `▶ Call wave ${hud.wave + 1} (+${Math.max(0, Math.floor(hud.buildT * 2))})` : `Wave ${hud.wave} · ${hud.enemies} left`}
          </button>
        </div>

        <p className="text-[10px] font-mono text-neutral-500 text-center">
          Pick a tower (1/2/3) → click a rune pad to build · click a tower to upgrade/sell (U/S) · Space calls the next wave early for bonus gold · P pause
        </p>
      </div>
    </div>
  );
}

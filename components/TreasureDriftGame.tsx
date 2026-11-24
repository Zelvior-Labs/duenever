'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { treasureReward, voyageMissions, type VoyageClaims } from '@/lib/arcade-features';
import { attractTreasure } from '@/lib/arcade-upgrades';
import { SoundButton, useGameSound } from './GameSound';

type Item = { id: number; kind: 'rock' | 'coin' | 'magnet' | 'chest'; x: number; y: number };
type Mode = 'menu' | 'playing' | 'paused' | 'over';
type Sea = { x: number; target: number; items: Item[]; score: number; lives: number; time: number; spawn: number; coins: number; inv: number; magnet: number; totalCoins: number; chests: number; missions: VoyageClaims; id: number };
const initial = (): Sea => ({ x: 50, target: 50, items: [], score: 0, lives: 3, time: 0, spawn: 0.4, coins: 0, inv: 0, magnet: 0, totalCoins: 0, chests: 0, missions: { coins:false, chests:false, survival:false }, id: 0 });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const BEST = 'duenever_treasure_drift_best';

export function TreasureDriftGame({ onBack }: { onBack: () => void }) {
  const { muted, toggle: toggleSound, play, stop, reducedMotion } = useGameSound();
  const [mode, setMode] = useState<Mode>('menu');
  const [frame, setFrame] = useState<Sea>(initial);
  const [best, setBest] = useState(0);
  const world = useRef<Sea>(initial());
  const modeRef = useRef<Mode>('menu');
  const keys = useRef(new Set<string>());
  const field = useRef<HTMLDivElement>(null);
  const changeMode = useCallback((v: Mode) => { modeRef.current = v; setMode(v); }, []);
  const start = useCallback(() => { play('start'); world.current = initial(); setFrame({ ...world.current }); keys.current.clear(); changeMode('playing'); }, [changeMode, play]);
  const toggle = useCallback(() => { if (modeRef.current === 'playing') { stop(); changeMode('paused'); } else if (modeRef.current === 'paused') changeMode('playing'); }, [changeMode, stop]);

  useEffect(() => { try { setBest(Number(localStorage.getItem(BEST)) || 0); } catch {} }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) { e.preventDefault(); keys.current.add(e.code); }
      if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) { e.preventDefault(); toggle(); }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const pauseOnBlur = () => { if (modeRef.current === 'playing') { keys.current.clear(); stop(); changeMode('paused'); } };
    const visibility = () => { if (document.hidden) pauseOnBlur(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', pauseOnBlur); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', pauseOnBlur); document.removeEventListener('visibilitychange', visibility); };
  }, [changeMode, stop, toggle]);

  useEffect(() => {
    let id = 0, previous = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - (previous || now)) / 1000, 0.05); previous = now;
      if (modeRef.current === 'playing') {
        const w = world.current; w.time += dt; w.magnet = Math.max(0, w.magnet - dt); w.inv = Math.max(0, w.inv - dt);
        const dir = Number(keys.current.has('ArrowRight') || keys.current.has('KeyD')) - Number(keys.current.has('ArrowLeft') || keys.current.has('KeyA'));
        if (dir) w.target = clamp(w.target + dir * 64 * dt, 7, 93);
        w.x += (w.target - w.x) * (1 - Math.exp(-12 * dt));
        w.spawn -= dt;
        if (w.spawn <= 0) {
          const x = 10 + Math.random() * 80;
          const roll = Math.random();
          w.items.push({ id: ++w.id, kind: roll < 0.06 ? 'chest' : roll < 0.14 ? 'magnet' : roll < 0.54 ? 'coin' : 'rock', x, y: -12 });
          w.spawn = Math.max(0.48, 0.95 - w.time / 170);
        }
        const speed = Math.min(45, 22 + w.time * 0.16);
        for (const item of w.items) {
          item.y += speed * dt;
          if (item.kind === 'coin' && item.y > 40) item.x = attractTreasure(item.x, w.x, dt, w.magnet > 0);
          if (Math.abs(item.x - w.x) < (item.kind === 'rock' ? 7 : 6) && Math.abs(item.y - 80) < 7) {
            item.y = 120;
            if (item.kind === 'coin' || item.kind === 'chest') {
              play('collect'); if (item.kind === 'coin') w.totalCoins++; else w.chests++; const reward = treasureReward(item.kind, w.coins, w.lives);
              w.coins = reward.streak; w.score += reward.score; w.lives = reward.lives;
            }
            else if (item.kind === 'magnet') { play('collect'); w.magnet = 8; }
            else if (!w.inv) { play('hit'); w.lives--; w.coins = 0; w.inv = 2; }
          }
        }
        w.items = w.items.filter((item) => item.y < 110);
        const mission = voyageMissions(w.missions, w.totalCoins, w.chests, w.time);
        if (mission.reward) { w.score += mission.reward; w.missions = mission.claims; play('win'); }
        if (w.lives <= 0) {
          changeMode('over');
          setBest((old) => { const next = Math.max(old, w.score); try { localStorage.setItem(BEST, String(next)); } catch {} return next; });
        }
        setFrame({ ...w, items: [...w.items] });
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop); return () => cancelAnimationFrame(id);
  }, [changeMode, play]);

  const steer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (modeRef.current !== 'playing' || !field.current) return;
    const rect = field.current.getBoundingClientRect();
    world.current.target = clamp((event.clientX - rect.left) / rect.width * 100, 7, 93);
  };

  return (
    <div ref={field} role="dialog" aria-modal="true" aria-label="Treasure Drift game" className="fixed inset-0 z-[70] h-[100dvh] overflow-hidden bg-[#087b8c] text-white select-none" style={{ touchAction: 'none' }} onPointerDown={(e) => { if (e.target === e.currentTarget) { e.currentTarget.setPointerCapture(e.pointerId); steer(e); } }} onPointerMove={(e) => { if (e.buttons && e.currentTarget.hasPointerCapture(e.pointerId)) steer(e); }}>
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(170deg, transparent 0 55px, rgba(150,255,240,.2) 57px 60px, transparent 63px 100px)', transform: `translateY(${(frame.time * 35) % 100}px)` }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#003e5e]/60 via-transparent to-[#00364b]/40" />
      {frame.items.map(item => <img key={item.id} alt="" draggable={false} src={`/games/treasure-drift/${item.kind}.png`} className={`pointer-events-none absolute object-contain ${item.kind==='coin' && mode==='playing' && !reducedMotion?'game-coin-glint':''}`} style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)', width: item.kind === 'rock' ? 'clamp(40px, 9vw, 90px)' : 'clamp(28px, 6vw, 58px)', height: item.kind === 'rock' ? 'clamp(40px, 9vw, 90px)' : 'clamp(28px, 6vw, 58px)' }} />)}
      <img alt="" draggable={false} src="/games/treasure-drift/ship.png" className="pointer-events-none absolute object-contain drop-shadow-xl" style={{ left: `${frame.x}%`, top: '80%', transform: `translate(-50%, -50%) rotate(${reducedMotion ? 0 : clamp((frame.target-frame.x)*.5,-12,12)}deg)`, width: 'clamp(44px, 8vw, 80px)', height: 'clamp(70px, 15vh, 120px)', opacity: frame.inv > 0 && Math.floor(frame.inv * 8) % 2 ? 0.45 : 1 }} />
      <div className="absolute z-10 inset-x-0 top-0 flex items-center justify-between gap-2 bg-[#002b3c]/85 p-3 font-mono text-xs sm:text-sm">
        <div><strong className="text-amber-300">TREASURE DRIFT</strong><span className="ml-3">{frame.score} pts</span><span className="ml-3 text-red-200">Lives {frame.lives}</span><span className="hidden sm:inline ml-3">Streak {frame.coins}</span>{frame.magnet > 0 && <span className="ml-3 text-cyan-200">Magnet {Math.ceil(frame.magnet)}s</span>}</div>
        <div className="flex gap-2"><SoundButton muted={muted} toggle={toggleSound}/><button onClick={toggle} aria-label={mode === 'paused' ? 'Resume' : 'Pause'} disabled={mode !== 'playing' && mode !== 'paused'} className="rounded bg-white/10 p-2 disabled:opacity-40">{mode === 'paused' ? <Play size={18} /> : <Pause size={18} />}</button><button onClick={onBack} aria-label="Quit game" className="rounded bg-white/10 p-2"><X size={18} /></button></div>
      </div>
      {mode === 'playing' && <div className="pointer-events-none absolute bottom-4 left-3 rounded-lg border border-cyan-200/20 bg-[#002b3c]/85 p-2 font-mono text-[10px] text-cyan-100 sm:text-xs"><strong>VOYAGE GOALS</strong><p>Coins {Math.min(frame.totalCoins,12)}/12 {frame.missions.coins ? '✓' : '· +150'}</p><p>Chests {Math.min(frame.chests,2)}/2 {frame.missions.chests ? '✓' : '· +200'}</p><p>Survive {Math.min(Math.floor(frame.time),45)}/45s {frame.missions.survival ? '✓' : '· +150'}</p></div>}
      {mode !== 'playing' && <div className="absolute inset-0 top-14 flex items-center justify-center bg-[#001c2b]/85 p-5 text-center">
        <div className="max-w-lg space-y-4"><h2 className="font-mono text-3xl font-black text-amber-300 sm:text-5xl">{mode === 'over' ? 'VOYAGE OVER' : mode === 'paused' ? 'PAUSED' : 'TREASURE DRIFT'}</h2>
          <p className="text-sm text-cyan-50">{mode === 'over' ? `You collected ${frame.score} points. Best: ${Math.max(best, frame.score)}.` : mode === 'paused' ? 'Take a breather, captain.' : 'Steer through the reef, collect coins, and build a treasure streak. Find treasure chests for 100 points and compass magnets to pull in coins. Every 10 coins in a streak restores a life. Complete voyage goals for bonus points. Avoid rocks!'}</p>
          <p className="text-xs text-cyan-200">Drag or tap to steer · Arrow keys / A D · P to pause</p>
          <button className="rounded-lg bg-amber-300 px-8 py-3 font-mono font-bold text-[#003444] hover:bg-amber-200" onClick={mode === 'paused' ? toggle : start}>{mode === 'paused' ? 'RESUME' : mode === 'over' ? 'SAIL AGAIN' : 'SET SAIL'}</button>
        </div></div>}
    </div>
  );
}

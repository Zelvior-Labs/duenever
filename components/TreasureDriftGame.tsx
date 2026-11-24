'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { newSea, stepSea, seaTarget, clamp, type Sea } from '@/lib/treasure-drift';
import { SoundButton, useGameSound } from './GameSound';
import { StoryNotes } from './StoryNotes';

type Mode = 'menu' | 'playing' | 'paused' | 'over';
const BEST = 'duenever_treasure_drift_best';

export function TreasureDriftGame({ onBack }: { onBack: () => void }) {
  const { muted, toggle: toggleSound, play, stop, reducedMotion } = useGameSound();
  const [mode, setMode] = useState<Mode>('menu');
  const [frame, setFrame] = useState<Sea>(newSea);
  const [best, setBest] = useState(0);
  const [feedback, setFeedback] = useState('');
  const feedbackUntil = useRef(0);
  const world = useRef<Sea>(newSea());
  const modeRef = useRef<Mode>('menu');
  const keys = useRef(new Set<string>());
  const field = useRef<HTMLDivElement>(null);
  const changeMode = useCallback((v: Mode) => { modeRef.current = v; setMode(v); }, []);
  const start = useCallback(() => { play('start'); world.current = newSea(); setFrame({ ...world.current }); setFeedback(''); feedbackUntil.current = 0; keys.current.clear(); changeMode('playing'); }, [changeMode, play]);
  const toggle = useCallback(() => { if (modeRef.current === 'playing') { keys.current.clear(); stop(); changeMode('paused'); } else if (modeRef.current === 'paused') changeMode('playing'); }, [changeMode, stop]);

  useEffect(() => { try { setBest(Number(localStorage.getItem(BEST)) || 0); } catch {} }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (modeRef.current === 'playing' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(e.code)) { e.preventDefault(); keys.current.add(e.code); }
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
        const width = field.current?.clientWidth || 1, height = field.current?.clientHeight || 1;
        const movement = {
          x: Number(keys.current.has('ArrowRight') || keys.current.has('KeyD')) - Number(keys.current.has('ArrowLeft') || keys.current.has('KeyA')),
          y: Number(keys.current.has('ArrowDown') || keys.current.has('KeyS')) - Number(keys.current.has('ArrowUp') || keys.current.has('KeyW')),
        };
        const worldBeforeMagnet = world.current.magnet;
        const { sea: w, events } = stepSea(world.current, dt, movement, { width, height });
        world.current = w;
        if (events.includes('collect')) play('collect');
        if (events.includes('hit')) play('hit');
        if (events.includes('mission')) play('win');
        if (events.length) {
          setFeedback(events.includes('hit') ? 'Reef hit! Streak lost' : events.includes('mission') ? 'Voyage goal complete!' : w.magnet > worldBeforeMagnet ? 'Magnet active' : 'Treasure collected');
          feedbackUntil.current = w.time + 1.3;
        } else if (feedbackUntil.current && w.time > feedbackUntil.current) { setFeedback(''); feedbackUntil.current = 0; }
        if (w.lives <= 0) {
          keys.current.clear(); changeMode('over');
          setBest((old) => { const next = Math.max(old, w.score); try { localStorage.setItem(BEST, String(next)); } catch {} return next; });
        }
        setFrame(w);
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop); return () => cancelAnimationFrame(id);
  }, [changeMode, play]);

  const steer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (modeRef.current !== 'playing' || !field.current) return;
    const rect = field.current.getBoundingClientRect();
    const target = seaTarget({ width: rect.width, height: rect.height }, (event.clientX - rect.left) / rect.width * 100, (event.clientY - rect.top) / rect.height * 100);
    world.current.targetX = target.x; world.current.targetY = target.y;
  };

  return (
    <div ref={field} role="dialog" aria-modal="true" aria-label="Treasure Drift game" className="fixed inset-0 z-[70] h-[100dvh] overflow-hidden bg-[#087b8c] text-white select-none" style={{ touchAction: 'none' }} onPointerDown={(e) => { if (e.target === e.currentTarget) { e.currentTarget.setPointerCapture(e.pointerId); steer(e); } }} onPointerMove={(e) => { if (e.buttons && e.currentTarget.hasPointerCapture(e.pointerId)) steer(e); }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'linear-gradient(rgba(0,34,55,.25),rgba(0,29,43,.35)), url(/games/treasure-drift/ocean.jpg)' }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(170deg, transparent 0 55px, rgba(150,255,240,.2) 57px 60px, transparent 63px 100px)', transform: `translateY(${reducedMotion ? 0 : (frame.time * 35) % 100}px)` }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#003e5e]/60 via-transparent to-[#00364b]/40" />
      {frame.items.map(item => <img key={item.id} alt="" draggable={false} src={`/games/treasure-drift/${item.kind}.png`} className={`pointer-events-none absolute object-contain ${item.kind==='coin' && mode==='playing' && !reducedMotion?'game-coin-glint':''}`} style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)', width: item.kind === 'rock' ? 'clamp(40px, 9vw, 90px)' : 'clamp(28px, 6vw, 58px)', height: item.kind === 'rock' ? 'clamp(40px, 9vw, 90px)' : 'clamp(28px, 6vw, 58px)' }} />)}
      <div aria-hidden="true" className="pointer-events-none absolute rounded-[50%] border-x-2 border-b-2 border-cyan-100/40 bg-cyan-100/10 blur-[2px]" style={{ left: `${frame.x}%`, top: `${frame.y}%`, width: 'clamp(35px, 7vw, 70px)', height: 'clamp(65px, 14vh, 110px)', transform: 'translate(-50%, -20%)' }} />
      <img alt="" draggable={false} src="/games/treasure-drift/ship.png" className="pointer-events-none absolute object-contain drop-shadow-xl" style={{ left: `${frame.x}%`, top: `${frame.y}%`, transform: `translate(-50%, -50%) rotate(${reducedMotion ? 0 : clamp((frame.targetX-frame.x)*.5,-12,12)}deg)`, width: 'clamp(44px, 8vw, 80px)', height: 'clamp(70px, 15vh, 120px)', opacity: frame.inv > 0 && Math.floor(frame.inv * 8) % 2 ? 0.45 : 1 }} />
      <div className="absolute z-10 inset-x-0 top-0 flex items-center justify-between gap-2 bg-[#002b3c]/85 p-3 font-mono text-xs sm:text-sm">
        <div><strong className="text-amber-300">TREASURE DRIFT</strong><span className="ml-3">{frame.score} pts</span><span className="ml-3 text-red-200">Lives {frame.lives}</span><span className="hidden sm:inline ml-3">Streak {frame.coins}</span>{frame.magnet > 0 && <span className="ml-3 text-cyan-200">Magnet {Math.ceil(frame.magnet)}s</span>}</div>
        <div className="flex gap-2"><SoundButton muted={muted} toggle={toggleSound}/><button onClick={toggle} aria-label={mode === 'paused' ? 'Resume' : 'Pause'} disabled={mode !== 'playing' && mode !== 'paused'} className="rounded bg-white/10 p-2 disabled:opacity-40">{mode === 'paused' ? <Play size={18} /> : <Pause size={18} />}</button><button onClick={onBack} aria-label="Quit game" className="rounded bg-white/10 p-2"><X size={18} /></button></div>
      </div>
      <div role="status" aria-live="polite" className="pointer-events-none absolute left-1/2 top-20 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#002b3c]/85 px-4 py-2 font-mono text-xs font-bold text-amber-200 empty:hidden">{feedback}</div>
      {mode === 'playing' && <div className="pointer-events-none absolute bottom-4 left-3 rounded-lg border border-cyan-200/20 bg-[#002b3c]/85 p-2 font-mono text-[10px] text-cyan-100 sm:text-xs"><strong>VOYAGE GOALS</strong><p>Coins {Math.min(frame.totalCoins,12)}/12 {frame.missions.coins ? '✓' : '· +150'}</p><p>Chests {Math.min(frame.chests,2)}/2 {frame.missions.chests ? '✓' : '· +200'}</p><p>Survive {Math.min(Math.floor(frame.time),45)}/45s {frame.missions.survival ? '✓' : '· +150'}</p></div>}
      {mode !== 'playing' && <div className="absolute inset-0 top-14 flex items-start justify-center overflow-y-auto bg-[#001c2b]/85 p-5 text-center sm:items-center">
        <div className="max-w-lg space-y-4"><h2 className="font-mono text-3xl font-black text-amber-300 sm:text-5xl">{mode === 'over' ? 'VOYAGE OVER' : mode === 'paused' ? 'PAUSED' : 'TREASURE DRIFT'}</h2>
          <p className="text-sm text-cyan-50">{mode === 'over' ? `You collected ${frame.score} points. Best: ${Math.max(best, frame.score)}.` : mode === 'paused' ? 'Take a breather, captain.' : 'Steer freely around the reef, collect coins, and build a treasure streak. Find treasure chests for 100 points and compass magnets to pull in coins. Every 10 coins in a streak restores a life. Complete voyage goals for bonus points. Avoid rocks!'}</p>
          <StoryNotes game="treasure-drift" progress={frame.time} />
          <p className="text-xs text-cyan-200">Drag or tap anywhere to steer in two dimensions · Arrow keys / WASD · P to pause</p>
          <button className="rounded-lg bg-amber-300 px-8 py-3 font-mono font-bold text-[#003444] hover:bg-amber-200" onClick={mode === 'paused' ? toggle : start}>{mode === 'paused' ? 'RESUME' : mode === 'over' ? 'SAIL AGAIN' : 'SET SAIL'}</button>
        </div></div>}
    </div>
  );
}

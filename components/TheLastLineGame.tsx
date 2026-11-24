'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { SoundButton, useGameSound } from './GameSound';
import { advanceRun, choose, ending, newRun, readRun, sceneIndex, SCENES, SCENE_SECONDS, TOTAL_SECONDS, type Run } from '@/lib/last-line';

const STORAGE = 'duenever_last_line_v1';
type Mode = 'menu' | 'playing' | 'paused' | 'ending';
const button = 'min-h-[44px] rounded-md border border-amber-100/25 bg-[#17232a] px-4 py-2 text-sm font-semibold text-amber-50 transition hover:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 disabled:opacity-50';
const primary = 'min-h-[46px] rounded-md bg-[#e2b668] px-5 py-2.5 text-sm font-bold text-[#182027] hover:bg-[#f3cf88] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';
const formatTime = (seconds: number) => { const s = Math.max(0, Math.ceil(seconds)); return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`; };

export function TheLastLineGame({ onBack }: { onBack: () => void }) {
  const { muted, toggle: toggleSound, play, stop } = useGameSound();
  const [mode, setMode] = useState<Mode>('menu');
  const [run, setRun] = useState<Run>(newRun);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const runRef = useRef<Run>(newRun());
  const modeRef = useRef<Mode>('menu');
  const lastTick = useRef(0);
  const changeMode = useCallback((next: Mode) => { modeRef.current = next; setMode(next); }, []);
  const save = useCallback((next: Run) => { try { localStorage.setItem(STORAGE, JSON.stringify(next)); } catch { /* The game still works without storage. */ } }, []);
  const applyRun = useCallback((next: Run) => { runRef.current = next; setRun(next); save(next); }, [save]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      const saved = raw ? readRun(JSON.parse(raw)) : null;
      if (saved) { runRef.current = saved; setRun(saved); changeMode(saved.elapsed >= TOTAL_SECONDS ? 'ending' : 'paused'); }
    } catch { /* Ignore a damaged or unavailable save. */ }
  }, [changeMode]);

  const syncClock = useCallback(() => {
    if (modeRef.current !== 'playing') return runRef.current;
    const now = performance.now();
    const next = advanceRun(runRef.current, Math.max(0, (now - lastTick.current) / 1000));
    lastTick.current = now;
    const previousIndex = sceneIndex(runRef.current);
    applyRun(next);
    if (next.elapsed >= TOTAL_SECONDS) { stop(); play('win'); changeMode('ending'); }
    else if (sceneIndex(next) !== previousIndex) play('collect');
    return next;
  }, [applyRun, changeMode, play, stop]);
  const pause = useCallback(() => {
    if (modeRef.current !== 'playing') return;
    syncClock();
    if (modeRef.current === 'playing') { stop(); changeMode('paused'); }
  }, [syncClock, stop, changeMode]);
  const resume = useCallback(() => { lastTick.current = performance.now(); setConfirmRestart(false); changeMode('playing'); }, [changeMode]);
  const start = useCallback(() => { applyRun(newRun()); setConfirmRestart(false); play('start'); lastTick.current = performance.now(); changeMode('playing'); }, [applyRun, changeMode, play]);
  const select = (choice: number) => {
    const displayedIndex = sceneIndex(runRef.current);
    const latest = syncClock();
    if (modeRef.current !== 'playing' || sceneIndex(latest) !== displayedIndex) return;
    applyRun(choose(latest, choice)); play('move');
  };
  const quit = () => { if (modeRef.current === 'playing') pause(); onBack(); };
  useEffect(() => {
    const timer = window.setInterval(() => { if (modeRef.current === 'playing') syncClock(); }, 1000);
    const visibility = () => { if (document.hidden) pause(); };
    const blur = () => pause();
    const keyboard = (event: KeyboardEvent) => {
      if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) {
        if (modeRef.current === 'playing') { event.preventDefault(); pause(); }
        else if (modeRef.current === 'paused' && !confirmRestart) { event.preventDefault(); resume(); }
      }
    };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur); window.addEventListener('keydown', keyboard);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); window.removeEventListener('keydown', keyboard); };
  }, [syncClock, pause, resume, confirmRestart]);

  const index = sceneIndex(run), scene = SCENES[index], selected = run.answers[index];
  const minuteRemaining = SCENE_SECONDS - (run.elapsed % SCENE_SECONDS);
  const finished = ending(run);
  return <div role="dialog" aria-modal="true" aria-label="The Last Line game" className="fixed inset-0 z-[70] flex h-[100dvh] flex-col overflow-hidden bg-[#10191d] text-[#ece9df]">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: 'url(/games/the-last-line/desk.jpg)' }} />
    <header className="relative z-10 flex min-h-[64px] shrink-0 items-center justify-between gap-2 border-b border-amber-100/15 bg-[#0c161b]/95 px-3 py-2 sm:px-6">
      <div className="min-w-0"><p className="font-mono text-[9px] font-bold uppercase tracking-[.2em] text-amber-300">DueNever / Interactive fiction</p><h1 className="truncate text-lg font-bold tracking-tight">The Last Line</h1></div>
      <div className="flex items-center gap-2"><div role="timer" aria-live="off" aria-label={`Time remaining ${formatTime(TOTAL_SECONDS-run.elapsed)}`} className="rounded border border-amber-200/20 bg-black/30 px-2 py-1 font-mono text-lg tabular-nums text-amber-200">{formatTime(TOTAL_SECONDS-run.elapsed)}</div><SoundButton muted={muted} toggle={toggleSound}/>{(mode==='playing'||mode==='paused') && <button onClick={mode==='playing'?pause:resume} aria-label={mode==='playing'?'Pause story':'Resume story'} className="grid h-10 w-10 place-items-center rounded border border-white/15 bg-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">{mode==='playing'?<Pause size={17}/>:<Play size={17}/>}</button>}<button onClick={quit} aria-label="Quit game" className="grid h-10 w-10 place-items-center rounded border border-white/15 bg-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"><X size={18}/></button></div>
    </header>
    <main className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {mode === 'menu' && <div className="mx-auto flex min-h-full max-w-3xl items-center px-5 py-8"><div className="space-y-5 rounded-xl border border-amber-100/15 bg-[#0c171d]/95 p-6 shadow-2xl sm:p-9"><p className="font-mono text-xs uppercase tracking-[.18em] text-amber-300">A real-time psychological story · approximately 15 minutes</p><h2 className="font-serif text-4xl font-bold sm:text-6xl">The Last Line</h2><p className="max-w-xl text-base leading-relaxed text-stone-300">A rising river. A disputed order. One voice on the emergency line insists it knows best. You have fifteen minutes to decide what goes into the record—and what happens at the gate.</p><p className="max-w-xl text-sm leading-relaxed text-stone-400">Fictional characters may mislead or pressure you. No real calls are made and no personal information is requested. The story pauses when you leave the tab. Your progress is stored only on this device when available.</p><div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-stone-300"><strong className="text-amber-200">How to play</strong><p className="mt-1">Each of the 15 calls lasts one minute. Inspect the file, then choose a response; you can change it until the minute ends. No response is also a choice. Earlier decisions affect the ending.</p></div><button onClick={start} className={primary}>Begin the shift</button></div></div>}
      {mode === 'playing' && <div className="mx-auto grid max-w-6xl gap-4 px-3 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:py-8">
        <section className="min-w-0 rounded-xl border border-amber-100/20 bg-[#0b171d]/95 p-4 shadow-2xl sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-amber-300"><span>{scene.chapter}</span><span>Call {index+1} / {SCENES.length} · {formatTime(minuteRemaining)} left</span></div>
          <div aria-hidden="true" className="mt-3 h-1 overflow-hidden rounded bg-white/10"><div className="h-full bg-amber-400/80" style={{width:`${100 * (1 - (run.elapsed % SCENE_SECONDS) / SCENE_SECONDS)}%`}}/></div>
          <h2 className="mt-5 font-serif text-3xl font-bold tracking-tight sm:text-4xl">{scene.title}</h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-7 text-stone-200 sm:text-base">{scene.message}</p>
          {run.elapsed % SCENE_SECONDS >= 30 && <div className="mt-4 border-l-2 border-amber-500/70 bg-amber-950/25 px-4 py-3 text-sm italic leading-6 text-amber-100" role="status">{scene.pressure}</div>}
          <details key={index} className="mt-5 rounded-lg border border-sky-100/15 bg-[#172a31] p-4 text-sm text-stone-200"><summary className="cursor-pointer font-bold text-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">Inspect file · {scene.evidenceTitle}</summary><p className="mt-3 leading-6">{scene.evidence}</p></details>
          <fieldset className="mt-6"><legend className="font-mono text-[10px] font-bold uppercase tracking-widest text-stone-400">Choose a response · change it before the minute ends</legend><div className="mt-3 grid gap-2">{scene.options.map((option, i)=><button key={option.label} onClick={()=>select(i)} aria-pressed={selected===i} className={`min-h-[48px] rounded-md border px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${selected===i?'border-amber-300 bg-amber-200/15 text-amber-100':'border-white/15 bg-white/[.03] text-stone-200 hover:border-amber-200/60'}`}><span className="mr-3 font-mono text-amber-400">0{i+1}</span>{option.label}</button>)}</div></fieldset>
          {selected !== null && <div className="mt-4 rounded-lg border border-amber-100/10 bg-black/20 p-4 text-sm leading-6 text-stone-300" aria-live="polite"><span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-amber-300">Morrow</span>{scene.options[selected].reply}</div>}
        </section>
        <aside className="space-y-4"><div className="rounded-xl border border-white/10 bg-[#101d22]/95 p-4"><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">Desk instructions</p><p className="mt-2 text-xs leading-5 text-stone-300">The clock advances in real time while playing. The latest response is recorded when the minute ends. Pause whenever you need to read.</p></div><details className="rounded-xl border border-white/10 bg-[#101d22]/95 p-4 text-sm"><summary className="cursor-pointer font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">Shift ledger · {index} completed</summary>{index===0?<p className="mt-3 text-xs text-stone-400">Completed calls appear here.</p>:<ol className="mt-3 max-h-64 space-y-3 overflow-y-auto text-xs leading-5">{SCENES.slice(0,index).map((past,i)=><li key={past.title}><strong className="text-amber-200">{String(i+1).padStart(2,'0')} · {past.title}</strong><p className="text-stone-300">{run.answers[i]===null?'No response recorded':past.options[run.answers[i]!].label}</p></li>)}</ol>}</details></aside>
      </div>}
      {mode === 'paused' && <div className="mx-auto flex min-h-full max-w-xl items-center px-5 py-8"><div className="w-full space-y-5 rounded-xl border border-amber-100/15 bg-[#0c171d]/95 p-6 shadow-2xl sm:p-9"><p className="font-mono text-xs uppercase tracking-[.18em] text-amber-300">The clock is stopped</p><h2 className="font-serif text-4xl font-bold">Shift paused</h2><p className="text-sm leading-6 text-stone-300">Call {index+1} of {SCENES.length} · {formatTime(TOTAL_SECONDS-run.elapsed)} remaining. Your current choice is saved on this device if storage is available.</p><div className="flex flex-wrap gap-3"><button onClick={resume} className={primary}>Continue story</button><button onClick={()=>setConfirmRestart(true)} className={button}>Start over</button></div>{confirmRestart && <div className="space-y-3 rounded border border-amber-200/25 bg-black/20 p-4 text-sm"><p>Start over? This replaces the saved shift on this device.</p><div className="flex gap-2"><button onClick={start} className={primary}>Yes, start over</button><button onClick={()=>setConfirmRestart(false)} className={button}>Cancel</button></div></div>}</div></div>}
      {mode === 'ending' && <div className="mx-auto flex min-h-full max-w-2xl items-center px-5 py-8"><div className="space-y-5 rounded-xl border border-amber-100/15 bg-[#0c171d]/95 p-6 shadow-2xl sm:p-9"><p className="font-mono text-xs uppercase tracking-[.18em] text-amber-300">End of shift</p><h2 className="font-serif text-4xl font-bold sm:text-5xl">{finished.title}</h2><p className="text-base leading-7 text-stone-200">{finished.text}</p><p className="text-sm leading-6 text-stone-400">The story is complete. Your choices shaped the record and the warnings, not a perfect outcome. Records preserved: {finished.proof} · witness actions: {finished.witnesses}.</p><details className="rounded border border-white/15 p-4 text-sm"><summary className="cursor-pointer font-bold">Review your shift</summary><ol className="mt-3 max-h-60 space-y-2 overflow-y-auto text-xs leading-5">{SCENES.map((item,i)=><li key={item.title}><strong className="text-amber-200">{i+1}. {item.title}:</strong> {run.answers[i]===null?'No response recorded':item.options[run.answers[i]!].label}</li>)}</ol></details><div className="flex flex-wrap gap-3"><button onClick={start} className={primary}>Play again</button><button onClick={onBack} className={button}>Back to games</button></div></div></div>}
    </main>
  </div>;
}

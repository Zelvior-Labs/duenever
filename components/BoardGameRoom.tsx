'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Copy, LockKeyhole, RotateCw, Users, X } from 'lucide-react';
import { Chess, type Square } from 'chess.js';
import { boardAction, type BoardAction, type BoardGame, type BoardState, legalLudo } from '@/lib/board-games';
import { LudoBoard, ludoColorNames, ludoColors } from './LudoBoard';

type View = { code: string; credential?: string; version: number; seat: number; board: BoardState; names: string[]; ready: boolean };
type Session = { code: string; credential: string };
const pieceNames: Record<string,string> = { k:'king', q:'queen', r:'rook', b:'bishop', n:'knight', p:'pawn' };
const button = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-xs font-bold text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40';
const primary = 'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border-2 border-black bg-[var(--accent)] px-5 py-2.5 font-mono text-sm font-bold text-black shadow-[3px_3px_0_#000] transition hover:bg-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40';
const card = 'rounded-xl border border-neutral-800 bg-[#181818] shadow-[4px_4px_0_rgba(0,0,0,.4)]';
const diceDots: Record<number, number[]> = { 1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8] };

function Die({ value, rolling }: { value: number | null; rolling: boolean }) {
  return <div aria-label={rolling ? 'Rolling dice' : value ? `Last roll ${value}` : 'No roll yet'} className={`grid h-14 w-14 shrink-0 grid-cols-3 grid-rows-3 gap-1 rounded-xl border-2 border-neutral-600 bg-[#f2f1e7] p-2 shadow-[3px_4px_0_#080808] ${rolling ? 'animate-pulse' : ''}`}>{Array.from({length:9},(_,i)=><span key={i} className={`rounded-full ${value && diceDots[value]?.includes(i) ? 'bg-neutral-900' : 'bg-transparent'}`} />)}</div>;
}

export function BoardGameRoom({ game, onBack }: { game: BoardGame; onBack: () => void }) {
  const [name,setName] = useState('Player'); const [count,setCount] = useState(game === 'chess' ? 2 : 4); const [humans,setHumans] = useState(1); const [joinCode,setJoinCode] = useState('');
  const [session,setSession] = useState<Session | null>(null); const [view,setView] = useState<View | null>(null); const [busy,setBusy] = useState(false); const [uncertain,setUncertain] = useState(false); const [rolling,setRolling] = useState(false); const [error,setError] = useState(''); const [syncError,setSyncError] = useState(''); const [copied,setCopied] = useState(false);
  const [claimNext,setClaimNext] = useState(false); const [selected,setSelected] = useState<Square | null>(null); const [promotion,setPromotion] = useState<{from:Square;to:Square}|null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null); const sessionRef = useRef<Session | null>(null); const confirmedRef = useRef<View | null>(null); const viewRef = useRef<View | null>(null); const pendingRef = useRef(false); const uncertainRef = useRef(false); const generationRef = useRef(0); const refreshRef = useRef<() => void>(() => {});
  const key = `duenever_room_${game}`;
  const acceptView = useCallback((v: View) => {
    const previous = confirmedRef.current;
    if (previous && previous.code === v.code && v.version < previous.version) return;
    if (previous && previous.code === v.code && v.version === previous.version && viewRef.current === previous) return;
    confirmedRef.current = v; viewRef.current = v; setView(v);
  }, []);
  const request = useCallback(async (data: unknown) => {
    const r = await fetch('/api/rooms', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store',signal:AbortSignal.timeout(12000)});
    const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Room unavailable'); return body as View;
  }, []);
  useEffect(() => { try { const s = JSON.parse(sessionStorage.getItem(key) || 'null') as Session | null; if (s?.code && s.credential) { setSession(s); sessionRef.current=s; } } catch {} }, [key]);
  useEffect(() => {
    if (!session) return;
    let stopped=false, inFlight=false, timer: ReturnType<typeof setTimeout>;
    const schedule = (ms: number) => { clearTimeout(timer); if (!stopped) timer=setTimeout(() => void poll(),ms); };
    const poll = async () => {
      if (stopped || inFlight) return;
      if (document.hidden) { schedule(4000); return; }
      if (pendingRef.current) { schedule(150); return; }
      inFlight=true; const generation=generationRef.current;
      try {
        const v=await request({op:'state',...session});
        if (!stopped && generation===generationRef.current && !pendingRef.current && sessionRef.current?.credential===session.credential) { acceptView(v); setSyncError(''); if (uncertainRef.current) { uncertainRef.current=false;setUncertain(false);setError(previous=>previous.replace('Checking the room before you retry.', 'Room is up to date.')); } }
      } catch (e) { if (!stopped && generation===generationRef.current) setSyncError(e instanceof Error ? e.message : 'Connection lost'); }
      finally {
        inFlight=false;
        const v=confirmedRef.current;
        // Check frequently while waiting for another player; back off on our turn,
        // after the game ends, and in background tabs. Never overlap requests.
        schedule(v && v.ready && !v.board.finished && v.board.turn !== v.seat ? 650 : v && !v.ready ? 650 : 2200);
      }
    };
    refreshRef.current=()=>{ if (!inFlight) schedule(0); };
    const visible=()=>{ if (!document.hidden) refreshRef.current(); };
    document.addEventListener('visibilitychange',visible); schedule(0);
    return () => {stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);refreshRef.current=()=>{};};
  }, [session,request,acceptView]);
  const enter = async (op:'create'|'join') => {
    if (pendingRef.current) return; pendingRef.current=true; setBusy(true);setError('');setSyncError('');
    try { const v=await request(op==='create'?{op,game,count,humans,name}:{op,game,code:joinCode.trim(),name}); if (!v.credential) throw new Error('Missing player token'); if(v.board.game!==game) throw new Error(`This is a ${v.board.game} room. Open that game to join.`); const s={code:v.code,credential:v.credential}; sessionRef.current=s;setSession(s);acceptView(v);sessionStorage.setItem(key,JSON.stringify(s)); requestAnimationFrame(()=>{ if (overlayRef.current) overlayRef.current.scrollTop=0; }); }
    catch(e) {setError(e instanceof Error?e.message:'Could not enter room');} finally {pendingRef.current=false;setBusy(false);}
  };
  const forget = () => { generationRef.current++; sessionStorage.removeItem(key);sessionRef.current=null;confirmedRef.current=null;viewRef.current=null;uncertainRef.current=false;setUncertain(false);setSession(null);setView(null);setSelected(null);setError('');setSyncError(''); };
  const leave = async () => {
    if (!sessionRef.current || pendingRef.current) return; pendingRef.current=true;generationRef.current++;setBusy(true);
    try { await request({op:'leave',...sessionRef.current});forget(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not leave room'); }
    finally { pendingRef.current=false;setBusy(false); }
  };
  const act = async (action:BoardAction) => {
    const current=sessionRef.current, latest=confirmedRef.current;
    if (!current || !latest || pendingRef.current || uncertainRef.current) return;
    pendingRef.current=true;generationRef.current++;setBusy(true);setRolling(action.type==='roll');setError('');setSelected(null);setPromotion(null);
    // Moves are deterministic, so display them immediately. Dice and bot actions
    // remain server-generated; a rejected or uncertain move is rolled back.
    if (action.type==='move') {
      try { const optimistic={...latest,board:boardAction(latest.board,latest.seat,action,()=>{throw new Error('Dice are server generated');})};viewRef.current=optimistic;setView(optimistic); } catch { /* The server is authoritative. */ }
    }
    try { const v=await request({op:'action',...current,action});if (sessionRef.current?.credential===current.credential) acceptView(v); }
    catch(e) { if (sessionRef.current?.credential===current.credential) { uncertainRef.current=true;setUncertain(true);viewRef.current=confirmedRef.current;setView(confirmedRef.current);setError(`${e instanceof Error?e.message:'Move failed'}. Checking the room before you retry.`); } }
    finally {pendingRef.current=false;setBusy(false);setRolling(false);refreshRef.current();}
  };
  const copyCode = async () => { try { if (!view) return; await navigator.clipboard.writeText(view.code); setCopied(true); window.setTimeout(()=>setCopied(false),1800); } catch { setError('Could not copy automatically. Select the code to copy it.'); } };
  const chess = useMemo(() => { const c=new Chess(); if (view?.board.game==='chess') { try { for(const san of view.board.chessMoves)c.move(san); } catch {} } return c; },[view?.board]);
  const destinations = useMemo(() => selected ? chess.moves({square:selected,verbose:true}).map(m=>m.to) : [],[chess,selected]);
  const myTurn=!!view && view.ready && !view.board.finished && view.board.turn===view.seat;
  const locked=busy || uncertain;
  const selectSquare = (square:Square) => {
    if (!myTurn || locked) return;
    const piece=chess.get(square);
    if (selected && destinations.includes(square)) {
      const moves=chess.moves({square:selected,verbose:true}).filter(m=>m.to===square);
      if (moves.some(m=>m.promotion)) setPromotion({from:selected,to:square});
      else { void act({type:claimNext?'claim-draw':'move',from:selected,to:square}); setClaimNext(false); }
    } else setSelected(piece && piece.color===chess.turn() ? square : null);
  };
  const title = game==='chess' ? 'Chess' : 'Ludo';
  const status = !view ? '' : !view.ready ? 'Waiting for players' : view.board.finished ? view.board.result : myTurn ? 'Your turn' : `${view.names[view.board.turn]}'s turn`;
  return <div ref={overlayRef} role="dialog" aria-modal="true" aria-label={`${game} game`} className="fixed inset-0 z-[70] h-[100dvh] overflow-y-auto bg-[#111111] text-neutral-100 font-sans selection:bg-[var(--accent)] selection:text-black">
    <div className="mx-auto flex min-h-full max-w-[1440px] flex-col px-4 pb-8 sm:px-7">
      <header className="flex min-h-[68px] items-center justify-between gap-3 border-b border-neutral-800 py-3">
        <div className="flex min-w-0 items-center gap-3"><button aria-label="Close" className={button} onClick={onBack}><ArrowLeft size={15}/><span className="hidden sm:inline">All games</span></button><div className="h-8 w-px bg-neutral-800"/><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[var(--accent)]">DueNever / Game room</p><h1 className="text-lg font-extrabold leading-tight tracking-tight">{title}</h1></div></div>
        <div className="flex items-center gap-2">{session && <button className={button} onClick={()=>void leave()} disabled={busy}>Leave <span className="hidden sm:inline">room</span></button>}<button aria-label="Close game" className={`${button} px-3`} onClick={onBack}><X size={16}/></button></div>
      </header>
      {(error || syncError) && <div role="alert" className="mt-4 rounded-lg border border-rose-800 bg-rose-950/50 p-3 font-mono text-xs text-rose-200">{error || `Connection interrupted: ${syncError}. Retrying…`}{session && <button onClick={forget} className="ml-3 underline">Forget room on this device</button>}</div>}
      {!session && <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-6 py-8 md:grid-cols-[1fr_1fr] md:py-14">
        <div className="space-y-5"><span className="inline-flex rounded bg-[var(--accent)] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-black">Private multiplayer</span><h2 className="text-4xl font-black tracking-tight sm:text-5xl">Good games.<br/><span className="text-[var(--accent)]">Better company.</span></h2><p className="max-w-md font-mono text-sm leading-relaxed text-neutral-400">Bring your friends, challenge a bot, or invite an LLM. Your game, your room.</p><div className="relative h-40 overflow-hidden rounded-xl border border-neutral-800 sm:h-52"><img src={`/games/${game}/banner.jpg`} alt="" draggable={false} className="h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/><span className="absolute bottom-3 left-4 font-mono text-xs font-bold uppercase tracking-widest text-white">{title} / Ready to play</span></div></div>
        <div className={`${card} space-y-4 p-5 sm:p-6`}><div><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">Start here</p><h3 className="mt-1 text-2xl font-bold tracking-tight">Play with friends or bots</h3><p className="mt-1 text-xs leading-relaxed text-neutral-400">Create a room or join with a private code.</p></div>
          <label className="block font-mono text-xs font-bold text-neutral-300">Your name<input value={name} maxLength={24} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 p-3 font-sans text-sm text-white outline-none focus:border-[var(--accent)]" /></label>
          <div className="grid grid-cols-2 gap-3">{game==='ludo' && <label className="block font-mono text-xs font-bold text-neutral-300">Players <select value={count} onChange={e=>{const n=Number(e.target.value);setCount(n);setHumans(Math.min(n,humans));}} className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm">{[2,3,4].map(n=><option key={n}>{n}</option>)}</select></label>}
          <label className={`block font-mono text-xs font-bold text-neutral-300 ${game==='chess'?'col-span-2':''}`}>Human players <select value={humans} onChange={e=>setHumans(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm">{Array.from({length:count},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label></div>
          <p className="font-mono text-[11px] text-neutral-500">Remaining seats are bots. Reserve a human seat for each friend or LLM.</p>
          <button disabled={busy} className={`${primary} w-full`} onClick={()=>void enter('create')}>{busy ? 'Connecting…' : 'Create private room'} <span aria-hidden="true">→</span></button>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500"><span className="h-px flex-1 bg-neutral-800"/>or join a friend<span className="h-px flex-1 bg-neutral-800"/></div>
          <div className="flex gap-2"><input aria-label="Room code" value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Paste room code" className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 p-3 font-mono text-xs outline-none focus:border-[var(--accent)]" /><button disabled={busy || !joinCode} className={button} onClick={()=>void enter('join')}>Join</button></div>
          <details className="border-t border-neutral-800 pt-3 font-mono text-xs text-neutral-400"><summary className="cursor-pointer hover:text-neutral-200">Play with an LLM via MCP</summary><p className="mt-2 leading-relaxed">Reserve a human seat and share the private code with your assistant. <a className="text-[var(--accent)] underline" href="/mcp" target="_blank" rel="noopener noreferrer">Setup instructions</a></p></details>
        </div>
      </div>}
      {session && !view && <p className="my-auto py-10 text-center font-mono text-sm text-neutral-400">Connecting to room…</p>}
      {view && <div className="flex flex-1 flex-col gap-4 py-4 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-neutral-500">{game==='ludo'?'Race to home':'The classic game'} / {view.board.finished?'Game over':view.ready?'In progress':'Lobby'}</p><div className="mt-1 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${myTurn?'bg-[var(--accent)]':'bg-neutral-500'}`}/><h2 className="text-xl font-extrabold tracking-tight sm:text-2xl" aria-live="polite">{status}</h2>{busy && <span className="font-mono text-[10px] uppercase text-neutral-500">Syncing</span>}</div></div><div className="flex max-w-full items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2"><LockKeyhole size={14} className="shrink-0 text-neutral-500"/><div className="min-w-0"><p className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">Private room code</p><code className="select-all break-all font-mono text-xs text-neutral-300">{view.code}</code></div><button aria-label="Copy room code" onClick={()=>void copyCode()} className="ml-1 rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white">{copied?<Check size={16}/>:<Copy size={16}/>}</button></div></div>
        <div className="grid flex-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className={`${card} flex items-center justify-center p-2 sm:p-4`}><div className="w-full max-w-[min(100%,680px)]">
          {game==='chess' ? <div className="grid aspect-square w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border-4 border-[#393939] shadow-[0_18px_50px_rgba(0,0,0,0.45)]" aria-label="Chess board">
            {Array.from({length:64},(_,display)=>{const i=view.seat===0?display:63-display,rank=8-Math.floor(i/8),file='abcdefgh'[i%8],sq=`${file}${rank}` as Square,piece=chess.get(sq), light=(Math.floor(i/8)+i%8)%2===0;return <button key={sq} type="button" onClick={()=>selectSquare(sq)} aria-label={`${sq} ${piece ? `${piece.color==='w'?'white':'black'} ${pieceNames[piece.type]}`:'empty'}`} className="relative flex items-center justify-center focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]" style={{background:selected===sq?'#b6e561':destinations.includes(sq)?'#90b973':light?'#dfdccb':'#65766b'}}>{piece && <img draggable={false} alt="" src={`/games/chess/${pieceNames[piece.type]}.png`} className="h-[92%] w-[90%] object-contain drop-shadow-md" style={piece.color==='b'?{filter:'brightness(.32) saturate(.25)'}:undefined}/>}<span className="absolute bottom-0 left-0.5 font-mono text-[clamp(7px,1vw,10px)] font-bold text-black/50">{sq}</span></button>})}
          </div> : <LudoBoard board={view.board} seat={view.seat} canMove={myTurn} busy={locked} onMove={token=>void act({type:'move',token})} />}</div></div>
          <aside className="flex flex-col gap-4"><div className={`${card} order-2 p-4 lg:order-1`}><div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500"><Users size={14}/> Players <span className="ml-auto">{view.board.seats.length} seats</span></div><div className="space-y-2">{view.names.map((n,i)=><div key={i} className={`flex items-center gap-3 rounded-lg border p-2.5 ${view.board.turn===i && view.ready && !view.board.finished?'border-neutral-600 bg-neutral-800':'border-transparent bg-neutral-950/60'}`}><span className="h-3 w-3 shrink-0 rounded-full" style={{background:game==='ludo'?ludoColors[i]:i===0?'#ece9d9':'#666'}}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{n}{i===view.seat && <span className="ml-1 font-mono text-[10px] text-neutral-500">YOU</span>}</p><p className="font-mono text-[10px] text-neutral-500">{game==='ludo'?`${ludoColorNames[i]} · ${view.board.ludo[i].filter(p=>p===57).length}/4 home`:i===0?'White':'Black'}</p></div>{view.board.turn===i && view.ready && !view.board.finished && <span className="font-mono text-[9px] font-bold text-[var(--accent)]">TURN</span>}</div>)}</div></div>
            {view.ready && game==='ludo' && <div className={`${card} order-1 space-y-4 p-4 lg:order-2`}><div className="flex items-center gap-4"><Die value={view.board.lastRoll} rolling={rolling}/><div><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">Last roll</p><p className="mt-1 text-lg font-bold">{rolling?'Rolling…':view.board.lastRoll ?? 'Ready?'}</p></div></div><button disabled={!myTurn || view.board.die!==null || locked} className={`${primary} w-full`} onClick={()=>void act({type:'roll'})}><RotateCw size={15}/>Roll dice</button>{myTurn && view.board.die!==null && <><p className="font-mono text-xs text-[var(--accent)]">Choose a highlighted token for {view.board.die}.</p><div className="flex flex-wrap gap-2">{legalLudo(view.board).map(i=><button key={i} className={button} disabled={locked} onClick={()=>void act({type:'move',token:i})}>Token {i+1}</button>)}</div></>}<p className="font-mono text-[11px] leading-relaxed text-neutral-500">Roll six to enter and play again. Dots are safe squares; exact roll to finish.</p></div>}
            {view.ready && game==='chess' && <div className={`${card} order-1 space-y-3 p-4 lg:order-2`}><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">Game notes</p><p className="text-sm font-bold">{chess.isCheck() ? 'Check! ' : ''}{view.board.chessMoves.length ? `Last move: ${view.board.chessMoves.at(-1)}` : 'White moves first.'}</p><p className="font-mono text-[11px] leading-relaxed text-neutral-500">Select a piece, then a highlighted destination. Castling, en passant and promotion are supported.</p><label className="block font-mono text-xs text-neutral-400"><input type="checkbox" checked={claimNext} disabled={!myTurn || locked} onChange={e=>setClaimNext(e.target.checked)} className="mr-2 accent-lime-400"/>Claim draw with intended move</label>{(chess.isThreefoldRepetition() || chess.isDrawByFiftyMoves()) && <button className={button} disabled={!myTurn || locked} onClick={()=>void act({type:'claim-draw'})}>Claim draw</button>}{!view.board.finished && <div className="flex flex-wrap gap-2"><button className={button} disabled={!myTurn || locked || view.board.drawOffer===view.seat} onClick={()=>void act({type:'offer-draw'})}>Offer draw</button>{view.board.drawOffer !== null && view.board.drawOffer !== view.seat && <button className={button} disabled={locked} onClick={()=>void act({type:'accept-draw'})}>Accept draw</button>}</div>}</div>}
            {!view.ready && <div className={`${card} order-1 p-4 lg:order-2 font-mono text-xs leading-relaxed text-neutral-400`}>Share the room code with your friends. The game starts when every human seat is filled.</div>}
            {view.ready && !view.board.finished && <button className={`${button} order-3 w-full`} disabled={locked} onClick={()=>void act({type:'resign'})}>Resign game</button>}
          </aside>
        </div>
      </div>}
      {promotion && <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/80 p-4"><div className={`${card} w-full max-w-sm p-5`}><h2 className="mb-1 text-xl font-bold">Choose promotion</h2><p className="mb-4 font-mono text-xs text-neutral-400">Pick a piece for your pawn.</p><div className="grid grid-cols-2 gap-2">{['q','r','b','n'].map(p=><button key={p} className={button} onClick={()=>{void act({type:claimNext?'claim-draw':'move',...promotion,promotion:p});setClaimNext(false);}}>{pieceNames[p]}</button>)}</div><button className={`${button} mt-3 w-full`} onClick={()=>setPromotion(null)}>Cancel</button></div></div>}
    </div></div>;
}

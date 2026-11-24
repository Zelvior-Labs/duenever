'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { type BoardAction, type BoardGame, type BoardState, legalLudo } from '@/lib/board-games';

type View = { code: string; credential?: string; seat: number; board: BoardState; names: string[]; ready: boolean };
type Session = { code: string; credential: string };
const colors = ['#f35a59', '#47c881', '#edbf43', '#559cf0'];
const path: [number, number][] = [[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]];
const bases: [number,number][][] = [[[2,2],[4,2],[2,4],[4,4]],[[10,2],[12,2],[10,4],[12,4]],[[10,10],[12,10],[10,12],[12,12]],[[2,10],[4,10],[2,12],[4,12]]];
const home = [Array.from({length:6},(_,i):[number,number]=>[i+1,7]), Array.from({length:6},(_,i):[number,number]=>[7,i+1]), Array.from({length:6},(_,i):[number,number]=>[13-i,7]), Array.from({length:6},(_,i):[number,number]=>[7,13-i])];
const pieceNames: Record<string,string> = { k:'king', q:'queen', r:'rook', b:'bishop', n:'knight', p:'pawn' };
const button = 'rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700 disabled:opacity-40';

export function BoardGameRoom({ game, onBack }: { game: BoardGame; onBack: () => void }) {
  const [name,setName] = useState('Player'); const [count,setCount] = useState(game === 'chess' ? 2 : 4); const [humans,setHumans] = useState(1); const [joinCode,setJoinCode] = useState('');
  const [session,setSession] = useState<Session | null>(null); const [view,setView] = useState<View | null>(null); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const [claimNext,setClaimNext] = useState(false);
  const [selected,setSelected] = useState<Square | null>(null); const [promotion,setPromotion] = useState<{from:Square;to:Square}|null>(null); const sessionRef = useRef<Session | null>(null);
  const key = `duenever_room_${game}`;
  useEffect(() => { try { const s = JSON.parse(sessionStorage.getItem(key) || 'null') as Session | null; if (s?.code && s.credential) { setSession(s); sessionRef.current=s; } } catch {} }, [key]);
  async function request(data: unknown) { const r = await fetch('/api/rooms', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),cache:'no-store'}); const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Room unavailable'); return body as View; }
  useEffect(() => {
    if (!session) return; let alive=true;
    const poll = async () => { try { const v = await request({op:'state',...session}); if (alive) { setView(v); setError(''); } } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Connection lost'); } };
    void poll(); const timer=setInterval(poll,1500); return () => {alive=false; clearInterval(timer);};
  }, [session]);
  const enter = async (op:'create'|'join') => { setBusy(true);setError(''); try { const v=await request(op==='create'?{op,game,count,humans,name}:{op,code:joinCode.trim(),name}); if (!v.credential) throw new Error('Missing player token'); const s={code:v.code,credential:v.credential}; sessionRef.current=s;setSession(s);setView(v);sessionStorage.setItem(key,JSON.stringify(s)); } catch(e) {setError(e instanceof Error?e.message:'Could not enter room');} finally {setBusy(false);} };
  const forget = () => { sessionStorage.removeItem(key); sessionRef.current=null; setSession(null); setView(null); setSelected(null); setError(''); };
  const leave = async () => {
    if (!sessionRef.current || busy) return;
    setBusy(true);
    try { await request({op:'leave',...sessionRef.current}); forget(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not leave room'); }
    finally { setBusy(false); }
  };
  const act = async (action:BoardAction) => { if (!sessionRef.current || busy) return;setBusy(true);setError('');try {const v=await request({op:'action',...sessionRef.current,action});setView(v);setSelected(null);setPromotion(null);} catch(e){setError(e instanceof Error?e.message:'Move failed');} finally{setBusy(false);} };
  const chess = useMemo(() => { const c=new Chess(); if (view?.board.game==='chess') { try { for(const san of view.board.chessMoves)c.move(san); } catch {} } return c; },[view]);
  const destinations = useMemo(() => selected ? chess.moves({square:selected,verbose:true}).map(m=>m.to) : [],[chess,selected]);
  const myTurn=!!view && view.ready && !view.board.finished && view.board.turn===view.seat;
  const selectSquare = (square:Square) => {
    if (!myTurn || busy) return;
    const piece=chess.get(square);
    if (selected && destinations.includes(square)) {
      const moves=chess.moves({square:selected,verbose:true}).filter(m=>m.to===square);
      if (moves.some(m=>m.promotion)) setPromotion({from:selected,to:square});
      else { void act({type:claimNext?'claim-draw':'move',from:selected,to:square}); setClaimNext(false); }
    } else setSelected(piece && piece.color===chess.turn() ? square : null);
  };
  return <div role="dialog" aria-modal="true" aria-label={`${game} game`} className="fixed inset-0 z-[70] h-[100dvh] overflow-y-auto bg-neutral-950 p-3 text-neutral-100 font-sans">
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-3">
      <header className="flex items-center justify-between gap-2"><h1 className="font-mono text-xl font-black">{game==='chess'?'CHESS':'LUDO'}</h1><div className="flex gap-2">{session && <button className={button} onClick={()=>void leave()} disabled={busy}>Leave room</button>}<button className={button} onClick={onBack}>Close</button></div></header>
      {error && <div role="alert" className="rounded border border-rose-800 bg-rose-950/50 p-2 text-sm text-rose-200">{error}{session && <button onClick={forget} className="ml-3 underline">Forget room on this device</button>}</div>}
      {!session && <div className="mx-auto my-auto w-full max-w-xl rounded-xl border border-neutral-700 bg-neutral-900 p-5 space-y-4">
        <h2 className="text-2xl font-bold">Play with friends or bots</h2><p className="text-sm text-neutral-400">Create a private room and share its secret code. For LAN, open the local host address on the same network.</p>
        <label className="block text-sm">Your name<input value={name} maxLength={24} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 p-2" /></label>
        {game==='ludo' && <label className="block text-sm">Players <select value={count} onChange={e=>{const n=Number(e.target.value);setCount(n);setHumans(Math.min(n,humans));}} className="ml-2 rounded bg-neutral-800 p-2">{[2,3,4].map(n=><option key={n}>{n}</option>)}</select></label>}
        <label className="block text-sm">Human players <select value={humans} onChange={e=>setHumans(Number(e.target.value))} className="ml-2 rounded bg-neutral-800 p-2">{Array.from({length:count},(_,i)=><option key={i+1}>{i+1}</option>)}</select> <span className="text-neutral-400">Remaining seats are bots.</span></label>
        <button disabled={busy} className="w-full rounded-lg bg-[var(--accent)] p-3 font-bold text-black disabled:opacity-50" onClick={()=>void enter('create')}>Create private room</button>
        <div className="flex gap-2"><input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Paste room code" className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 p-2" /><button disabled={busy || !joinCode} className={button} onClick={()=>void enter('join')}>Join</button></div>
      </div>}
      {session && !view && <p>Connecting to room…</p>}
      {view && <><div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-bold">{view.ready ? view.board.finished ? view.board.result : `${view.names[view.board.turn]}'s turn` : 'Waiting for players…'}</span><span className="text-neutral-400">You: {view.names[view.seat]}</span></div>
        <div className="rounded border border-neutral-700 bg-neutral-900 p-2 text-xs"><span className="text-neutral-400">Private room code (share only with players): </span><code className="select-all break-all">{view.code}</code><button className="ml-2 underline" onClick={()=>void navigator.clipboard?.writeText(view.code)}>Copy</button></div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 lg:flex-row lg:items-start">
        {game==='chess' ? <div className="grid aspect-square w-full max-w-[min(88vw,70vh)] grid-cols-8 grid-rows-8 overflow-hidden border-4 border-neutral-700" aria-label="Chess board">
          {Array.from({length:64},(_,i)=>{const rank=8-Math.floor(i/8),file='abcdefgh'[i%8],sq=`${file}${rank}` as Square,piece=chess.get(sq), light=(Math.floor(i/8)+i%8)%2===0;return <button key={sq} type="button" onClick={()=>selectSquare(sq)} aria-label={`${sq} ${piece ? `${piece.color==='w'?'white':'black'} ${pieceNames[piece.type]}`:'empty'}`} className="relative flex items-center justify-center" style={{background:selected===sq?'#a8cb52':destinations.includes(sq)?'#83ae73':light?'#e5cfaa':'#8d725b'}}>{piece && <img draggable={false} alt="" src={`/games/chess/${pieceNames[piece.type]}.png`} className="h-[92%] w-[90%] object-contain drop-shadow-md" style={piece.color==='b'?{filter:'brightness(.32) saturate(.25)'}:undefined}/>}<span className="absolute bottom-0 left-0 text-[8px] font-bold text-black/60">{sq}</span></button>})}
        </div> : <div className="relative aspect-square w-full max-w-[min(88vw,70vh)] overflow-hidden rounded border-4 border-neutral-600 bg-[#e9e1c9]" aria-label="Ludo board">
          {bases.map((base,i)=><div key={i} className="absolute rounded-xl" style={{left:`${(i===0||i===3?0:9)*100/15}%`,top:`${(i<2?0:9)*100/15}%`,width:'40%',height:'40%',background:colors[i]}} />)}
          {[...path,...home.flat()].map(([x,y],i)=><div key={i} className="absolute border border-neutral-500/50 bg-white/80" style={{left:`${x*100/15}%`,top:`${y*100/15}%`,width:`${100/15}%`,height:`${100/15}%`}} />)}
          {view.board.ludo.flatMap((tokens,player)=>tokens.map((progress,idx)=>{const [x,y]=progress<0?bases[player][idx]:progress<52?path[(progress+player*13)%52]:home[player][Math.min(5,progress-52)];const legal=myTurn && player===view.seat && legalLudo(view.board).includes(idx);return <button key={`${player}-${idx}`} aria-label={`Player ${player+1} token ${idx+1}`} disabled={!legal || busy} onClick={()=>void act({type:'move',token:idx})} className="absolute z-10 rounded-full border-2 border-white shadow-md disabled:cursor-default" style={{left:`${(x+0.12+(idx%2)*0.3)*100/15}%`,top:`${(y+0.12+Math.floor(idx/2)*0.3)*100/15}%`,width:'4.5%',height:'4.5%',background:colors[player],outline:legal?'2px solid #111':undefined}} />;}))}
        </div>}
        <aside className="w-full max-w-md space-y-2 text-sm"><div className="rounded border border-neutral-700 bg-neutral-900 p-3">{view.names.map((n,i)=><p key={i} className="py-1"><span style={{color:game==='ludo'?colors[i]:i===0?'#fff':'#aaa'}}>●</span> {n}{i===view.seat?' (you)':''} {view.board.turn===i && !view.board.finished?' ← turn':''}</p>)}</div>
          {view.ready && game==='ludo' && <><p>Last roll: {view.board.lastRoll ?? '—'} {view.board.die !== null ? `· choose a token for ${view.board.die}` : ''}</p><button disabled={!myTurn || view.board.die!==null || busy} className={button} onClick={()=>void act({type:'roll'})}>Roll dice</button><p className="text-neutral-400">Roll a six to enter and take another turn. Safe squares protect tokens; exact roll to finish.</p></>}
          {view.ready && game==='chess' && <><p>{chess.isCheck() ? 'Check! ' : ''}{view.board.chessMoves.length ? `Last move: ${view.board.chessMoves.at(-1)}` : 'White moves first.'}</p><p className="text-neutral-400">Select a piece, then a highlighted destination. Castling, en passant and promotion are supported.</p><label className="block text-neutral-400"><input type="checkbox" checked={claimNext} disabled={!myTurn || busy} onChange={e=>setClaimNext(e.target.checked)} /> Claim draw with intended move</label>{(chess.isThreefoldRepetition() || chess.isDrawByFiftyMoves()) && <button className={button} disabled={!myTurn || busy} onClick={()=>void act({type:'claim-draw'})}>Claim draw</button>}
          {!view.board.finished && <div className="flex gap-2"><button className={button} disabled={!myTurn || busy || view.board.drawOffer===view.seat} onClick={()=>void act({type:'offer-draw'})}>Offer draw</button>{view.board.drawOffer !== null && view.board.drawOffer !== view.seat && <button className={button} disabled={busy} onClick={()=>void act({type:'accept-draw'})}>Accept draw</button>}</div>}</>}
          {view.ready && !view.board.finished && <button className={button} disabled={busy} onClick={()=>void act({type:'resign'})}>Resign</button>}
        </aside></div></>}
      {promotion && <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/80"><div className="rounded bg-neutral-900 p-5"><h2 className="mb-3 font-bold">Choose promotion</h2><div className="flex gap-2">{['q','r','b','n'].map(p=><button key={p} className={button} onClick={()=>{void act({type:claimNext?'claim-draw':'move',...promotion,promotion:p});setClaimNext(false);}}>{pieceNames[p]}</button>)}</div></div></div>}
    </div></div>;
}

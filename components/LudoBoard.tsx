'use client';

import { type BoardState, legalLudo } from '@/lib/board-games';

export const ludoColors = ['#ff6666', '#57d998', '#f4c55d', '#67b9ff'];
export const ludoColorNames = ['Red', 'Green', 'Gold', 'Blue'];
const tokenImages = ['red', 'green', 'gold', 'blue'];
const path: [number, number][] = [[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]];
const bases: [number, number][][] = [[[1,1],[4,1],[1,4],[4,4]],[[10,1],[13,1],[10,4],[13,4]],[[10,10],[13,10],[10,13],[13,13]],[[1,10],[4,10],[1,13],[4,13]]];
const home = [Array.from({length:6},(_,i):[number,number]=>[i+1,7]), Array.from({length:6},(_,i):[number,number]=>[7,i+1]), Array.from({length:6},(_,i):[number,number]=>[13-i,7]), Array.from({length:6},(_,i):[number,number]=>[7,13-i])];
const safe = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const cellStyle = (x: number, y: number) => ({ left: `${x * 100 / 15}%`, top: `${y * 100 / 15}%`, width: `${100 / 15}%`, height: `${100 / 15}%` });

export function LudoBoard({ board, seat, canMove, busy, onMove }: { board: BoardState; seat: number; canMove: boolean; busy: boolean; onMove: (token: number) => void }) {
  const legal = canMove ? legalLudo(board) : [];
  const tokens = board.ludo.flatMap((pieces, player) => pieces.flatMap((progress, index) => {
    if (progress === 57) return [];
    const [x,y] = progress < 0 ? bases[player][index] : progress < 52 ? path[(progress + player * 13) % 52] : home[player][progress - 52];
    return [{ player, index, x, y, progress }];
  }));
  return <div aria-label="Ludo board" className="relative aspect-square w-full overflow-hidden rounded-xl border-[5px] border-[#343434] shadow-[0_18px_50px_rgba(0,0,0,0.45)]" style={{ background: 'url(/games/ludo/board-surface.jpg) center/cover' }}>
    {bases.map((_, i) => <div key={i} className="absolute flex items-center justify-center rounded-[16%] border-2" style={{ left: `${(i === 0 || i === 3 ? 0 : 9) * 100 / 15}%`, top: `${(i < 2 ? 0 : 9) * 100 / 15}%`, width: '40%', height: '40%', background: `linear-gradient(145deg, ${ludoColors[i]}44, ${ludoColors[i]}0b)`, borderColor: `${ludoColors[i]}88` }}>
      <div className="relative h-[67%] w-[67%] rounded-[23%] border border-white/10 bg-[#171717]/80 shadow-inner">
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[clamp(7px,1.2vw,11px)] font-bold uppercase tracking-[.18em] opacity-50" style={{ color: ludoColors[i] }}>{ludoColorNames[i]}</span>
        {[[13,13],[87,13],[13,87],[87,87]].map(([x,y],n)=><span key={n} className="absolute h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/30" style={{left:`${x}%`,top:`${y}%`}} />)}
      </div>
    </div>)}
    {path.map(([x,y],i)=><div key={`p${i}`} className="absolute flex items-center justify-center rounded-[12%] border border-[#292b28]" style={{ ...cellStyle(x,y), background: i % 13 === 0 ? `${ludoColors[i / 13]}aa` : '#d7d7c8' }}>
      {safe.has(i) && <span aria-hidden="true" className="h-[28%] w-[28%] rounded-full border border-black/40 bg-black/25" />}
    </div>)}
    {home.flatMap((lane,i)=>lane.map(([x,y],n)=><div key={`h${i}-${n}`} className="absolute rounded-[12%] border border-[#292b28]" style={{ ...cellStyle(x,y), background: `${ludoColors[i]}b8` }} />))}
    <div aria-hidden="true" className="absolute grid place-items-center overflow-hidden rounded-md border border-white/15" style={{left:'40%', top:'40%', width:'20%', height:'20%', background:`conic-gradient(from -45deg, ${ludoColors[1]} 0 25%, ${ludoColors[2]} 25% 50%, ${ludoColors[3]} 50% 75%, ${ludoColors[0]} 75% 100%)`}}><div className="grid h-[45%] w-[45%] rotate-45 place-items-center rounded bg-[#171717] shadow-lg"><span className="-rotate-45 font-mono text-[clamp(7px,1.2vw,11px)] font-black text-[var(--accent)]">HOME</span></div></div>
    {tokens.map(t=>{
      const stack = tokens.filter(other => other.x === t.x && other.y === t.y);
      const offset = stack.findIndex(other => other.player === t.player && other.index === t.index);
      const slot = offset % 4;
      const movable = t.player === seat && legal.includes(t.index);
      return <button key={`${t.player}-${t.index}`} type="button" aria-label={`Player ${t.player + 1} token ${t.index + 1}`} disabled={!movable || busy} onClick={()=>onMove(t.index)} className="absolute flex items-center justify-center rounded-full transition-[left,top,transform] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:cursor-default" style={{ left:`${(t.x + 0.5 + (stack.length > 1 ? (slot % 2 - .5) * .26 : 0)) * 100 / 15}%`, top:`${(t.y + 0.5 + (stack.length > 1 ? (Math.floor(slot / 2) - .5) * .22 : 0)) * 100 / 15}%`, width:'7%', height:'7%', transform:'translate(-50%, -50%)', zIndex: movable ? 30 : 10 + offset, background:movable?'rgba(204,255,0,.32)':'transparent', boxShadow:movable?'0 0 0 2px #ccff00, 0 0 14px #ccff0099':undefined }}>
        {/* Generated product-rendered token; color variants preserve the same silhouette. */}
        <img src={`/games/ludo/token-${tokenImages[t.player]}.png`} alt="" draggable={false} className="h-[96%] w-[80%] object-contain drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]" />
      </button>;
    })}
  </div>;
}

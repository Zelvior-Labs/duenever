import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { boardAction, chessPosition, legalLudo, newBoard } from '../lib/board-games';

const roll = () => 6;
test('chess rejects illegal and out-of-turn moves and detects checkmate', () => {
  let s = newBoard('chess', ['human','human']);
  assert.throws(() => boardAction(s, 1, {type:'move',from:'e7',to:'e5'}, roll));
  assert.throws(() => boardAction(s, 0, {type:'move',from:'e2',to:'e5'}, roll));
  for (const [seat,from,to] of [[0,'f2','f3'],[1,'e7','e5'],[0,'g2','g4'],[1,'d8','h4']] as const) s=boardAction(s,seat,{type:'move',from,to},roll);
  assert.equal(s.finished,true); assert.match(s.result,/checkmate/);
});
test('castling, en passant and promotion are understood by the chess engine', () => {
  const castle=chessPosition(['e4','e5','Nf3','Nc6','Bc4','Nf6']); assert.ok(castle.move('O-O'));
  const ep=chessPosition(['e4','a6','e5','d5']); assert.ok(ep.move('exd6')); assert.equal(ep.get('d5'),undefined);
  const promote=new Chess('8/P7/8/8/8/8/4k3/6K1 w - - 0 1'); assert.equal(promote.move({from:'a7',to:'a8',promotion:'n'}).promotion,'n');
});
test('Ludo entry, capture, safe squares and exact finish', () => {
  let s = newBoard('ludo', ['human','human']); s=boardAction(s,0,{type:'roll'},roll); assert.deepEqual(legalLudo(s),[0,1,2,3]);
  s=boardAction(s,0,{type:'move',token:0},roll); assert.equal(s.ludo[0][0],0); assert.equal(s.turn,0);
  s.ludo[0][0]=12; s.ludo[1][0]=0; s.die=1; s=boardAction(s,0,{type:'move',token:0},roll); assert.equal(s.ludo[1][0],0, 'start squares are safe');
  s.turn=0; s.ludo[0][0]=13; s.ludo[1][0]=1; s.die=1; s=boardAction(s,0,{type:'move',token:0},roll); assert.equal(s.ludo[1][0],-1, 'opponent is captured');
  s.turn=0;s.ludo[0][0]=56;s.die=2; assert.ok(!legalLudo(s).includes(0)); s.die=1; assert.ok(legalLudo(s).includes(0));
});
test('draw offer can be accepted by the other seat', () => {
  let s=newBoard('chess',['human','human']);s=boardAction(s,0,{type:'offer-draw'},roll);s=boardAction(s,0,{type:'move',from:'e2',to:'e4'},roll);s=boardAction(s,1,{type:'accept-draw'},roll);assert.equal(s.finished,true);assert.equal(s.result,'Draw by agreement');
});
test('repetition and an intended move can be claimed without making that move', () => {
  let s = newBoard('chess', ['human','human']);
  for (const [seat,from,to] of [[0,'g1','f3'],[1,'g8','f6'],[0,'f3','g1'],[1,'f6','g8'],[0,'g1','f3'],[1,'g8','f6'],[0,'f3','g1']] as const) s=boardAction(s,seat,{type:'move',from,to},roll);
  assert.throws(() => boardAction(s,1,{type:'claim-draw'},roll));
  const result=boardAction(s,1,{type:'claim-draw',from:'f6',to:'g8'},roll);
  assert.equal(result.finished,true); assert.equal(result.chessMoves.length,7);
});
test('fivefold repetition still ends the game after sixteen reversible plies', () => {
  let s = newBoard('chess', ['human','human']);
  const cycle = [[0,'g1','f3'],[1,'g8','f6'],[0,'f3','g1'],[1,'f6','g8']] as const;
  for (let n=0; n<4; n++) for (const [seat,from,to] of cycle) s=boardAction(s,seat,{type:'move',from,to},roll);
  assert.equal(s.finished,true); assert.equal(s.result,'Draw by fivefold repetition');
});

export type Obstacle = { id: number; kind: 'crate' | 'drone' | 'cell'; x: number; hit: boolean };
export type SprintState = { y: number; velocity: number; time: number; distance: number; cells: number; lives: number; invincible: number; spawn: number; nextId: number; objects: Obstacle[] };
export function newSprint(): SprintState { return { y:0, velocity:0, time:0, distance:0, cells:0, lives:3, invincible:0, spawn:1.2, nextId:0, objects:[] }; }
export function jump(state: SprintState): SprintState { return state.y === 0 && state.velocity === 0 ? { ...state, velocity: 90 } : state; }
export function sprintScore(state: SprintState): number { return Math.floor(state.distance) + state.cells * 50; }
export function stepSprint(input: SprintState, elapsed: number, sliding: boolean, random = Math.random): SprintState {
  const dt = Math.max(0, Math.min(elapsed, 0.05));
  const s: SprintState = { ...input, objects: input.objects.map(o=>({...o})) };
  s.time += dt; s.invincible = Math.max(0, s.invincible-dt);
  s.y = Math.max(0, s.y+s.velocity*dt); s.velocity -= 220*dt;
  if (s.y === 0) s.velocity=0;
  const speed = 30 + Math.min(15, s.time * 0.12); s.distance += speed * dt * 0.4;
  s.spawn -= dt;
  if (s.spawn <= 0) {
    const kind = random() < .53 ? 'crate' : 'drone';
    s.objects.push({ id:++s.nextId, kind, x:110, hit:false });
    if (random() < .48) s.objects.push({ id:++s.nextId, kind:'cell', x:110, hit:false });
    s.spawn = Math.max(1.25, 2.0-s.time/140)+random()*.35;
  }
  const height = sliding && s.y === 0 ? 5 : 12;
  for (const object of s.objects) {
    object.x -= speed*dt;
    if (object.hit || Math.abs(object.x-19) > (object.kind==='drone'?9:object.kind==='crate'?6.5:6)) continue;
    if (object.kind==='cell') {
      if (s.y <= 17 && s.y+height >= 13) { object.hit=true; s.cells++; }
    } else {
      const bottom = object.kind==='crate'?0:7.5, top = object.kind==='crate'?8:15;
      if (s.y < top && s.y + height > bottom) { object.hit=true; if (s.invincible===0) {s.lives--;s.invincible=1.6;} }
    }
  }
  s.objects=s.objects.filter(o=>o.x>-15 && !(o.hit && o.kind==='cell'));
  return s;
}

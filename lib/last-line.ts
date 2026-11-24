/** Simulation coordinates are percentages of the battlefield. Time is measured in seconds. */
export type Point = { x: number; y: number };
export const ROUTES: Point[][] = [
  [{x:0,y:20},{x:21,y:20},{x:21,y:38},{x:48,y:38},{x:48,y:50},{x:91,y:50}],
  [{x:0,y:50},{x:30,y:50},{x:30,y:62},{x:62,y:62},{x:62,y:50},{x:91,y:50}],
  [{x:0,y:80},{x:21,y:80},{x:21,y:68},{x:48,y:68},{x:48,y:62},{x:62,y:62},{x:62,y:50},{x:91,y:50}],
];
export const SITES: Point[] = [
 {x:10,y:11},{x:18,y:30},{x:30,y:11},{x:31,y:28},{x:40,y:46},{x:42,y:29},{x:55,y:29},{x:57,y:43},
 {x:10,y:40},{x:18,y:59},{x:31,y:41},{x:39,y:55},{x:52,y:54},{x:70,y:40},{x:79,y:40},{x:87,y:40},
 {x:10,y:70},{x:10,y:89},{x:20,y:89},{x:30,y:72},{x:31,y:89},{x:41,y:78},{x:52,y:78},{x:59,y:72},
 {x:70,y:60},{x:79,y:60},{x:87,y:60},
];
export type TowerType = 'bolt'|'cannon'|'frost';
export const TOWERS: Record<TowerType,{name:string; cost:number; range:number; damage:number; interval:number; color:string; description:string}> = {
 bolt:{name:'Ballista',cost:70,range:17,damage:18,interval:0.8,color:'#f8cf77',description:'Fast, reliable single-target fire.'},
 cannon:{name:'Mortar',cost:110,range:19,damage:36,interval:1.8,color:'#ff946a',description:'Heavy splash damage against groups.'},
 frost:{name:'Frost watch',cost:90,range:15,damage:7,interval:1,color:'#8ce4ff',description:'Slows enemies for two seconds.'},
};
export type Tower = {site:number; type:TowerType; level:number; cooldown:number};
export type Enemy = {id:number; route:number; distance:number; hp:number; maxHp:number; speed:number; slow:number; kind:'raider'|'runner'|'armored'};
export type Shot = {id:number; from:Point; to:Point; color:string; life:number};
export type Game = {elapsed:number; gold:number; lives:number; towers:Tower[]; enemies:Enemy[]; shots:Shot[]; nextId:number; spawnClock:number; spawned:number; kills:number; leaks:number; choices:(number|null)[]; pendingChoice:number|null; outcome:'won'|'lost'|null};
export const DURATION=900;
export const CHOICE_TIMES=[180,420,660];
export const ORDERS=[
 {title:'The first order', message:'The prefect calls the people on the north road raiders. He wants the gate sealed before anyone can get close. A scout reports families among them.', options:[{label:'Fund the towers',detail:'+100 gold now',effect:'gold'}, {label:'Send an escort',detail:'+5 gate integrity; preserve a witness',effect:'lives'}]},
 {title:'The missing convoy', message:'The prefect says the missing supply convoy was taken by the enemy. A quartermaster found its seal on a wagon inside the walls. He asks you to burn the manifest.', options:[{label:'Take his supplies',detail:'+140 gold now',effect:'gold'}, {label:'Keep the manifest',detail:'+5 gate integrity; preserve evidence',effect:'lives'}]},
 {title:'A clean report', message:'The prefect offers reinforcements if you sign his report. It names the escorted families as combatants. The quartermaster is still waiting for an answer.', options:[{label:'Sign for supplies',detail:'+180 gold now',effect:'gold'}, {label:'Refuse to sign',detail:'+5 gate integrity; preserve the truth',effect:'lives'}]},
] as const;
export function newGame():Game {return {elapsed:0,gold:240,lives:20,towers:[],enemies:[],shots:[],nextId:1,spawnClock:2,spawned:0,kills:0,leaks:0,choices:[null,null,null],pendingChoice:null,outcome:null};}
export function position(route:number,distance:number):Point {
 const path=ROUTES[route]; let d=Math.max(0,distance);
 for(let i=1;i<path.length;i++){const a=path[i-1], b=path[i], len=Math.hypot(b.x-a.x,b.y-a.y); if(d<=len) return {x:a.x+(b.x-a.x)*d/len,y:a.y+(b.y-a.y)*d/len}; d-=len;}
 return path[path.length-1];
}
export function routeLength(route:number){return ROUTES[route].slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-ROUTES[route][i].x,p.y-ROUTES[route][i].y),0);}
export function build(g:Game,site:number,type:TowerType):Game {
 const spec=TOWERS[type]; if(g.outcome||g.pendingChoice!==null||!spec||!Number.isInteger(site)||!SITES[site]||g.towers.some(t=>t.site===site)||g.gold<spec.cost)return g;
 return {...g,gold:g.gold-spec.cost,towers:[...g.towers,{site,type,level:1,cooldown:0}]};
}
export const upgradeCost=(tower:Tower)=>Math.round(TOWERS[tower.type].cost*(0.75+tower.level*.25));
export function upgrade(g:Game,site:number):Game {const t=g.towers.find(t=>t.site===site); if(!t||t.level>=3||g.gold<upgradeCost(t)||g.outcome||g.pendingChoice!==null)return g;return {...g,gold:g.gold-upgradeCost(t),towers:g.towers.map(x=>x.site===site?{...x,level:x.level+1}:x)};}
export function sell(g:Game,site:number):Game {const t=g.towers.find(t=>t.site===site);if(!t||g.outcome||g.pendingChoice!==null)return g;let spent=TOWERS[t.type].cost; for(let i=1;i<t.level;i++)spent+=upgradeCost({...t,level:i});return {...g,gold:g.gold+Math.floor(spent*.65),towers:g.towers.filter(x=>x.site!==site)};}
export function decide(g:Game,choice:number):Game {if(g.pendingChoice===null||(choice!==0&&choice!==1))return g;const i=g.pendingChoice, choices=[...g.choices];choices[i]=choice;return {...g,choices,pendingChoice:null,gold:g.gold+(choice===0?100+i*40:0),lives:g.lives+(choice===1?5:0)};}
/** Advance in small increments so spawn and firing work consistently after slow frames. */
export function tick(g:Game,dt:number):Game {
 if(g.outcome||g.pendingChoice!==null||!Number.isFinite(dt)||dt<=0)return g;
 let state=g; let remaining=Math.min(dt,1);
 while(remaining>0&&!state.outcome&&state.pendingChoice===null){const step=Math.min(.1,remaining); remaining-=step; state=stepGame(state,step);}
 return state;
}
function stepGame(g:Game,dt:number):Game {
 let elapsed=Math.min(DURATION,g.elapsed+dt), gold=g.gold,lives=g.lives,kills=g.kills,leaks=g.leaks,nextId=g.nextId,spawned=g.spawned,spawnClock=g.spawnClock-dt;
 const wave=Math.min(15,Math.floor(elapsed/60)+1);
 let enemies=g.enemies.map(e=>({...e,slow:Math.max(0,e.slow-dt),distance:e.distance+e.speed*dt*(e.slow>0?.55:1)}));
 let shots=g.shots.map(s=>({...s,life:s.life-dt})).filter(s=>s.life>0);
 if(spawnClock<=0&&elapsed<DURATION-25){const n=nextId++; spawned++; const kind=spawned%9===0?'armored':spawned%5===0?'runner':'raider';const hp=(kind==='armored'?110:kind==='runner'?42:65)*(1+(wave-1)*.12);enemies.push({id:n,route:(spawned-1)%3,distance:0,hp,maxHp:hp,speed:kind==='runner'?7.5:kind==='armored'?3.4:5,slow:0,kind});spawnClock+=Math.max(1.2,3.2-wave*.1);}
 enemies=enemies.filter(e=>{if(e.distance>=routeLength(e.route)){lives-=e.kind==='armored'?2:1;leaks++;return false;}return true;});
 const towers=g.towers.map(t=>{let cooldown=t.cooldown-dt;const spec=TOWERS[t.type];if(cooldown<=0){const origin=SITES[t.site];const candidates=enemies.filter(e=>e.hp>0&&Math.hypot(position(e.route,e.distance).x-origin.x,position(e.route,e.distance).y-origin.y)<=spec.range+(t.level-1)*1.5).sort ( (a,b)=>b.distance/routeLength(b.route)-a.distance/routeLength(a.route));const target=candidates[0];if(target){const hit=position(target.route,target.distance);const damage=spec.damage*(1+(t.level-1)*.65);for(const e of enemies){if(e.id===target.id||(t.type==='cannon'&&Math.hypot(position(e.route,e.distance).x-hit.x,position(e.route,e.distance).y-hit.y)<6)){e.hp-=damage;if(t.type==='frost')e.slow=2;}} shots.push({id:nextId++,from:origin,to:hit,color:spec.color,life:.18});cooldown=spec.interval;}}return {...t,cooldown};});
 enemies=enemies.filter(e=>{if(e.hp<=0){kills++;gold+=e.kind==='armored'?18:10;return false;}return true;});
 let pendingChoice:number|null=null;const choice=CHOICE_TIMES.findIndex((time,i)=>g.elapsed<time&&elapsed>=time&&g.choices[i]===null);if(choice>=0)pendingChoice=choice;
 const outcome=lives<=0?'lost':elapsed>=DURATION?'won':null;
 return {...g,elapsed,gold,lives,kills,leaks,nextId,spawned,spawnClock,enemies,towers,shots,pendingChoice,outcome};
}

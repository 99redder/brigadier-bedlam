import type {Soldier} from "./battle";
import {blocked,distance,legal,type Point} from "./geometry";
import type {Rect} from "./data";
export const TRAFFIC={playerSpacing:32,enemySpacing:24,warningRadius:52,crawl:.4,lookAhead:36,notice:1} as const;
const active=(s:Soldier)=>s.life==="alive"&&s.brawl===null&&s.drowningTime<=0;
export const trafficAllies=(s:Soldier,units:Soldier[])=>units.filter(t=>t.id!==s.id&&t.side===s.side&&active(t));
function segmentDistance(p:Point,a:Point,b:Point){const x=b.x-a.x,y=b.y-a.y,len=x*x+y*y,t=len?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/len)):0;return distance(p,{x:a.x+x*t,y:a.y+y*t});}
// Friendly bodies are not terrain: escape from an existing overlap is always permitted.
export function trafficMove(s:Soldier,desired:Point,units:Soldier[],obstacles:Rect[]) {
 const allies=trafficAllies(s,units),length=distance(s,desired),dx=length?(desired.x-s.x)/length:0,dy=length?(desired.y-s.y)/length:0;
 const spacing=s.side===0?TRAFFIC.playerSpacing:TRAFFIC.enemySpacing;
 const clear=(p:Point)=>legal(p,obstacles)&&!blocked(s,p,obstacles,14)&&allies.every(t=>distance(p,t)>=Math.min(spacing,distance(s,t))-.00001);
 const ahead={x:s.x+dx*TRAFFIC.lookAhead,y:s.y+dy*TRAFFIC.lookAhead};
 const crowded=allies.some(t=>distance(s,t)<spacing || (distance(s,t)<TRAFFIC.warningRadius&&distance(desired,t)<distance(s,t)&&segmentDistance(t,s,ahead)<spacing));
 if(s.side===0){
  const point=crowded?{x:s.x+(desired.x-s.x)*TRAFFIC.crawl,y:s.y+(desired.y-s.y)*TRAFFIC.crawl}:desired;
  return {point:clear(point)?point:{x:s.x,y:s.y},crowded,blocked:!clear(point)};
 }
 if(!crowded&&clear(desired))return {point:desired,crowded:false,blocked:false};
 // Try right-hand passing first. No displacement exceeds the troop's normal step.
 const angle=Math.atan2(dy,dx),candidates=[0,.65,1.05,1.57,-.65,-1.05,-1.57,2.1,-2.1,Math.PI].map(turn=>{
  const direction=angle+turn,point={x:s.x+Math.cos(direction)*length,y:s.y+Math.sin(direction)*length};
  const horizon=Math.min(24,Math.max(0,distance(s,s.path[0]??desired)-length));
  const future={x:point.x+Math.cos(direction)*horizon,y:point.y+Math.sin(direction)*horizon};
  const risk=allies.reduce((sum,t)=>sum+Math.max(0,spacing+4-segmentDistance(t,point,future)),0);
  return {point,score:risk*4+(Math.cos(turn)<-.1?35:0)+(!legal(future,obstacles)||blocked(point,future,obstacles,14)?20:0)+Math.abs(turn)*length+(turn<0?.05:0)};
 }).filter(c=>clear(c.point)).sort((a,b)=>a.score-b.score);
 return {point:candidates[0]?.point??{x:s.x,y:s.y},crowded,blocked:!candidates.length};
}
// Enemy orders reserve space at their destinations as well as during transit.
export function reserveEnemyGoal(s:Soldier,goal:Point,units:Soldier[],obstacles:Rect[]) {
 const allies=trafficAllies(s,units),free=(p:Point)=>legal(p,obstacles)&&allies.every(t=>distance(p,t)>=28&&(!t.goal||distance(p,t.goal)>=28));
 if(free(goal))return goal;
 const candidates:Point[]=[];
 for(const radius of [32,48,68])for(let i=0;i<16;i++){const p={x:goal.x+Math.cos(i*Math.PI/8)*radius,y:goal.y+Math.sin(i*Math.PI/8)*radius};if(free(p))candidates.push(p);}
 candidates.sort((a,b)=>distance(a,goal)+distance(s,a)*.15-distance(b,goal)-distance(s,b)*.15);
 return candidates[0]??goal;
}

import type {Battle,Side,Soldier} from "./battle";
import {FIELD} from "./data";
import {blocked,clamp,distance,distanceToRect,safePoint,type Point} from "./geometry";
export const MORTAR={setup:7.5,flight:1.25,interval:.85,shells:12,coverage:220,drift:320,blast:45,damage:300,coveredDamage:12,terrainDamage:20,aftermath:1.1} as const;
export const mortarDuration=MORTAR.setup+(MORTAR.shells-1)*MORTAR.interval+MORTAR.flight+MORTAR.aftermath;
export interface MortarShell {point:Point;launchAt:number;launched:boolean;impacted:boolean;}
export interface MortarStrike {id:number;side:Side;requested:Point;center:Point;pit:Point;elapsed:number;shells:MortarShell[];}
export type MortarSound="setup"|"launch"|"impact";
export const mortarOnMap=(p:Point)=>p.x>=0&&p.y>=0&&p.x<=FIELD.width&&p.y<=FIELD.height;
function scatter(b:Battle,point:Point,radius:number,bounded=true):Point {
  const angle=b.random()*Math.PI*2,reach=Math.sqrt(b.random())*radius;
  const p={x:point.x+Math.cos(angle)*reach,y:point.y+Math.sin(angle)*reach};
  return bounded?{x:clamp(p.x,18,FIELD.width-18),y:clamp(p.y,18,FIELD.height-18)}:p;
}
export function createMortar(b:Battle,side:Side,requested:Point,id:number):MortarStrike {
  const center=scatter(b,requested,MORTAR.drift);
  // Edge overshoots are genuine misses; clamping every shell onto the bank
  // concentrated a barrage on starting rows, particularly north–south fronts.
  const pit=safePoint(b.teamEdge(side,requested,46),b.dryCover());
  return {id,side,requested:{...requested},center,pit,elapsed:0,shells:Array.from({length:MORTAR.shells},(_,i)=>({point:scatter(b,center,MORTAR.coverage,false),launchAt:MORTAR.setup+i*MORTAR.interval,launched:false,impacted:false}))};
}
export function mortarImpact(b:Battle,point:Point) {
  const cover=[...b.cover];
  for(const target of b.combatants()) {
    if(target.life!=="alive"||distance(target,point)>MORTAR.blast||blocked(point,target,cover))continue;
    const covered="takingCover" in target&&target.takingCover;
    const amount=covered?Math.min(MORTAR.coveredDamage,Math.max(0,target.hp-1)):MORTAR.damage;
    if(amount>0)b.damage(target,amount,null);
  }
  // One shell chips cover; the intact snapshot still shelters its far side.
  for(const r of cover)if(distanceToRect(point,r)<=MORTAR.blast&&!blocked(point,{x:r.x+r.w/2,y:r.y+r.h/2},cover.filter(o=>o!==r)))b.damageCover(r,MORTAR.terrainDamage);
}
export function tickMortars(b:Battle,dt:number) {
  for(const strike of b.mortars) {
    strike.elapsed+=dt;
    for(const shell of strike.shells) {
      if(!shell.launched&&strike.elapsed+1e-8>=shell.launchAt){shell.launched=true;b.emitMortar("launch");}
      if(!shell.impacted&&strike.elapsed+1e-8>=shell.launchAt+MORTAR.flight){shell.impacted=true;if(mortarOnMap(shell.point)){mortarImpact(b,shell.point);b.emitMortar("impact");}}
    }
  }
  b.mortars=b.mortars.filter(m=>m.elapsed<mortarDuration);
}
export function mortarCoverOrder(b:Battle,s:Soldier,aim=true) {
  if(s.side!==1||s.life!=="alive"||s.drowningTime>0||s.brawl!==null||b.inWater(s))return false;
  // Mortar warnings are a basic survival response, independent of the later
  // cover-and-peek unlock. Hard troops recognize setup; easy troops hear firing.
  const reaction=b.operation?.mode==="hard"?1:b.operation?.mode==="medium"?2.5:b.operation?.mode==="easy"?MORTAR.setup:4.5;
  const danger=b.mortars.find(m=>m.elapsed>=reaction&&m.elapsed<mortarDuration-MORTAR.aftermath&&distance(s,m.center)<MORTAR.coverage+MORTAR.blast);
  // Do not let supply/cover plans stand a troop up between warnings.
  const sheltering=(s.mortarCoverUntil??0)>b.time&&b.mortars.some(m=>m.elapsed<mortarDuration-MORTAR.aftermath);
  if(danger||sheltering) {
    if(!s.takingCover){s.coverPlan=undefined;b.command({type:"cover",id:s.id,active:true},false);}
    if(danger)s.mortarCoverUntil=Math.max(s.mortarCoverUntil??0,b.time+mortarDuration-danger.elapsed);
    const target=aim?b.chooseTarget(s):undefined;if(target){s.target=target.id;b.aimAi(s,target);}return true;
  }
  if(s.mortarCoverUntil!==undefined&&b.time>=s.mortarCoverUntil){s.mortarCoverUntil=undefined;if(s.takingCover)b.command({type:"cover",id:s.id,active:false},false);}
  return false;
}

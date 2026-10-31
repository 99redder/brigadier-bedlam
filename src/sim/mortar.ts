import type {Battle,Side,Soldier} from "./battle";
import {FIELD} from "./data";
import {blocked,clamp,distance,distanceToRect,safePoint,type Point} from "./geometry";
export const MORTAR={setup:7.5,flight:1.25,interval:.85,shells:12,coverage:220,drift:210,blast:65,damage:300,coveredDamage:12,terrainDamage:20,aftermath:1.1} as const;
export const mortarDuration=MORTAR.setup+(MORTAR.shells-1)*MORTAR.interval+MORTAR.flight+MORTAR.aftermath;
export interface MortarShell {point:Point;launchAt:number;launched:boolean;impacted:boolean;}
export interface MortarStrike {id:number;side:Side;requested:Point;center:Point;pit:Point;elapsed:number;shells:MortarShell[];}
export type MortarSound="setup"|"launch"|"impact";
function scatter(b:Battle,point:Point,radius:number):Point {
  const angle=b.random()*Math.PI*2,reach=Math.sqrt(b.random())*radius;
  return {x:clamp(point.x+Math.cos(angle)*reach,18,FIELD.width-18),y:clamp(point.y+Math.sin(angle)*reach,18,FIELD.height-18)};
}
export function createMortar(b:Battle,side:Side,requested:Point,id:number):MortarStrike {
  const center=scatter(b,requested,MORTAR.drift);
  const pit=safePoint(b.teamEdge(side===0?1:0,requested,46),b.dryCover());
  return {id,side,requested:{...requested},center,pit,elapsed:0,shells:Array.from({length:MORTAR.shells},(_,i)=>({point:scatter(b,center,MORTAR.coverage),launchAt:MORTAR.setup+i*MORTAR.interval,launched:false,impacted:false}))};
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
      if(!shell.impacted&&strike.elapsed+1e-8>=shell.launchAt+MORTAR.flight){shell.impacted=true;mortarImpact(b,shell.point);b.emitMortar("impact");}
    }
  }
  b.mortars=b.mortars.filter(m=>m.elapsed<mortarDuration);
}
export function mortarCoverOrder(b:Battle,s:Soldier) {
  if(s.side!==1||!b.challenge?.coverTactics||s.brawl!==null||b.inWater(s))return false;
  const danger=b.mortars.find(m=>m.elapsed>=MORTAR.setup-1.5&&m.elapsed<mortarDuration-MORTAR.aftermath&&distance(s,m.center)<MORTAR.coverage+MORTAR.blast);
  if(danger) {
    if(!s.takingCover){s.coverPlan=undefined;b.command({type:"cover",id:s.id,active:true},false);s.mortarCoverUntil=b.time+mortarDuration-danger.elapsed;}
    const target=b.chooseTarget(s);if(target){s.target=target.id;b.aimAi(s,target);}return true;
  }
  if(s.mortarCoverUntil!==undefined&&b.time>=s.mortarCoverUntil){s.mortarCoverUntil=undefined;if(s.takingCover)b.command({type:"cover",id:s.id,active:false},false);}
  return false;
}

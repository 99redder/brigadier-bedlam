import type { Battle, Combatant, Soldier } from "./battle";
import { inView } from "./vision";
import { TUNING, type Rect } from "./data";
import { blocked, distance, legal, pathfind, type Point } from "./geometry";

export interface CoverPlan {
  obstacle: Rect;
  shelter: Point;
  peek: Point;
  target: number;
  targetPosition: Point;
  phase: "shelter" | "peek";
  since: number;
  arrived?: number;
  shots: number;
  progressAt: number;
  position: Point;
}
function duck(s:Soldier) {
  if(!s.takingCover) {
    s.cooldown=Math.max(0,s.cooldown)*TUNING.coverReloadMultiplier;
    s.autoFireWait=(s.autoFireWait??0)*TUNING.coverReloadMultiplier;
    s.steadyTime=0;
  }
  s.takingCover=true;s.hold=true;s.path=[];s.goal=null;s.terrainTarget=null;s.formationSpeed=undefined;
}
function travel(b:Battle,s:Soldier,point:Point) {
  s.takingCover=false;s.hold=false;s.target=null;s.terrainTarget=null;s.watchAngle=undefined;
  s.formationSpeed=undefined;b.setGoal(s,point,true);
}
function clear(s:Soldier) {s.coverPlan=undefined;s.takingCover=false;s.hold=false;s.path=[];s.goal=null;s.target=null;}
const routeLength=(start:Point,path:Point[])=>path.reduce((sum,to,i)=>sum+distance(i?path[i-1]:start,to),0);
function reserved(b:Battle,s:Soldier,p:Point) {
  return b.soldiers.some(u=>u!==s&&u.side===s.side&&u.life==="alive"&&
    (distance(u,p)<42 || (u.goal && distance(u.goal,p)<42) || (u.coverPlan && (distance(u.coverPlan.shelter,p)<48 || distance(u.coverPlan.peek,p)<42))));
}
export function findCoverPlan(b:Battle,s:Soldier,target:Combatant):CoverPlan|undefined {
  const dry=b.dryCover(),range=b.weaponRange(s);
  if(distance(s,target)>range+220)return;
  const candidates:{obstacle:Rect;shelter:Point;peek:Point;score:number}[]=[];
  for(const r of b.cover) {
    const center={x:r.x+r.w/2,y:r.y+r.h/2};
    if(distance(s,center)>280 || r.w<28 || r.h<24)continue;
    const shelters:Point[]=[];
    for(const f of [.25,.5,.75])shelters.push(
      {x:r.x-28,y:r.y+r.h*f},{x:r.x+r.w+28,y:r.y+r.h*f},
      {x:r.x+r.w*f,y:r.y-28},{x:r.x+r.w*f,y:r.y+r.h+28});
    const peeks=[{x:r.x-32,y:r.y-32},{x:r.x+r.w+32,y:r.y-32},
      {x:r.x-32,y:r.y+r.h+32},{x:r.x+r.w+32,y:r.y+r.h+32}];
    for(const shelter of shelters) {
      if(!legal(shelter,dry)||reserved(b,s,shelter)||!blocked(target,shelter,[r])||b.threatAt(s,shelter)>0)continue;
      for(const peek of peeks) {
        const d=distance(peek,target);
        if(distance(shelter,peek)>200||d>range||d<Math.min(100,b.preferredRange(s)*.45)||!legal(peek,dry)||reserved(b,s,peek)||blocked(peek,target,b.cover)||!b.safeBlast({...s,...peek},target))continue;
        // Favor a short protected approach, a useful firing distance and separate squad positions.
        candidates.push({obstacle:r,shelter,peek,score:distance(s,shelter)+distance(shelter,peek)*.8+
          Math.abs(d-b.preferredRange(s))*.3+b.threatAt(s,peek)*55+(r.indestructible?-20:0)});
      }
    }
  }
  candidates.sort((a,b)=>a.score-b.score||a.shelter.x-b.shelter.x||a.shelter.y-b.shelter.y);
  for(const c of candidates.slice(0,8)) {
    const approach=pathfind(s,c.shelter,dry),peekPath=pathfind(c.shelter,c.peek,dry);
    if(!approach.length||!peekPath.length||distance(approach.at(-1)!,c.shelter)>4||distance(peekPath.at(-1)!,c.peek)>4||routeLength(s,approach)>360||routeLength(c.shelter,peekPath)>260)continue;
    return {obstacle:{x:c.obstacle.x,y:c.obstacle.y,w:c.obstacle.w,h:c.obstacle.h},shelter:c.shelter,peek:c.peek,
      target:target.id,targetPosition:{x:target.x,y:target.y},phase:"shelter",since:b.time,shots:s.shotsFired??0,
      progressAt:b.time,position:{x:s.x,y:s.y}};
  }
}
export function coverOrder(b:Battle,s:Soldier):boolean {
  if(s.side!==1||!b.challenge?.coverTactics||s.unarmed||s.drowningTime>0||s.brawl!==null||b.inWater(s))return false;
  const target=b.chooseTarget(s);if(!target)return false;
  if(s.coverPlan) {
    const p=s.coverPlan;
    const exists=b.cover.some(r=>r.x===p.obstacle.x&&r.y===p.obstacle.y&&r.w===p.obstacle.w&&r.h===p.obstacle.h);
    const tooClose=b.soldiers.some(t=>t.side!==s.side&&t.life==="alive"&&distance(s,t)<85);
    if(!exists||target.id!==p.target||distance(target,p.targetPosition)>65||!blocked(target,p.shelter,b.cover)||blocked(p.peek,target,b.cover)||distance(p.peek,target)>b.weaponRange(s)||b.threatAt(s,p.shelter)>0||tooClose||s.burnRemaining>0||b.time-p.progressAt>10) {
      clear(s);s.nextCoverPlanAt=b.time+2;return false;
    }
    if(distance(s,p.position)>7){p.position={x:s.x,y:s.y};p.progressAt=b.time;}
    const goal=p.phase==="shelter"?p.shelter:p.peek;
    if(distance(s,goal)>16) {
      if(!s.path.length)travel(b,s,goal);
      return true;
    }
    s.path=[];s.goal=null;s.hold=true;s.target=target.id;b.aimAi(s,target);
    p.arrived??=b.time;p.progressAt=b.time;
    if(p.phase==="shelter") {
      const travelTime=distance(p.shelter,p.peek)/(b.landSpeed(s)*(b.challenge?.enemySpeed??1));
      if(b.time-p.arrived>=.9&&Math.max(s.cooldown,s.autoFireWait??0)<=travelTime+b.aimDelay(s)) {
        p.phase="peek";p.since=b.time;p.arrived=undefined;p.shots=s.shotsFired??0;travel(b,s,p.peek);
      }
    } else if((s.shotsFired??0)>p.shots && (s.cooldown>2 || (b.threatAt(s,s)>0&&b.time-p.arrived>1))) {
      p.phase="shelter";p.since=b.time;p.arrived=undefined;travel(b,s,p.shelter);
    } else if(b.time-p.arrived>7 && (s.shotsFired??0)===p.shots) {
      clear(s);s.nextCoverPlanAt=b.time+3;return false;
    }
    return true;
  }
  const threatened=b.threatAt(s,s)>0;
  // Never abandon an already safe, useful firing lane just to touch a nearby rock.
  if(b.time>=(s.nextCoverPlanAt??0) && (threatened||blocked(s,target,b.cover)||s.cooldown>2)) {
    s.nextCoverPlanAt=b.time+2;
    const plan=findCoverPlan(b,s,target);
    if(plan){s.coverPlan=plan;travel(b,s,plan.shelter);return true;}
  }
  const rifleThreat=b.soldiers.some(t=>t.side!==s.side&&t.life==="alive"&&!t.unarmed&&t.classId==="rifleman"&&distance(s,t)>100&&distance(s,t)<=b.weaponRange(t)&&inView(t,s)&&!blocked(t,s,b.cover));
  const closeThreat=b.soldiers.some(t=>t.side!==s.side&&t.life==="alive"&&distance(s,t)<95);
  if(rifleThreat&&!closeThreat&&b.canShoot(s,target)&&!["torch","sapper"].includes(s.classId)&&!s.path.length&&s.burnRemaining<=0) {
    duck(s);s.target=target.id;b.aimAi(s,target);return true;
  }
  if(s.takingCover){s.takingCover=false;s.hold=false;}
  return false;
}

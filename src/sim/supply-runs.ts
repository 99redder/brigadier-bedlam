import { mapRewardCost, mapRunnerRoleCost } from "./map-strategy";
import type { Battle, Soldier } from "./battle";
import { RUN_LIGHT } from "./comeback";
import { distance, pathfind, type Point } from "./geometry";

export interface SupplyRun {
  unitId: number;
  kind: "supply" | "chest";
  rewardId: number;
  phase: "outbound" | "return";
  started: number;
  lastProgress: number;
  position: Point;
}
// Losing one Lobber's fire support is usually cheaper than losing a rocket lane.
const roleCost = { lobber: 0, torch: 35, rifleman: 55, sapper: 80, bazooka: 130 };
export function runnerRoute(b: Battle, s: Soldier, goal: Point) {
  const routes = [false, true].flatMap(safe => {
    if (safe && (b.inWater(s) || b.inWater(goal))) return [];
    const path = pathfind(s, goal, safe ? b.dryCover() : b.cover);
    if (!path.length || distance(path.at(-1)!, goal) > 5) return [];
    let from: Point = s, cost = 0, wet = b.inWater(s);
    for (const to of path) {
      const length = distance(from, to), steps = Math.max(1, Math.ceil(length / 26));
      for (let i = 1; i <= steps; i++) {
        const point = { x: from.x + (to.x-from.x)*i/steps, y: from.y + (to.y-from.y)*i/steps };
        const water = b.inWater(point);
        cost += length/steps * (water ? 1/RUN_LIGHT.waterSpeed : 1);
        cost += b.threatAt(s, point) * length/steps * 3;
        if (water && !wet) cost += 45; // A shorter swim still carries entry risk.
        wet = water;
      }
      from = to;
    }
    return [{ path, safe, cost }];
  });
  return routes.sort((a,b) => a.cost-b.cost || Number(b.safe)-Number(a.safe))[0];
}
function order(s: Soldier, point: Point, route: NonNullable<ReturnType<typeof runnerRoute>>) {
  s.takingCover=false;s.hold=false;s.target=null;s.terrainTarget=null;s.watchAngle=undefined;
  s.formationSpeed=undefined;s.steadyTime=0;s.goal={x:point.x,y:point.y};
  s.path=route.path;s.safeRoute=route.safe;s.repath=.65;
}
function returnForGear(b: Battle, s: Soldier) {
  const gear=b.gear.find(g=>g.owner===s.id);
  const route=gear && runnerRoute(b,s,gear);
  if (!gear || !route) return false;
  s.recoveringGear=true;
  order(s,gear,route); // Exact bag position; destination reservations must not move it away.
  return true;
}

// One committed runner, evaluated on the normal AI think clock. Other troops keep fighting.
export function supplyRunOrder(b: Battle, s: Soldier): boolean {
  if(s.side!==1 || !b.challenge?.supplyRunners || b.planning || b.winner!==null)return false;
  let mission=b.enemySupplyRun;
  const runner=mission && b.get(mission.unitId);
  if(mission && (!runner || runner.life!=="alive" || runner.drowningTime>0 || !runner.unarmed)) {
    b.enemySupplyRun=null;b.nextEnemyRunAt=b.time+5;mission=null;
  }
  if(!mission && s.unarmed && b.gear.some(g=>g.owner===s.id)) {
    // A rescued runner must rearm before returning to the normal combat AI.
    if(!s.recoveringGear || !s.path.length)returnForGear(b,s);
    return true;
  }
  if(!mission && b.time>=b.nextEnemyRunAt && b.powers[1].length<2) {
    b.nextEnemyRunAt=b.time+2;
    const objectives=[
      ...b.supplies.filter(d=>d.claimedBy===null).map(d=>({...d,kind:"supply" as const,expiresAt:Infinity})),
      ...b.chests.filter(c=>c.claimedBy===null&&c.expiresAt>b.time).map(c=>({...c,kind:"chest" as const})),
    ];
    const candidates=b.soldiers.filter(u=>u.side===1&&!u.elite&&u.life==="alive"&&!u.unarmed&&!u.takingCover&&u.brawl===null&&u.drowningTime<=0&&u.burnRemaining<=0&&u.hp>=b.maxHp(u)*.75&&!b.inWater(u)&&b.threatAt(u,u)===0);
    const tasks=candidates.flatMap(unit=>objectives.flatMap(reward=>{
      if(b.threatAt(unit,reward)>0 || b.soldiers.some(t=>t.side===0&&t.life==="alive"&&distance(unit,t)<130))return [];
      const route=runnerRoute(b,unit,reward);
      if(!route || route.cost/(RUN_LIGHT.speed*(b.challenge?.enemySpeed??1))>Math.min(45,reward.expiresAt-b.time-3))return [];
      return [{unit,reward,route,score:route.cost+roleCost[unit.classId]+mapRewardCost(b,reward.id,reward.kind)+mapRunnerRoleCost(b,unit.id)}];
    })).sort((a,b)=>a.score-b.score||a.unit.id-b.unit.id||a.reward.id-b.reward.id);
    const task=tasks[0];
    if(task && b.dropGear(task.unit)) {
      mission=b.enemySupplyRun={unitId:task.unit.id,kind:task.reward.kind,rewardId:task.reward.id,phase:"outbound",started:b.time,lastProgress:b.time,position:{x:task.unit.x,y:task.unit.y}};
      order(task.unit,task.reward,task.route);
      b.note(`Enemy supply runner: ${task.unit.classId} dropped gear to race for a contested reward.`);
    }
  }
  if(!mission || mission.unitId!==s.id)return false;
  const reward=mission.kind==="supply"?b.supplies.find(d=>d.id===mission.rewardId):b.chests.find(c=>c.id===mission.rewardId&&c.expiresAt>b.time);
  if(distance(s,mission.position)>8){mission.position={x:s.x,y:s.y};mission.lastProgress=b.time;}
  const danger=s.hp<b.maxHp(s)*.45 || s.burnRemaining>0 || b.threatAt(s,s)>0 || b.soldiers.some(t=>t.side===0&&t.life==="alive"&&distance(s,t)<105) || b.strikes.some(a=>!a.impacted&&distance(s,a.point)<140);
  if(mission.phase==="outbound" && (!reward || reward.claimedBy!==null || danger || b.time-mission.started>50 || b.time-mission.lastProgress>8)) {
    mission.phase="return";s.path=[];s.goal=null;
    b.note("Enemy supply runner: returning to recover weapon and armor.");
  }
  if(mission.phase==="return") {
    if(!s.recoveringGear || !s.path.length || b.time-mission.lastProgress>8) {
      returnForGear(b,s);mission.lastProgress=b.time;
    }
  } else if(!s.path.length && reward) {
    const route=runnerRoute(b,s,reward);
    if(route)order(s,reward,route);
  }
  return true;
}

import type { Battle, Soldier } from "./battle";
import { TUNING, type ClassId } from "./data";
import { distance, legal, pathfind, type Point } from "./geometry";

export const ELITES = {
  crackshot: {
    name: "Crackshot", short: "ACE", classId: "rifleman" as ClassId,
    health: 1.2, speed: 1.35, reload: .7, spread: .35, think: .5,
    biography: 'Captain Percival “Crackshot” Peabody won every fairground shooting prize until the council banned him for bankrupting the coconut stall. His gold goggles are prescription; his medals are mostly for punctuality.',
    advice: "Fast rifle specialist with tighter aim, reinforced armor and quicker reloads. Rifle range stays unchanged. Save a sniper shot for him.",
  },
  marshal: {
    name: "Blast Marshal", short: "BLAST", classId: "bazooka" as ClassId,
    health: 1.25, speed: 1.3, reload: .8, spread: .45, think: .5,
    biography: 'Major Matilda “Blast Marshal” Muddle trained as an airport baggage handler. She can spot a falling suitcase at two hundred paces and treats incoming bombs as a particularly unreasonable luggage carousel.',
    advice: "Faster armored rocket specialist with tighter scatter and a shorter reload. Rockets still need their normal aiming time and firing arc. A sniper shot defeats even this armor.",
  },
} as const;
export type EliteId = keyof typeof ELITES;
export function eliteStats(s: Soldier) { return s.side === 1 && s.elite ? ELITES[s.elite] : undefined; }
export const eliteUnlock = (mode?: string) => mode === "easy" ? 10 : mode === "medium" ? 7 : mode === "hard" ? 5 : Infinity;
export function eliteDanger(b: Battle, s: Soldier) {
  return !!eliteStats(s) && b.strikes.some(a => !a.impacted && distance(s, a.point) < TUNING.airstrikeRadius + 18);
}

// React only to a published warning. Sprint along real, collision-checked paths;
// trapped troops, late warnings and brawling troops can still be bombed.
export function eliteEvade(b: Battle, s: Soldier): boolean {
  if (!eliteStats(s) || b.planning || s.life !== "alive" || s.brawl !== null || s.drowningTime > 0) return false;
  const pending = b.strikes.filter(a => !a.impacted);
  if (!pending.length) { s.eliteEscape = undefined; return false; }
  const danger = pending.filter(a => distance(s, a.point) < TUNING.airstrikeRadius + 18);
  if (!danger.length) {
    if (!s.eliteEscape) return false;
    // Stay outside until the warning resolves instead of resuming an unsafe attack.
    s.path=[];s.goal=null;s.target=null;s.terrainTarget=null;s.hold=true;
    return true;
  }
  if (s.eliteEscape && s.path.length && pending.every(a => distance(s.eliteEscape!,a.point) > TUNING.airstrikeRadius + 12)) return true;
  const obstacles = b.inWater(s) ? b.cover : b.dryCover();
  const routes = danger.flatMap(strike => Array.from({length:32}, (_,i) => {
    const angle = i*Math.PI/16, radius = TUNING.airstrikeRadius+22;
    const point = {x:strike.point.x+Math.cos(angle)*radius,y:strike.point.y+Math.sin(angle)*radius};
    if (!legal(point,obstacles) || pending.some(a=>distance(point,a.point)<=TUNING.airstrikeRadius+14)) return [];
    const path = pathfind(s,point,obstacles);
    if (!path.length || distance(path.at(-1)!,point)>5) return [];
    let previous:Point=s, length=0;
    for (const p of path) {length+=distance(previous,p);previous=p;}
    const crowd=b.soldiers.filter(u=>u!==s&&u.life==="alive"&&distance(u.eliteEscape??u,point)<32).length;
    return [{point,path,length,crowd}];
  }).flat()).sort((a,b)=>a.crowd-b.crowd||a.length-b.length);
  const route=routes[0];
  if (!route) {s.eliteEscape=undefined;return false;}
  s.eliteEscape=route.point;s.coverPlan=undefined;s.takingCover=false;s.recoveringGear=false;
  s.hold=false;s.target=null;s.terrainTarget=null;s.watchAngle=undefined;s.formationSpeed=undefined;
  s.goal=route.point;s.path=route.path;s.safeRoute=!b.inWater(s);s.steadyTime=0;
  return true;
}

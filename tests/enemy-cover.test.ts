import {describe,it,expect} from "vitest";
import {Battle,replayBattle} from "../src/sim/battle";
import {difficulty,type DifficultyMode} from "../src/sim/maps";
import {coverOrder,findCoverPlan} from "../src/sim/cover-tactics";
import {blocked,distance,legal} from "../src/sim/geometry";
function arena(mode:DifficultyMode="hard",level=6){
 const b=new Battle(42,0,false,0,{mapId:0,level,mode});b.aiSides=[];b.water=[];b.bridges=[];b.supplies=[];b.chestsSpawned=6;b.random=()=>.99;
 b.cover=[{x:490,y:210,w:80,h:80,hp:100,material:"rock",indestructible:true}];
 for(const s of b.soldiers){s.life="dead";s.cooldown=999;s.autoFireWait=999;s.hold=true;}
 const s=b.get(5)!,t=b.get(0)!;Object.assign(s,{life:"alive",x:610,y:250,classId:"rifleman",hp:b.maxHp(s),heading:Math.PI,steadyTime:2,cooldown:0,autoFireWait:0});
 s.hp=b.maxHp(s);Object.assign(t,{life:"alive",x:350,y:250,classId:"rifleman",hp:230,heading:0});
 return {b,s,t};
}
describe("proactive enemy cover",()=>{
 it("unlocks in all Hard stages and advanced Medium/Easy stages, keeping Original rules",()=>{
  for(let n=1;n<=10;n++){
   expect(difficulty(n,"hard").coverTactics).toBeGreaterThan(0);
   expect(difficulty(n,"medium").coverTactics>0).toBe(n>=4);
   expect(difficulty(n,"easy").coverTactics>0).toBe(n>=8);
   expect(difficulty(n).coverTactics).toBe(0);
  }
 });
 it("finds a real shielding position paired with a clear reachable firing corner",()=>{
  const {b,s,t}=arena();const p=findCoverPlan(b,s,t);expect(p).toBeDefined();
  expect(blocked(t,p!.shelter,b.cover)).toBe(true);expect(blocked(p!.peek,t,b.cover)).toBe(false);
  expect(legal(p!.shelter,b.dryCover())).toBe(true);expect(legal(p!.peek,b.dryCover())).toBe(true);
  expect(distance(p!.peek,t)).toBeLessThanOrEqual(b.weaponRange(s));
 });
 it("seeks shelter before standing still to aim, without waiting for an injury",()=>{
  const {b,s}=arena();b.ai(s);expect(s.coverPlan).toBeDefined();expect(s.path.length).toBeGreaterThan(0);expect(s.hp).toBe(b.maxHp(s));
 });
 it("uses physical cover to stop an actual shot and does not fire through its own shelter",()=>{
  const {b,s,t}=arena();coverOrder(b,s);const p=s.coverPlan!;Object.assign(s,p.shelter);s.path=[];s.goal=null;
  t.x=420;t.cooldown=0;t.autoFireWait=0;t.steadyTime=3;b.facePoint(t,s);b.fireAt(t,s,s.id);const hp=s.hp;b.resolveShot(b.shots.pop()!);expect(s.hp).toBe(hp);
  expect(b.fireAt(s,t,t.id)).toBe(false);expect(s.shotsFired??0).toBe(0);
 });
 it("actually walks to shelter, peeks, fires and returns to shelter on the normal AI clock",()=>{
  const {b,s,t}=arena();s.classId="bazooka";s.hp=b.maxHp(s);t.x=350;
  b.aiSides=[1];s.think=0;let sheltered=false,peeked=false,shot=false,returned=false;
  for(let i=0;i<1800&&t.life==="alive";i++){
   b.step();sheltered ||= s.coverPlan?.phase==="shelter";peeked ||= s.coverPlan?.phase==="peek";
   shot ||= (s.shotsFired??0)>0;returned ||= shot&&s.coverPlan?.phase==="shelter";
   if(returned)break;
  }
  expect(sheltered).toBe(true);expect(peeked).toBe(true);expect(shot).toBe(true);expect(returned).toBe(true);
 });
 it("ducks at full health against a rifle when no solid shelter is available and pays the reload penalty once",()=>{
  const {b,s,t}=arena();b.cover=[];t.x=450;s.cooldown=2;
  expect(coverOrder(b,s)).toBe(true);expect(s.takingCover).toBe(true);expect(s.cooldown).toBe(4);
  coverOrder(b,s);expect(s.cooldown).toBe(4);expect(s.hp).toBe(b.maxHp(s));
 });
 it("stands up when ducking no longer helps, including a close flanker",()=>{
  const {b,s,t}=arena();b.cover=[];t.x=450;coverOrder(b,s);expect(s.takingCover).toBe(true);
  t.x=550;coverOrder(b,s);expect(s.takingCover).toBe(false);
 });
 it("releases destroyed cover and reacts to a target that flanks the shelter",()=>{
  const {b,s,t}=arena();coverOrder(b,s);expect(s.coverPlan).toBeDefined();b.cover=[];coverOrder(b,s);expect(s.coverPlan).toBeUndefined();
  const next=arena();coverOrder(next.b,next.s);next.t.x=700;next.t.y=250;coverOrder(next.b,next.s);expect(next.s.coverPlan).toBeUndefined();
 });
 it("does not park in water or reuse a squadmate's reserved hide/peek positions",()=>{
  const {b,s,t}=arena();const plan=findCoverPlan(b,s,t)!;
  const mate=b.get(6)!;Object.assign(mate,{life:"alive",x:1000,y:400,coverPlan:plan});
  const second=findCoverPlan(b,s,t);if(second){expect(distance(second.shelter,plan.shelter)).toBeGreaterThanOrEqual(48);expect(distance(second.peek,plan.peek)).toBeGreaterThanOrEqual(42);}
  b.water=[{x:450,y:160,w:200,h:200}];expect(findCoverPlan(b,s,t)).toBeUndefined();
 });
 it("keeps an already safe firing lane instead of hiding just because an object exists",()=>{
  const {b,s,t}=arena();s.x=450;s.y=120;t.x=350;t.y=120;t.heading=Math.PI;
  expect(coverOrder(b,s)).toBe(false);expect(s.coverPlan).toBeUndefined();
 });
 it("preserves supply runners, and drops stale cover reservations when equipment is dropped",()=>{
  const {b,s}=arena();coverOrder(b,s);expect(s.coverPlan).toBeDefined();b.dropGear(s);expect(s.coverPlan).toBeUndefined();expect(coverOrder(b,s)).toBe(false);
 });
 it("never applies proactive cover to player troops, early Easy or early Medium",()=>{
  const {b,t}=arena();expect(coverOrder(b,t)).toBe(false);
  for(const mode of ["easy","medium"] as const){const a=arena(mode,1);expect(coverOrder(a.b,a.s)).toBe(false);}
 });
 it("replays physical cover orders and shots deterministically",()=>{
  const b=new Battle(13,0,false,0,{mapId:0,level:7,mode:"hard"});for(let i=0;i<1500&&b.winner===null;i++)b.step();
  const r=replayBattle(b.replay(),b.tick);expect(r.soldiers).toEqual(b.soldiers);expect(r.cover).toEqual(b.cover);expect(r.rngState).toBe(b.rngState);
 },15000);
});

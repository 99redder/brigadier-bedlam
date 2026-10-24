import {describe,it,expect} from "vitest";
import {Battle,replayBattle} from "../src/sim/battle";
import {ELITES,eliteEvade} from "../src/sim/elites";
import {MODES,difficulty,enemyBrief,type DifficultyMode} from "../src/sim/maps";
import {TUNING} from "../src/sim/data";
import {distance,blocked} from "../src/sim/geometry";
import {validHistory} from "../src/sim/campaign";
function arena(mode:DifficultyMode="hard",level=5,mapId=0) {
 const b=new Battle(64,0,false,0,{mapId,level,mode});
 b.cover=[];b.water=[];b.bridges=[];b.supplies=[];b.chestsSpawned=6;b.aiSides=[];b.random=()=>.5;
 for(const s of b.soldiers){s.life="dead";s.cooldown=999;s.autoFireWait=999;s.hold=true;}
 const elite=b.get(7)!,target=b.get(0)!;
 Object.assign(elite,{life:"alive",x:600,y:280,hp:b.maxHp(elite),cooldown:0,steadyTime:3});
 Object.assign(target,{life:"alive",x:100,y:500,cooldown:999});
 return {b,elite,target};
}
describe("enemy elite specialists",()=>{
 for(const mode of Object.keys(MODES) as DifficultyMode[])it(`${mode} always fields five, with two elites only at the prescribed milestone`,()=>{
  const unlock={easy:10,medium:7,hard:5}[mode];
  for(let level=1;level<=10;level++)for(const mapId of [0,7,9]){
   const b=new Battle(1,0,false,10,{mapId,level,mode});
   expect(b.soldiers.filter(s=>s.side===1)).toHaveLength(5);
   expect(b.soldiers.filter(s=>s.side===0)).toHaveLength(5);
   expect(b.soldiers.filter(s=>s.elite)).toHaveLength(level>=unlock?2:0);
   expect(difficulty(level,mode).elites).toBe(level>=unlock);
   for(const s of b.soldiers.filter(s=>s.elite)){expect(s.side).toBe(1);expect(s.classId).toBe(ELITES[s.elite!].classId);expect(s.hp).toBe(b.maxHp(s));}
   const start=b.soldiers.map(s=>({x:s.x,y:s.y}));b.step();expect(b.soldiers.map(s=>({x:s.x,y:s.y}))).toEqual(start);
  }
 });
 it("announces elites in intel and leaves boot camp empty",()=>{
  expect(enemyBrief(5,"hard")).toContain("Crackshot & Blast Marshal");
  expect(enemyBrief(4,"hard")).not.toContain("ELITES");
  expect(new Battle(1,0,true).soldiers.every(s=>s.side===0&&!s.elite)).toBe(true);
 });
 for(const id of [6,7])it(`gives specialist ${id} actual faster movement, tighter shots and shorter reloads without extra range`,()=>{
  const {b,target}=arena();const s=b.get(id)!;
  Object.assign(s,{life:"alive",x:600,y:280,hp:b.maxHp(s),cooldown:0,steadyTime:3});
  Object.assign(target,{x:450,y:280});b.facePoint(s,target);b.random=()=>.99;
  const hp=b.maxHp(s),speed=b.landSpeed(s),range=b.weaponRange(s);
  expect(b.fireAt(s,target,target.id)).toBe(true);const reload=s.cooldown,shot=b.shots.pop()!;
  const error=distance(shot.to,target);s.elite=undefined;s.cooldown=0;
  expect(b.fireAt(s,target,target.id)).toBe(true);const regular=b.shots.pop()!;
  expect(hp).toBeGreaterThan(b.maxHp(s));expect(speed).toBeGreaterThan(b.landSpeed(s));
  expect(reload).toBeLessThan(s.cooldown);expect(error).toBeLessThan(distance(regular.to,target));expect(range).toBe(b.weaponRange(s));
  s.elite=id===6?"marshal":"crackshot";s.cooldown=0;s.path=[{x:590,y:280}];expect(b.fireAt(s,target,target.id)).toBe(false);
  s.path=[];b.setHeading(s,0);expect(b.fireAt(s,target,target.id)).toBe(false);
 });
 for(const [mode,level,mapId] of [["easy",10,0],["medium",7,0],["hard",5,0],["hard",5,9]] as const)
 for(const id of [6,7])it(`${mode} stage ${level} map ${mapId} specialist ${id} escapes an actual center-hit airstrike`,()=>{
  const {b,elite}=arena(mode,level,mapId),s=b.get(id)!;elite.life="dead";
  Object.assign(s,{life:"alive",x:600,y:280,hp:b.maxHp(s),cooldown:999,think:999,takingCover:true});
  b.aiSides=[1];const before={x:s.x,y:s.y};
  b.strikes.push({id:0,side:0,point:before,requested:before,accuracy:"near",remaining:TUNING.airstrikeWarning,impacted:false,dropped:false});
  const positions=[];
  for(let i=0;i<Math.ceil((TUNING.airstrikeWarning+.15)/TUNING.step);i++){
   const prev={x:s.x,y:s.y};b.step();positions.push(distance(prev,s));
  }
  expect(s.life).toBe("alive");expect(distance(s,before)).toBeGreaterThan(TUNING.airstrikeRadius);
  expect(Math.max(...positions)).toBeLessThan(3);expect(s.takingCover).toBe(false);
 });
 it("cannot anticipate a warning before it exists and clears escape after impact",()=>{
  const {b,elite}=arena();expect(eliteEvade(b,elite)).toBe(false);expect(elite.eliteEscape).toBeUndefined();
  b.strikes.push({id:1,side:0,point:{...elite},requested:{...elite},accuracy:"near",remaining:4.5,impacted:false,dropped:false});
  expect(eliteEvade(b,elite)).toBe(true);const goal=elite.goal!;
  Object.assign(elite,goal);elite.path=[];elite.think=0;expect(eliteEvade(b,elite)).toBe(true);expect(elite.hold).toBe(true);
  b.strikes[0].impacted=true;expect(eliteEvade(b,elite)).toBe(false);expect(elite.eliteEscape).toBeUndefined();
 });
 it("uses a real route around cover and avoids overlapping strike zones",()=>{
  const {b,elite}=arena();b.cover=[{x:460,y:220,w:80,h:120,hp:100}];
  for(const [id,x] of [[1,600],[2,725]])b.strikes.push({id,side:0,point:{x,y:280},requested:{x,y:280},accuracy:"near",remaining:4.5,impacted:false,dropped:false});
  expect(eliteEvade(b,elite)).toBe(true);let from=elite as {x:number;y:number};
  for(const point of elite.path){expect(blocked(from,point,b.cover,13)).toBe(false);from=point;}
  for(const strike of b.strikes)expect(distance(elite.goal!,strike.point)).toBeGreaterThan(TUNING.airstrikeRadius);
 });
 it("does not grant bomb immunity to a trapped or brawling elite",()=>{
  const {b,elite}=arena();elite.brawl=0;b.strikes.push({id:1,side:0,point:{...elite},requested:{...elite},accuracy:"near",remaining:.01,impacted:false,dropped:false});
  expect(eliteEvade(b,elite)).toBe(false);b.tickSupers(.02);expect(elite.life).not.toBe("alive");
 });
 for(const id of [6,7])it(`a sniper immediately kills elite ${id} through armor and cover`,()=>{
  const {b,elite}=arena();elite.life="dead";const s=b.get(id)!;s.life="alive";s.hp=b.maxHp(s);
  b.cover=[{x:450,y:0,w:60,h:560,indestructible:true}];b.powers[0]=["sniper"];
  expect(b.useSuper(0,"sniper",s)).toBe(true);expect(s.life).not.toBe("alive");expect(s.hp).toBeLessThanOrEqual(0);expect(b.powers[0]).toEqual([]);
 });
 it("keeps elites armed while a regular soldier runs for supplies",()=>{
  const b=new Battle(42,0,false,0,{mapId:0,level:7,mode:"hard"});b.cover=[];b.water=[];
  b.supplies=[{id:0,x:600,y:280,label:"CONTESTED",claimedBy:null}];b.ai(b.get(5)!);
  expect(b.enemySupplyRun).not.toBeNull();expect(b.get(b.enemySupplyRun!.unitId)!.elite).toBeUndefined();expect(b.soldiers.filter(s=>s.elite).every(s=>!s.unarmed)).toBe(true);
 });
 it("preserves new five-enemy scores and historical early-round results",()=>{
  const result={mapId:0,level:1,mode:"hard" as const,won:true,seconds:60,enemiesDefeated:5,survivors:4};
  expect(validHistory([result])).toBe(true);expect(validHistory([{...result,enemiesDefeated:3}])).toBe(true);
  expect(validHistory([{...result,enemiesDefeated:4}])).toBe(false);expect(validHistory([{...result,enemiesDefeated:6}])).toBe(false);
 });
 it("replays elite movement and tactical decisions deterministically",()=>{
  const b=new Battle(71,0,false,1,{mapId:9,level:7,mode:"hard"});
  for(let i=0;i<900&&b.winner===null;i++)b.step();const r=replayBattle(b.replay(),b.tick);
  expect(r.soldiers).toEqual(b.soldiers);expect(r.rngState).toBe(b.rngState);expect(b.commands).toEqual([]);
 });
});

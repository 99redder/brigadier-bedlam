import {describe,it,expect} from "vitest";
import {Battle,replayBattle} from "../src/sim/battle";
import {difficulty,MODES,enemyBrief,type DifficultyMode} from "../src/sim/maps";
import {roundScore,validHistory,newCampaign,type RoundResult} from "../src/sim/campaign";
import {distance} from "../src/sim/geometry";
const modes=Object.keys(MODES) as DifficultyMode[];
function arena(mode:DifficultyMode="hard",level=10){
 const b=new Battle(42,0,false,0,{mapId:0,level,mode});b.cover=[];b.water=[];b.supplies=[];b.chestsSpawned=6;b.aiSides=[];
 b.soldiers.forEach(s=>{s.life="dead";s.cooldown=999;s.hold=true;});
 const enemy=b.get(5)!,target=b.get(0)!;
 Object.assign(enemy,{life:"alive",x:600,y:250,classId:"rifleman",hp:100,target:null,path:[],goal:null,steadyTime:2,cooldown:0,autoFireWait:0});
 Object.assign(target,{life:"alive",x:450,y:250,classId:"rifleman",hp:230,facing:1,heading:0});
 return {b,enemy,target};
}
describe("campaign difficulty modes",()=>{
 for(const mode of modes)it(`${mode} gets stronger every stage without accelerating player troops`,()=>{
  for(let level=1;level<10;level++){
   const a=difficulty(level,mode),z=difficulty(level+1,mode);
   expect(z.enemyHealth).toBeGreaterThan(a.enemyHealth);expect(z.enemyReload).toBeLessThan(a.enemyReload);
   expect(z.enemyThink).toBeLessThan(a.enemyThink);expect(z.tactics).toBeGreaterThanOrEqual(a.tactics);
  }
  const first=new Battle(42,0,false,0,{mapId:0,level:1,mode}),last=new Battle(42,0,false,0,{mapId:0,level:10,mode});
  expect(first.soldiers.filter(s=>s.side===1)).toHaveLength(3);expect(last.soldiers.filter(s=>s.side===1)).toHaveLength(5);
  expect(first.maxHp(first.get(0)!)).toBe(last.maxHp(last.get(0)!));expect(last.landSpeed(last.get(0)!)).toBe(first.landSpeed(first.get(0)!));
 });
 it("unlocks tactical assistance earlier on harder modes",()=>{
  expect([1,3,5,7,9].map(n=>difficulty(n,"medium").tactics)).toEqual([0,1,2,3,4]);
  expect([1,3,5,7].map(n=>difficulty(n,"hard").tactics)).toEqual([1,2,3,4]);
  expect([1,5,9].map(n=>difficulty(n,"easy").tactics)).toEqual([0,1,2]);
  for(let n=1;n<=10;n++){expect(difficulty(n,"hard").enemyHealth).toBeGreaterThan(difficulty(n,"medium").enemyHealth);expect(difficulty(n,"medium").enemyHealth).toBeGreaterThan(difficulty(n,"easy").enemyHealth);}
  expect(enemyBrief(10,"hard")).toContain("cover demolition");
 });
 it("keeps original tours compatible and rejects invalid modes",()=>{
  expect(difficulty(10).enemyHealth).toBeCloseTo(1.225);expect(difficulty(10).tactics).toBe(0);
  expect(()=>new Battle(42,0,false,0,{mapId:0,level:1,mode:"bogus" as DifficultyMode})).toThrow();
  expect(newCampaign(42).mode).toBe("medium");
 });
 it("multiplies mode scores and forbids switching during a scored tour",()=>{
  const r:RoundResult={mapId:0,level:1,won:true,seconds:60,enemiesDefeated:3,survivors:5};
  expect(modes.map(mode=>roundScore({...r,mode}))).toEqual([2430,3645,4860]);
  expect(validHistory([r])).toBe(true);expect(validHistory([{...r,mode:"hard"}])).toBe(true);
  expect(validHistory([{...r,mode:"hard"},{...r,mapId:1,level:2,enemiesDefeated:4,mode:"easy"}])).toBe(false);
  expect(validHistory([{...r,mode:"bogus"}])).toBe(false);
 });
 it("uses heavy late squads and substitutes rain-appropriate weapons",()=>{
  const b=new Battle(42,0,false,0,{mapId:7,level:10,mode:"medium"});
  expect(b.soldiers.filter(s=>s.side===1&&s.classId==="bazooka")).toHaveLength(2);
  expect(b.soldiers.some(s=>s.side===1&&s.classId==="torch")).toBe(false);
 });
});
describe("enemy tactical assistance in battle",()=>{
 it("focuses a teammate's target rather than spreading every shot",()=>{
  const {b,enemy,target}=arena();target.x=400;target.hp=200;
  const other=b.get(1)!;Object.assign(other,{life:"alive",x:400,y:300,hp:200});
  const mate=b.get(6)!;Object.assign(mate,{life:"alive",x:650,y:250,target:other.id});
  expect(b.chooseTarget(enemy)?.id).toBe(other.id);
 });
 it("takes defensive cover against rifle lanes, retaining its reload penalty",()=>{
  const {b,enemy}=arena();enemy.hp=b.maxHp(enemy)*.5;enemy.cooldown=2;
  expect(b.assistedOrder(enemy)).toBe(true);expect(enemy.takingCover).toBe(true);expect(enemy.cooldown).toBe(4);
  b.assistedOrder(enemy);expect(enemy.cooldown).toBe(4);expect(enemy.path).toEqual([]);
 });
 it("reacts to visible bomb warnings with a normal movement order",()=>{
  const {b,enemy}=arena();b.random=()=>0;b.powers[0]=["airstrike"];b.useSuper(0,"airstrike",enemy);
  expect(b.assistedOrder(enemy)).toBe(true);expect(enemy.goal).not.toBeNull();expect(distance(enemy.goal!,b.strikes[0].point)).toBeGreaterThan(105);
  const before={x:enemy.x,y:enemy.y};b.step();expect(distance(enemy,before)).toBeGreaterThan(0);expect(distance(enemy,before)).toBeLessThan(2);
 });
 it("orders rockets to breach cover without shooting through it",()=>{
  const {b,enemy,target}=arena();enemy.classId="bazooka";enemy.hp=b.maxHp(enemy);target.x=350;
  b.cover=[{x:450,y:200,w:65,h:100,material:"rock",hp:100}];
  expect(b.assistedOrder(enemy)).toBe(true);expect(enemy.terrainTarget).not.toBeNull();expect(enemy.target).toBeNull();
  enemy.steadyTime=2;for(let i=0;i<60;i++)b.step();expect(b.stats.shots).toBeGreaterThan(0);expect(target.hp).toBe(230);
 });
 it("clears stale demolition orders when the safe firing solution disappears",()=>{
  const {b,enemy,target}=arena();enemy.classId="bazooka";target.x=350;
  b.cover=[{x:450,y:200,w:65,h:100,material:"rock",hp:100}];b.assistedOrder(enemy);expect(enemy.terrainTarget).not.toBeNull();
  b.cover=[];b.ai(enemy);expect(enemy.terrainTarget).toBeNull();expect(enemy.target).toBe(target.id);
 });
 it("does not strand a swimmer with a dry-only chest route",()=>{
  const {b,enemy}=arena();b.water=[{x:570,y:200,w:60,h:100}];b.chests=[{id:1,x:750,y:350,expiresAt:45,claimedBy:null}];
  enemy.wasInWater=true;b.ai(enemy);expect(enemy.goal).not.toBeNull();expect(enemy.goal).not.toEqual({x:750,y:350});expect(enemy.path.length).toBeGreaterThan(0);
 });
 it("routes around permanent cover instead of assigning a futile demolition order",()=>{
  const {b,enemy,target}=arena();enemy.classId="bazooka";target.x=350;
  b.cover=[{x:450,y:200,w:65,h:100,material:"rock",hp:100,indestructible:true}];
  b.ai(enemy);expect(enemy.terrainTarget).toBeNull();expect(enemy.path.length).toBeGreaterThan(0);
 });
 it("grants faster volleys only after their tactical unlock and respects reloads",()=>{
  const waits:number[]=[];
  for(const level of [1,10]){const {b,enemy,target}=arena("medium",level);b.facePoint(enemy,target);enemy.steadyTime=2;b.fireAt(enemy,target,target.id);waits.push((enemy.autoFireWait??0)/enemy.cooldown);expect(b.fireAt(enemy,target,target.id)).toBe(false);}
  expect(waits[1]).toBeLessThan(waits[0]);
 });
 it("does not give tactical assistance to player soldiers or legacy tours",()=>{
  const {b,enemy,target}=arena();expect(b.assistedOrder(target)).toBe(false);
  const old=new Battle(42,0,false,0,{mapId:0,level:10});expect(old.assistedOrder(old.get(5)!)).toBe(false);
  const low=arena("easy",1);expect(low.b.assistedOrder(low.enemy)).toBe(false);
 });
 it("replays assisted AI decisions without injecting duplicate user commands",()=>{
  const b=new Battle(38,0,false,0,{mapId:0,level:10,mode:"hard"});
  b.aiSides=[0,1];for(let i=0;i<3600&&b.winner===null;i++)b.step();const replay=replayBattle(b.replay(),b.tick);
  expect(replay.soldiers).toEqual(b.soldiers);expect(replay.rngState).toEqual(b.rngState);expect(b.commands).toHaveLength(0);
 },20000);
});

import {describe,it,expect} from "vitest";
import {Battle,replayBattle} from "../src/sim/battle";
import {difficulty,type DifficultyMode} from "../src/sim/maps";
import {centeredRoll} from "../src/sim/luck";
import {scatterAirstrike} from "../src/sim/airstrike";
import {CLASSES,TUNING} from "../src/sim/data";
import {distance} from "../src/sim/geometry";
function rng(seed=1){let s=seed;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
function arena(mode:DifficultyMode="hard",level=10){
 const b=new Battle(42,0,false,0,{mapId:0,level,mode});b.aiSides=[];b.cover=[];b.water=[];b.supplies=[];b.chestsSpawned=6;
 b.soldiers.forEach(s=>{s.life="dead";s.cooldown=999;s.hold=true;});
 const s=b.get(5)!,t=b.get(0)!;Object.assign(s,{life:"alive",classId:"rifleman",hp:200,x:500,y:250,heading:Math.PI,steadyTime:3,cooldown:0,autoFireWait:0});
 Object.assign(t,{life:"alive",classId:"rifleman",hp:230,x:350,y:250});return {b,s,t};
}
describe("progressive enemy fortune",()=>{
 it("rises at each stage and each difficulty, leaving Original and player odds unchanged",()=>{
  for(const mode of ["easy","medium","hard"] as const)for(let level=1;level<10;level++)expect(difficulty(level+1,mode).fortune).toBeGreaterThan(difficulty(level,mode).fortune);
  for(let level=1;level<=10;level++){expect(difficulty(level,"hard").fortune).toBeGreaterThan(difficulty(level,"medium").fortune);expect(difficulty(level,"medium").fortune).toBeGreaterThan(difficulty(level,"easy").fortune);}
  expect(difficulty(10).fortune).toBe(0);const {b}=arena();expect(b.fortune(0)).toBe(0);expect(b.fortune(1)).toBe(1);
 });
 it("centers lucky scatter statistically rather than teleporting a missed shot",()=>{
  const means=[0,1].map(luck=>{const random=rng();let sum=0;for(let i=0;i<10000;i++)sum+=Math.abs(centeredRoll(random,luck));return sum/10000;});
  expect(means[0]).toBeCloseTo(.5,1);expect(means[1]).toBeLessThan(means[0]*.6);
 });
 it("makes actual late Hard rockets much tighter while retaining nonzero scatter",()=>{
  const errors:number[]=[];
  for(const level of [1,10]){const {b,s,t}=arena("hard",level);s.classId="bazooka";t.x=200;b.random=rng(9);let sum=0;
   for(let i=0;i<400;i++){s.cooldown=0;s.autoFireWait=0;s.steadyTime=3;expect(b.fireAt(s,t,t.id)).toBe(true);sum+=distance(b.shots.pop()!.to,t);}errors.push(sum/400);
  }
  expect(errors[1]).toBeLessThan(errors[0]*.45);expect(errors[1]).toBeGreaterThan(1);
 });
 it("stamps critical damage on the projectile and never changes a player shot",()=>{
  const {b,s,t}=arena();b.random=()=>.5;
  b.random=()=>.1;
  b.fireAt(s,t,t.id);const shot=b.shots.pop()!;
  expect(shot.critical).toBe(true);expect(shot.damageScale).toBe(2.625);b.resolveShot(shot);expect(t.hp).toBeCloseTo(230-18*2.625);
  t.cooldown=0;t.heading=0;t.steadyTime=3;t.autoFireWait=0;b.random=()=>.5;b.fireAt(t,s,s.id);const player=b.shots.pop()!;expect(player.damageScale).toBe(1);expect(player.critical).toBe(false);
 });
 it("keeps permanent cover protective even against critical explosives",()=>{
  const {b,s,t}=arena();s.classId="bazooka";b.cover=[{x:400,y:220,w:45,h:60,material:"rock",hp:100,indestructible:true}];b.random=()=>.5;
  b.fireAt(s,t,t.id);const shot=b.shots.pop()!;shot.damageScale=2.625;shot.critical=true;b.resolveShot(shot);expect(t.hp).toBe(230);expect(b.cover[0].hp).toBe(100);
 });
 it("offers faster lucky reloads and fewer jams without bypassing cooldowns",()=>{
  const {b,s,t}=arena();b.random=()=>.9;b.fireAt(s,t,t.id);expect(s.cooldown).toBeCloseTo(CLASSES.rifleman.cooldown*difficulty(10,"hard").enemyReload*(1-.9*.35));expect(b.fireAt(s,t,t.id)).toBe(false);
  const a=arena();a.b.random=()=>.02;a.b.fireAt(a.s,a.t,a.t.id);expect(a.s.jam).toBe(0);
  const player=a.t;player.heading=0;player.steadyTime=3;player.cooldown=0;a.b.fireAt(player,a.s,a.s.id);expect(player.jam).toBe(TUNING.jamDuration);
 });
 it("reduces enemy river risk without giving immunity or helping the player",()=>{
  const {b,s,t}=arena();b.water=[{x:300,y:200,w:250,h:120}];s.classId="bazooka";t.classId="bazooka";b.random=()=>.2;
  b.updateWater(s);b.updateWater(t);expect(s.drowningTime).toBe(0);expect(t.drowningTime).toBeGreaterThan(0);
  s.wasInWater=false;b.random=()=>.05;b.updateWater(s);expect(s.drowningTime).toBeGreaterThan(0);
 });
 it("improves enemy airstrike odds by mode/stage and preserves player scatter",()=>{
  const rates=[0,1].map(luck=>{const random=rng();let near=0,wild=0;for(let i=0;i<10000;i++){const s=scatterAirstrike({x:550,y:280},random,luck);if(s.accuracy==="near")near++;if(s.accuracy==="wild")wild++;}return {near:near/10000,wild:wild/10000};});
  expect(rates[0].near).toBeCloseTo(.25,1);expect(rates[1].near).toBeCloseTo(.75,1);expect(rates[1].wild).toBeCloseTo(.05,1);
  const points=[];for(const side of [0,1] as const){const {b}=arena();b.random=()=>.5;b.powers[side]=["airstrike"];b.useSuper(side,"airstrike",{x:550,y:280});points.push(distance(b.strikes[0].point,{x:550,y:280}));}
  expect(points[0]).toBe(130);expect(points[1]).toBeLessThan(20);
 });
 it("keeps a firing opportunity instead of abandoning it for a chest",()=>{
  const {b,s,t}=arena();b.chests=[{id:0,x:650,y:400,expiresAt:45,claimedBy:null}];b.ai(s);expect(s.target).toBe(t.id);expect(s.goal).toBeNull();expect(s.path).toEqual([]);
 });
 it("can finish aiming and fire against a target that keeps moving within its arc",()=>{
  const {b,s,t}=arena();s.classId="bazooka";s.steadyTime=0;b.aiSides=[1];b.random=()=>.5;
  for(let i=0;i<90;i++){t.y=250+Math.sin(i/12)*22;b.step();}
  expect(b.stats.shots).toBeGreaterThan(0);
 });
 it("fields three rocket troops on late Hard stages",()=>{const b=new Battle(42,0,false,0,{mapId:0,level:5,mode:"hard"});expect(b.soldiers.filter(s=>s.side===1&&s.classId==="bazooka")).toHaveLength(3);});
});

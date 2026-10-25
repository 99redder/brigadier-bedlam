import {describe,it,expect} from "vitest";
import {Battle} from "../src/sim/battle";
import {CLASSES,TUNING,type ClassId} from "../src/sim/data";
function fixture(id:ClassId){
 const b=new Battle(42);b.aiSides=[];b.cover=[];b.water=[];b.supplies=[];b.chestsSpawned=6;b.random=()=>.5;
 for(const s of b.soldiers){s.life="dead";s.hold=true;s.cooldown=999;s.autoFireWait=999;}
 const a=b.get(0)!,t=b.get(5)!;
 Object.assign(a,{life:"alive",classId:id,x:200,y:250,heading:0,cooldown:0,steadyTime:3,hp:CLASSES[id].hp});
 Object.assign(t,{life:"alive",classId:"bazooka",x:id==="sapper"?290:580,y:250,hp:330});
 return {b,a,t};
}
describe("rocket speed and close-range dynamite payoff",()=>{
 it("delivers a full-range rocket within a quarter second through actual simulation ticks",()=>{
  const {b,a,t}=fixture("bazooka");expect(b.fire(a,t)).toBe(true);
  expect(b.shots[0].duration).toBeLessThan(.25);
  for(let i=0;i<8;i++)b.step();expect(t.life).toBe("dead");expect(b.shots).toEqual([]);
 });
 it("scales rocket travel with distance instead of making every shot float equally slowly",()=>{
  const {b,a,t}=fixture("bazooka");t.x=300;b.fire(a,t);const near=b.shots.pop()!.duration;
  a.cooldown=0;t.x=580;b.fire(a,t);expect(b.shots[0].duration).toBeGreaterThan(near*3);
  expect(b.shots[0].duration).toBeLessThan(.3);
 });
 it("still intercepts fast rockets at solid cover",()=>{
  const {b,a,t}=fixture("bazooka");b.cover=[{x:400,y:200,w:40,h:100,hp:100}];
  b.fire(a,t);for(let i=0;i<10;i++)b.step();expect(t.hp).toBe(330);expect(b.cover[0].hp).toBe(60);
 });
 it("gives close dynamite a lethal cluster payoff wider than a grenade while the thrower survives at sensible spacing",()=>{
  const {b,a,t}=fixture("sapper"),second=b.get(6)!,third=b.get(7)!;
  Object.assign(second,{life:"alive",x:290,y:310,hp:9999});Object.assign(third,{life:"alive",x:290,y:322.1,hp:9999});
  expect(b.safeBlast(a,t)).toBe(true);expect(b.fire(a,t)).toBe(true);
  for(let i=0;i<14;i++)b.step();
  expect(t.life).toBe("dead");expect(second.life).toBe("dead");expect(third.life).toBe("alive");expect(a.life).toBe("alive");
 });
 it("catches an enemy moving away from the toss point instead of needing a direct hit",()=>{
  const {b,a,t}=fixture("sapper");b.fire(a,t);
  b.command({type:"move",id:t.id,point:{x:500,y:250}});
  for(let i=0;i<14;i++)b.step();expect(t.x).toBeGreaterThan(290);expect(t.life).toBe("dead");expect(a.life).toBe("alive");
 });
 it("falls back from an impossible AI bridge preference without overriding an explicit safe order",()=>{
  const {b,a}=fixture("sapper");b.aiSides=[0];b.water=[{x:450,y:0,w:80,h:560}];b.bridges=[];
  b.setGoal(a,{x:800,y:250});expect(a.path.length).toBeGreaterThan(0);expect(a.safeRoute).toBe(false);
  b.setGoal(a,{x:800,y:250},true);expect(a.path).toEqual([]);expect(a.safeRoute).toBe(true);
 });
 it("retains the grenade's long-range moderate damage role",()=>{
  const {b,a,t}=fixture("lobber");t.x=500;
  expect(b.fire(a,t)).toBe(true);b.resolveShot(b.shots.pop()!);
  expect(t.hp).toBe(215);expect(t.life).toBe("alive");
  expect(CLASSES.lobber.range).toBeGreaterThan(CLASSES.sapper.range*3);
  expect(CLASSES.sapper.radius).toBeGreaterThan(CLASSES.lobber.radius);
  expect(CLASSES.sapper.preferred).toBeGreaterThan(CLASSES.sapper.radius+10);
 });
 it("still allows blast friendly fire and cover to defeat a dynamite attack",()=>{
  const {b,a,t}=fixture("sapper");b.cover=[{x:255,y:200,w:20,h:100,hp:100}];
  b.fire(a,t);b.resolveShot(b.shots.pop()!);
  expect(t.life).toBe("alive");expect(b.cover).toEqual([]);
  // The larger blast remains dangerous to a thrower standing beside the impact.
  expect(a.life).toBe("dead");
 });
});

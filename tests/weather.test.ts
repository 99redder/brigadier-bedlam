import { describe,expect,it } from "vitest";
import { Battle,replayBattle } from "../src/sim/battle";
import { CLASSES,TUNING,type ClassId } from "../src/sim/data";
import { RAIN,SNOW_SPEED } from "../src/sim/weather";
import { distance } from "../src/sim/geometry";
function fixture(mapId:number,id:ClassId="torch",side:0|1=0){
 const b=new Battle(42,0,false,0,{mapId,level:1});b.aiSides=[];b.cover=[];b.water=[];b.bridges=[];b.supplies=[];b.random=()=>.5;
 b.soldiers.forEach(s=>{s.life="dead";s.cooldown=999;s.hold=true;s.autoFireWait=999;});
 const a=b.get(0)!,t=b.get(5)!;
 Object.assign(a,{life:"alive",side,classId:id,x:200,y:250,heading:0,cooldown:0,steadyTime:2});
 Object.assign(t,{life:"alive",side:side===0?1:0,x:270,y:250,hp:230});
 b.command({type:"select",id:a.id});return {b,a,t};
}
const advance=(b:Battle,seconds:number)=>{for(let i=0;i<Math.ceil(seconds/TUNING.step);i++)b.step();};
describe("rain combat",()=>{
 for(const side of [0,1] as const)it(`weakens side ${side}'s actual flame hit and ongoing burn`,()=>{
  const totals:number[]=[];
  for(const mapId of [0,7]){
   const {b,a,t}=fixture(mapId,"torch",side);expect(b.fire(a,t)).toBe(true);b.resolveShot(b.shots.pop()!);
   expect(230-t.hp).toBe(mapId===7?6:12);expect(t.burnRemaining).toBe(mapId===7?3:8);
   b.tickBurn(t,8);totals.push(230-t.hp);
   expect(t.life).toBe(mapId===7?"alive":"dead");expect(t.burnRemaining).toBe(0);
  }
  expect(totals[1]).toBeCloseTo(58.5);expect(totals[1]).toBeLessThan(totals[0]/3);
 });
 it("shortens automatic and manual range, without changing other classes",()=>{
  const {b,a,t}=fixture(7);t.x=300;
  expect(b.weaponRange(a)).toBe(84);expect(b.canShoot(a,t)).toBe(false);
  expect(b.aimTorch(a,{x:600,y:250})).toBe(true);
  expect(distance(b.shots[0].from,b.shots[0].to)).toBeCloseTo(84);
  b.resolveShot(b.shots.pop()!);expect(t.hp).toBe(230);expect(t.burnRemaining).toBe(0);
  for(const id of ["rifleman","bazooka","lobber","sapper"] as const){a.classId=id;expect(b.weaponRange(a)).toBe(CLASSES[id].range);}
 });
 it("uses the same rain penalties for manual bursts and preserves heat/reload",()=>{
  const {b,a,t}=fixture(7);expect(b.aimTorch(a,t)).toBe(true);b.resolveShot(b.shots.pop()!);
  expect(t.hp).toBe(224);expect(t.burnRemaining).toBe(RAIN.burnDuration);
  expect(a.heat).toBe(TUNING.flameBurstHeat);expect(a.cooldown).toBe(CLASSES.torch.cooldown);
  t.burnRemaining=1;a.cooldown=0;b.aimTorch(a,t);b.resolveShot(b.shots.pop()!);expect(t.burnRemaining).toBe(3);
 });
});
describe("deep snow movement",()=>{
 for(const id of Object.keys(CLASSES) as ClassId[])for(const side of [0,1] as const)
 it(`slows ${id} on side ${side} in the actual movement simulation`,()=>{
  const moved:number[]=[];
  for(const mapId of [0,9]){
   const {b,a,t}=fixture(mapId,id,side);t.x=1000;a.cooldown=999;
   b.command({type:"move",id:a.id,point:{x:400,y:250}});advance(b,1);moved.push(a.x-200);
  }
  expect(moved[1]/moved[0]).toBeCloseTo(SNOW_SPEED[id],3);
 });
 it("makes heavy units suffer most but preserves bridge and water movement rules",()=>{
  const {b,a}=fixture(9,"bazooka");expect(b.movementMultiplier(a)).toBe(.55);
  b.bridges=[{x:180,y:230,w:160,h:50}];expect(b.movementMultiplier(a)).toBe(1);
  b.bridges=[];b.water=[{x:180,y:230,w:160,h:50}];expect(b.movementMultiplier(a)).toBe(1);
  expect(SNOW_SPEED.bazooka).toBeLessThan(SNOW_SPEED.torch);expect(SNOW_SPEED.torch).toBeLessThan(SNOW_SPEED.rifleman);
 });
 it("accounts for snow when coordinating a squad formation",()=>{
  const b=new Battle(42,0,false,0,{mapId:9,level:1});b.aiSides=[];b.cover=[];b.water=[];b.bridges=[];
  b.soldiers.forEach(s=>{s.cooldown=999;s.autoFireWait=999;s.hold=true;if(s.side===0){s.x=100;s.y=60+s.slot*90;}});
  b.command({type:"squad-move",point:{x:320,y:280}});
  const times=b.soldiers.filter(s=>s.side===0).map(s=>{let length=0,p={x:s.x,y:s.y};for(const next of s.path){length+=distance(p,next);p=next;}return length/(s.formationSpeed!*b.movementMultiplier(s));});
  expect(Math.max(...times)-Math.min(...times)).toBeLessThan(.001);
 });
});
for(const mapId of [7,9])it(`replays weather map ${mapId} deterministically`,()=>{
 const b=new Battle(42,0,false,1,{mapId,level:5});b.aiSides=[];
 b.command({type:"move",id:1,point:{x:170,y:260}});b.command({type:"select",id:3});
 advance(b,1.1);b.command({type:"aim",id:3,point:{x:300,y:400}});advance(b,5);
 const r=replayBattle(b.replay(),b.tick);expect(r.weather).toBe(b.weather);expect(r.soldiers).toEqual(b.soldiers);expect(r.rngState).toBe(b.rngState);
});

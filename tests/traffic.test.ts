import {describe,it,expect} from "vitest";
import {Battle,replayBattle,type Side} from "../src/sim/battle";
import {distance,blocked} from "../src/sim/geometry";
import {TRAFFIC} from "../src/sim/traffic";
function fixture(side:Side=0){
 const b=new Battle(42);b.aiSides=[];b.cover=[];b.water=[];b.bridges=[];b.supplies=[];
 b.soldiers.forEach(s=>{s.life="dead";s.cooldown=999;s.hold=true;});
 const a=b.get(side*5)!,z=b.get(side*5+1)!,foe=b.get(side===0?5:0)!;
 for(const [s,x] of [[a,200],[z,300]] as const)Object.assign(s,{life:"alive",classId:"rifleman",x,y:250,path:[],goal:null});
 Object.assign(foe,{life:"alive",x:1000,y:500});return {b,a,z};
}
function advance(b:Battle,seconds:number,check?:()=>void){for(let i=0;i<Math.ceil(seconds/.03333333333333333);i++){b.step();check?.();}}
function crossing(side:Side){const f=fixture(side);f.b.command({type:"move",id:f.a.id,point:{x:500,y:250}});f.b.command({type:"move",id:f.z.id,point:{x:100,y:250}});return f;}
describe("deliberate player traffic and assisted enemy deconfliction",()=>{
 it("body-blocks opposing player routes and does not automatically push them apart",()=>{
  const {b,a,z}=crossing(0);advance(b,15,()=>expect(distance(a,z)).toBeGreaterThanOrEqual(TRAFFIC.playerSpacing-.01));
  expect(a.x).toBeLessThan(z.x);expect(a.path.length).toBeGreaterThan(0);expect(z.path.length).toBeGreaterThan(0);expect(a.traffic).toBeGreaterThan(0);
  const before=[a.x,a.y,z.x,z.y];advance(b,3);expect([a.x,a.y,z.x,z.y]).toEqual(before);
 });
 it("slows an approaching troop before it reaches the physical jam",()=>{
  const {b,a,z}=fixture();z.x=245;b.command({type:"move",id:a.id,point:{x:400,y:250}});advance(b,.5);
  expect(a.x-200).toBeCloseTo(24*TRAFFIC.crawl*.5);expect(a.traffic).toBeGreaterThan(0);expect(z.x).toBe(245);
 });
 it("allows a deliberate side route to disentangle without passing through an ally",()=>{
  const {b,a,z}=crossing(0);advance(b,10);b.command({type:"move",id:a.id,point:{x:a.x,y:155}});
  advance(b,15,()=>expect(distance(a,z)).toBeGreaterThanOrEqual(TRAFFIC.playerSpacing-.01));
  expect(a.y).toBeCloseTo(155);expect(z.x).toBeCloseTo(100);expect(a.path).toEqual([]);expect(z.path).toEqual([]);
 });
 it("does not move held or crouching allies out of the player's way",()=>{
  const {b,a,z}=fixture();z.x=250;b.command({type:"cover",id:z.id,active:true});b.command({type:"move",id:a.id,point:{x:400,y:250}});
  advance(b,8);expect(z.x).toBe(250);expect(z.y).toBe(250);expect(z.takingCover).toBe(true);expect(a.x).toBeLessThanOrEqual(218.1);
 });
 it("lets a player back out of a pre-existing overlap rather than locking forever",()=>{
  const {b,a,z}=fixture();z.x=210;b.command({type:"move",id:a.id,point:{x:100,y:250}});advance(b,6);
  expect(a.x).toBeCloseTo(100);expect(z.x).toBe(210);
 });
 it("keeps clear parallel routes at normal speed",()=>{
  const {b,a,z}=fixture();z.x=200;z.y=300;
  for(const s of [a,z])b.command({type:"move",id:s.id,point:{x:400,y:s.y}});
  advance(b,1);expect(a.x).toBeCloseTo(224);expect(z.x).toBeCloseTo(224);expect(a.traffic??0).toBe(0);
 });
 it("automatically passes opposing enemy routes at ordinary movement speed",()=>{
  const {b,a,z}=crossing(1);let sideStep=0;
  advance(b,22,()=>{sideStep=Math.max(sideStep,Math.abs(a.y-250),Math.abs(z.y-250));expect(distance(a,z)).toBeGreaterThanOrEqual(TRAFFIC.enemySpacing-.01);});
  expect(sideStep).toBeGreaterThan(10);expect(a.x).toBeCloseTo(500);expect(z.x).toBeCloseTo(100);expect(a.path).toEqual([]);expect(z.path).toEqual([]);
 });
 it("routes enemy traffic around a stationary ally without displacing it",()=>{
  const {b,a,z}=fixture(1);z.x=280;b.command({type:"move",id:a.id,point:{x:450,y:250}});
  advance(b,20);expect(a.x).toBeCloseTo(450);expect(z.x).toBe(280);expect(z.y).toBe(250);
 });
 it("reserves distinct enemy destinations instead of stacking their goal positions",()=>{
  const {b,a,z}=fixture(1);for(const s of [a,z])b.command({type:"move",id:s.id,point:{x:500,y:250}});
  expect(distance(a.goal!,z.goal!)).toBeGreaterThanOrEqual(28);advance(b,22);expect(distance(a,z)).toBeGreaterThanOrEqual(24);expect(a.path).toEqual([]);expect(z.path).toEqual([]);
 });
 it("keeps enemy passing on the bridge rather than sidestepping into the river",()=>{
  const {b,a,z}=fixture(1);b.water=[{x:450,y:200,w:100,h:200}];b.bridges=[{x:430,y:270,w:140,h:62}];
  Object.assign(a,{x:400,y:300});Object.assign(z,{x:650,y:300});b.setGoal(a,{x:700,y:300},true);b.setGoal(z,{x:350,y:300},true);
  advance(b,26,()=>{expect(b.inWater(a)).toBe(false);expect(b.inWater(z)).toBe(false);});
  expect(a.x).toBeCloseTo(700);expect(z.x).toBeCloseTo(350);
 });
 it("does not steer enemy bodies through solid terrain",()=>{
  const {b,a,z}=fixture(1);z.x=260;b.cover=[{x:230,y:275,w:100,h:70,material:"rock",hp:100}];
  b.command({type:"move",id:a.id,point:{x:450,y:250}});let before={x:a.x,y:a.y};
  advance(b,22,()=>{expect(blocked(before,a,b.cover,14)).toBe(false);before={x:a.x,y:a.y};});expect(a.x).toBeCloseTo(450);
 });
 it("completes a zero-distance movement order normally",()=>{
  const {b,a}=fixture();b.command({type:"move",id:a.id,point:{x:a.x,y:a.y}});advance(b,.1);expect(a.path).toEqual([]);expect(a.goal).toBeNull();
 });
 it("replays crowded movement deterministically",()=>{
  const b=new Battle(42,0,false,0,{mapId:0,level:1,mode:"medium"});b.aiSides=[];
  b.command({type:"move",id:0,point:{x:105,y:174}});b.command({type:"move",id:1,point:{x:105,y:75}});
  advance(b,10);expect(b.get(0)!.traffic).toBeGreaterThan(0);const replay=replayBattle(b.replay(),b.tick);expect(replay.soldiers).toEqual(b.soldiers);
 });
});

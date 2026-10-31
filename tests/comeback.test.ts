import { describe,it,expect } from "vitest";
import { Battle,replayBattle } from "../src/sim/battle";
import { CLASSES,TUNING,type ClassId } from "../src/sim/data";
import { COMEBACK,RUN_LIGHT } from "../src/sim/comeback";
import { MAPS } from "../src/sim/maps";
import { distance,legal,pathfind } from "../src/sim/geometry";
function fixture(mapId=0){
 const b=new Battle(42,0,false,0,{mapId,level:10});b.aiSides=[];b.cover=[];b.water=[];b.bridges=[];b.supplies=[];
 b.soldiers.forEach(s=>{s.cooldown=999;s.autoFireWait=999;s.hold=true;});
 const a=b.get(1)!,t=b.get(5)!;a.x=200;a.y=250;t.x=800;t.y=250;return {b,a,t};
}
const advance=(b:Battle,seconds:number)=>{for(let i=0;i<Math.ceil(seconds/TUNING.step);i++)b.step();};
describe("run light and recover equipment",()=>{
 it("drops exactly one marked kit, preserves health percentage, and requires an explicit recovery order",()=>{
  const {b,a}=fixture();a.hp=b.maxHp(a)*.5;
  expect(b.dropGear(a)).toBe(true);expect(a.unarmed).toBe(true);expect(a.hp).toBe(RUN_LIGHT.hp*.5);
  expect(b.gear).toEqual([{owner:a.id,side:a.side,classId:a.classId,x:200,y:250}]);expect(b.dropGear(a)).toBe(false);
  advance(b,.2);expect(a.unarmed).toBe(true);expect(b.gear).toHaveLength(1);
  a.hp-=13;const percent=a.hp/b.maxHp(a);const before=a.cooldown;
  expect(b.recoverGear(a)).toBe(true);b.step();expect(a.unarmed).toBe(false);expect(b.gear).toEqual([]);
  expect(a.hp/b.maxHp(a)).toBeCloseTo(percent);expect(a.cooldown).toBeGreaterThan(before-.1);
 });
 it("runs faster in the actual movement simulation and leaves its kit behind",()=>{
  const moved:number[]=[];
  for(const light of [false,true]){const {b,a}=fixture();if(light)b.dropGear(a);
   b.command({type:"move",id:a.id,point:{x:400,y:250}});advance(b,1);moved.push(a.x-200);
   if(light)expect(b.gear[0].x).toBe(200);
  }
  expect(moved[1]).toBeCloseTo(RUN_LIGHT.speed);expect(moved[1]).toBeGreaterThan(moved[0]*1.5);
 });
 for(const id of Object.keys(CLASSES) as ClassId[])it(`blocks every ${id} ranged attack while unarmed`,()=>{
  const {b,a,t}=fixture();a.classId=id;a.cooldown=0;a.hp=b.maxHp(a);t.x=250;b.command({type:"select",id:a.id});b.dropGear(a);
  expect(b.fire(a,t)).toBe(false);expect(b.fireAt(a,t,t.id)).toBe(false);expect(b.aimTorch(a,t)).toBe(false);
  b.command({type:"attack",id:a.id,target:t.id});b.command({type:"demolish",id:a.id,point:t});b.fireAll();
  expect(b.shots.some(s=>s.owner===a.id)).toBe(false);expect(a.target).toBeNull();
 });
 it("does not heal or reset reload/heat through repeated drop/recovery cycles",()=>{
  const {b,a}=fixture();a.classId="torch";a.hp=b.maxHp(a)*.4;a.cooldown=6;a.heat=3;a.overheated=true;
  for(let i=0;i<4;i++){b.dropGear(a);b.recoverGear(a);b.pickupGear(a);}
  expect(a.hp/b.maxHp(a)).toBeCloseTo(.4);expect(a.cooldown).toBe(6);expect(a.heat).toBe(3);expect(a.overheated).toBe(true);
 });
 it("requires the owner to reach the exact marked area and allows cancellation",()=>{
  const {b,a,t}=fixture();b.dropGear(a);a.x=350;
  expect(b.recoverGear(t)).toBe(false);expect(b.recoverGear(a)).toBe(true);expect(b.pickupGear(a)).toBe(false);
  b.command({type:"move",id:a.id,point:{x:450,y:250}});expect(a.recoveringGear).toBe(false);
  a.x=200;b.step();expect(a.unarmed).toBe(true);
  b.recoverGear(a);b.step();expect(a.unarmed).toBe(false);
 });
 it("walks back to its kit and equips automatically without teleporting",()=>{
  const {b,a}=fixture();b.dropGear(a);a.x=350;a.formationSpeed=5;
  b.recoverGear(a);expect(a.x).toBe(350);expect(a.formationSpeed).toBeUndefined();
  advance(b,1);expect(a.x).toBeGreaterThan(200);expect(a.x).toBeLessThan(350);expect(a.unarmed).toBe(true);
  advance(b,5);expect(distance(a,{x:200,y:250})).toBeLessThanOrEqual(18);expect(a.unarmed).toBe(false);expect(b.gear).toHaveLength(0);
 });
 it("clears a recovery order when its runner becomes a casualty",()=>{
  const {b,a}=fixture();b.dropGear(a);a.x=350;b.recoverGear(a);b.damage(a,999,null,true);
  expect(a.life).toBe("dead");expect(a.recoveringGear).toBe(false);expect(b.gear).toHaveLength(1);
 });
 it("can swim out and return for gear when already in the river",()=>{
  const {b,a}=fixture();b.dropGear(a);b.water=[{x:300,y:200,w:60,h:100}];a.x=330;a.wasInWater=true;b.random=()=>.9;
  expect(b.recoverGear(a)).toBe(true);expect(a.path.length).toBeGreaterThan(0);advance(b,6);
  expect(a.unarmed).toBe(false);expect(b.gear).toHaveLength(0);expect(b.inWater(a)).toBe(false);
 });
 it("preserves a manual escape route but drops stale attack orders",()=>{
  const {b,a}=fixture();b.command({type:"move",id:a.id,point:{x:400,y:250}});const path=structuredClone(a.path);b.dropGear(a);expect(a.path).toEqual(path);expect(a.formationSpeed).toBeUndefined();
 });
 it("rejects dropping gear in water, brawls, casualties and training",()=>{
  const {b,a}=fixture();b.water=[{x:180,y:230,w:60,h:50}];expect(b.dropGear(a)).toBe(false);
  b.water=[];a.brawl=5;expect(b.dropGear(a)).toBe(false);a.brawl=null;a.life="down";expect(b.dropGear(a)).toBe(false);
  const boot=new Battle(42,0,true);expect(boot.dropGear(boot.get(1)!)).toBe(false);
 });
 it("gives an unarmored body less protection and a lighter snow/water load",()=>{
  const {b,a}=fixture(9);const max=b.maxHp(a);b.dropGear(a);expect(b.maxHp(a)).toBe(RUN_LIGHT.hp);expect(b.maxHp(a)).toBeLessThan(max/2);
  expect(b.movementMultiplier(a)).toBe(.95);b.damage(a,50,"rifleman");expect(a.hp).toBe(80);
  b.water=[{x:180,y:230,w:60,h:50}];b.random=()=>.2;b.updateWater(a);expect(a.drowningTime).toBe(0);
 });
 it("can still collect supply powers without a weapon",()=>{
  const {b,a}=fixture();b.dropGear(a);b.supplies=[{id:0,x:a.x,y:a.y,label:"DROP",claimedBy:null}];b.collectSupplies();expect(b.powers[0]).toHaveLength(1);expect(a.unarmed).toBe(true);
 });
});
describe("timed comeback chests",()=>{
 it("waits for combat time, freezes during deployment and spawns on the advertised cadence",()=>{
  const {b}=fixture();b.planningTicks=300;advance(b,10);expect(b.chests).toEqual([]);expect(b.time).toBe(0);
  advance(b,29);expect(b.chests).toEqual([]);advance(b,1);expect(b.chestsSpawned).toBe(1);expect(b.chests[0].expiresAt).toBeCloseTo(75);
  advance(b,44);expect(b.chestsSpawned).toBe(1);advance(b,1);expect(b.chestsSpawned).toBe(2);expect(b.chests.filter(c=>c.claimedBy===null)).toHaveLength(1);
 });
 for(const map of MAPS)it(`${map.name}: spawns a reachable chest in its authored reward area, away from troops and cover`,()=>{
  const b=new Battle(42,0,false,0,{mapId:map.id,level:10});b.aiSides=[];b.time=30;
  expect(b.spawnChest()).toBe(true);const c=b.chests[0];expect(legal(c,b.cover)).toBe(true);expect(b.inWater(c)).toBe(map.layout==="lake");
  expect(b.soldiers.every(s=>distance(s,c)>=75)).toBe(true);
  for(const side of [0,1]){const start=b.soldiers.find(s=>s.side===side)!;const path=pathfind(start,c,map.layout==="lake"?b.cover:b.dryCover());expect(path.length).toBeGreaterThan(0);expect(distance(path.at(-1)!,c)).toBeLessThan(32);}
 });
 it("opens once for a living nearby runner, then shows its reward briefly",()=>{
  const {b,a}=fixture();b.dropGear(a);b.time=30;b.spawnChest();const c=b.chests[0];a.x=c.x;a.y=c.y;b.random=()=>0;
  b.tickComeback();expect(c.claimedBy).toBe(0);expect(c.reward).toBe("airstrike");expect(b.chestsOpened).toBe(1);expect(b.powers[0]).toEqual(["airstrike"]);
  b.tickComeback();expect(b.powers[0]).toHaveLength(1);b.time=34;b.tickComeback();expect(b.chests).toEqual([]);
 });
 it("can return a permanently lost ally at a safe point with partial health",()=>{
  const {b,a}=fixture();const fallen=b.get(0)!;fallen.life="dead";fallen.death="skeleton";fallen.hp=0;
  expect(b.grantChestReward(a,"recall")).toBe("recall");expect(fallen.life).toBe("alive");expect(fallen.hp).toBeCloseTo(b.maxHp(fallen)*COMEBACK.reviveHealth);
  expect(distance(fallen,a)).toBeLessThan(100);expect(legal(fallen,b.cover)).toBe(true);expect(b.inWater(fallen)).toBe(false);expect(b.stats.revives).toBe(1);
 });
 it("does not replace equipment deliberately left behind when recalling its owner",()=>{
  const {b,a,t}=fixture();b.dropGear(a);const kit={...b.gear[0]};a.life="dead";a.hp=0;
  const collector=b.get(0)!;b.grantChestReward(collector,"recall");expect(a.life).toBe("alive");expect(a.unarmed).toBe(true);expect(b.gear[0]).toEqual(kit);
  expect(a.hp).toBeCloseTo(RUN_LIGHT.hp*.6);expect(t.life).toBe("alive");
 });
 it("heals living allies and extinguishes flames without reviving or restoring gear",()=>{
  const {b,a}=fixture();b.dropGear(a);a.hp=26;a.burnRemaining=4;
  const down=b.get(0)!;down.life="down";down.hp=0;
  b.grantChestReward(a,"treatment");expect(a.hp).toBeCloseTo(26+RUN_LIGHT.hp*.35);expect(a.burnRemaining).toBe(0);expect(a.unarmed).toBe(true);expect(down.life).toBe("down");
 });
 it("offers a better recall chance when badly outnumbered, without adding new soldiers",()=>{
  const {b,a}=fixture();for(const s of b.soldiers.filter(s=>s.side===0&&s.id!==a.id&&s.id!==0)){s.life="dead";s.hp=0;}
  const count=b.soldiers.length;b.random=()=>.7;expect(b.grantChestReward(a)).toBe("recall");expect(b.soldiers).toHaveLength(count);
  expect(b.soldiers.filter(s=>s.side===0&&s.life==="alive")).toHaveLength(3);
 });
 it("lets enemies claim rewards too, and the enemy AI can contest a chest",()=>{
  const {b,t}=fixture();b.time=30;b.spawnChest();const c=b.chests[0];t.x=c.x;t.y=c.y;b.random=()=>0;b.tickComeback();expect(c.claimedBy).toBe(1);expect(b.powers[1]).toContain("airstrike");
  const q=fixture();q.b.time=30;q.b.spawnChest();q.b.chests[0].x=650;q.b.chests[0].y=250;q.b.ai(q.t);expect(q.t.goal).not.toBeNull();
 });
 it("expires unclaimed chests and stops after six rather than enabling endless rewards",()=>{
  const {b}=fixture();for(let i=0;i<COMEBACK.limit;i++){b.time=COMEBACK.first+i*COMEBACK.interval;b.tickComeback();}
  expect(b.chestsSpawned).toBe(6);b.time=400;b.tickComeback();expect(b.chests).toEqual([]);expect(b.chestsSpawned).toBe(6);expect(b.chestStatus).toContain("NO MORE");
 });
 it("does not delay defeat when the final soldier dies",()=>{
  const {b}=fixture();b.soldiers.filter(s=>s.side===0).forEach(s=>s.life="dead");b.combatTicks=899;b.step();expect(b.winner).toBe(1);expect(b.chests).toEqual([]);
 });
 it("keeps boot camp free of timed rewards",()=>{const b=new Battle(42,0,true);b.time=100;b.tickComeback();expect(b.chests).toEqual([]);});
 it("replays gear orders and timed reward spawns deterministically",()=>{
  const b=new Battle(83,0,false,1,{mapId:0,level:10});b.aiSides=[];
  b.command({type:"drop-gear",id:1});b.command({type:"move",id:1,point:{x:180,y:250}});advance(b,4);
  b.command({type:"recover-gear",id:1});advance(b,34);
  const r=replayBattle(b.replay(),b.tick);expect(r.soldiers).toEqual(b.soldiers);expect(r.gear).toEqual(b.gear);expect(r.chests).toEqual(b.chests);expect(r.rngState).toBe(b.rngState);
 });
});

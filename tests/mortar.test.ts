import {describe,it,expect} from "vitest";
import {Battle,replayBattle} from "../src/sim/battle";
import {MORTAR,mortarDuration,mortarImpact,mortarCoverOrder,createMortar} from "../src/sim/mortar";
import {rollSupport} from "../src/sim/rewards";
import {TUNING} from "../src/sim/data";
import {distance} from "../src/sim/geometry";
function fixture(mapId=0){
 const b=new Battle(42,0,false,0,{mapId,level:7,mode:"hard"});b.aiSides=[];b.cover=[];b.water=[];b.bridges=[];b.supplies=[];b.chestsSpawned=6;
 for(const s of b.soldiers){s.life="dead";s.hold=true;s.cooldown=999;s.autoFireWait=999;}
 const player=b.get(0)!,enemy=b.get(5)!;
 Object.assign(player,{life:"alive",x:100,y:100,hp:230});Object.assign(enemy,{life:"alive",x:600,y:280,hp:9999});
 return {b,player,enemy};
}
describe("support reward weights",()=>{
 it("gives exactly 40/40/20 of uniformly distributed reward rolls",()=>{
  const counts={airstrike:0,mortar:0,sniper:0};for(let i=0;i<10000;i++)counts[rollSupport((i+.5)/10000)]++;
  expect(counts).toEqual({airstrike:4000,mortar:4000,sniper:2000});expect(rollSupport(.4)).toBe("mortar");expect(rollSupport(.8)).toBe("sniper");
 });
 it("uses the same support split in healthy reward chests",()=>{
  const {b,player}=fixture();b.soldiers=b.soldiers.filter(s=>s.life==="alive");player.hp=b.maxHp(player);
  const counts={airstrike:0,mortar:0,sniper:0};
  for(let i=0;i<1000;i++){let call=0;b.random=()=>call++===0?0:(i+.5)/1000;const reward=b.grantChestReward(player);expect(reward in counts).toBe(true);counts[reward as keyof typeof counts]++;}
  expect(counts).toEqual({airstrike:400,mortar:400,sniper:200});
 });
});
describe("sustained mortar support",()=>{
 for(const mapId of [0,4])for(const side of [0,1] as const)it(`crew arrives at the opposing starting edge for side ${side}, map ${mapId}`,()=>{
  const {b}=fixture(mapId);b.powers[side]=["mortar"];expect(b.useSuper(side,"mortar",{x:550,y:280})).toBe(true);
  const m=b.mortars[0];expect(m.shells).toHaveLength(12);expect(m.elapsed).toBe(0);expect(b.soldiers.filter(s=>s.life==="alive")).toHaveLength(2);
  expect(mapId===4?(side===0?m.pit.y>490:m.pit.y<70):(side===0?m.pit.x>1000:m.pit.x<80)).toBe(true);
  expect(b.powers[side]).toEqual([]);expect(b.mortarEvents).toEqual([{id:0,kind:"setup"}]);
 });
 it("waits longer than an airstrike, then launches and resolves twelve shells over a sustained attack",()=>{
  const {b}=fixture();b.powers[0]=["mortar"];b.useSuper(0,"mortar",{x:600,y:280});
  b.tickSupers(MORTAR.setup-.01);expect(b.mortarEvents.filter(e=>e.kind==="launch")).toHaveLength(0);
  b.tickSupers(.02);expect(b.mortarEvents.filter(e=>e.kind==="launch")).toHaveLength(1);
  expect(b.mortarEvents.filter(e=>e.kind==="impact")).toHaveLength(0);
  b.tickSupers(5);expect(b.mortars).toHaveLength(1);expect(b.mortars[0].shells.filter(s=>s.impacted).length).toBeLessThan(12);
  b.tickSupers(mortarDuration);expect(b.mortars).toEqual([]);
  expect(b.mortarEvents.filter(e=>e.kind==="launch")).toHaveLength(12);expect(b.mortarEvents.filter(e=>e.kind==="impact")).toHaveLength(12);
  expect(MORTAR.setup).toBeGreaterThan(TUNING.airstrikeWarning);expect((MORTAR.shells-1)*MORTAR.interval+MORTAR.flight).toBeGreaterThan(10);
 });
 it("has greater coverage than an airstrike and independently scattered shots",()=>{
  const {b}=fixture(),m=createMortar(b,0,{x:550,y:280},0);
  expect(MORTAR.coverage).toBeGreaterThan(TUNING.airstrikeRadius*2);
  expect(new Set(m.shells.map(s=>`${s.point.x},${s.point.y}`)).size).toBe(12);
  expect(distance(m.center,m.requested)).toBeGreaterThan(35);
  expect(m.shells.some(s=>distance(s.point,m.requested)>TUNING.airstrikeRadius)).toBe(true);
  for(const s of m.shells)expect(distance(s.point,m.center)).toBeLessThanOrEqual(MORTAR.coverage+1e-8);
 });
 it("deals a dangerous 300 damage to exposed soldiers and can hit allies",()=>{
  const {b,enemy,player}=fixture();Object.assign(player,{x:600,y:280,hp:230});enemy.hp=330;
  mortarImpact(b,enemy);expect(enemy.hp).toBe(30);expect(player.life).not.toBe("alive");
  mortarImpact(b,enemy);expect(enemy.life).not.toBe("alive");
 });
 it("makes taking cover a meaningful nonfatal counter, including at very low health",()=>{
  const {b,enemy}=fixture();enemy.takingCover=true;enemy.hp=230;
  mortarImpact(b,enemy);expect(enemy.hp).toBe(218);
  enemy.hp=5;for(let i=0;i<12;i++)mortarImpact(b,enemy);expect(enemy.hp).toBe(1);expect(enemy.life).toBe("alive");
  enemy.takingCover=false;mortarImpact(b,enemy);expect(enemy.life).not.toBe("alive");
 });
 it("respects solid cover snapshots and keeps permanent cover intact",()=>{
  const {b,enemy}=fixture();enemy.x=620;b.cover=[{x:575,y:240,w:20,h:80,hp:20}];
  mortarImpact(b,{x:565,y:280});expect(enemy.hp).toBe(9999);expect(b.cover).toEqual([]);
  mortarImpact(b,{x:565,y:280});expect(enemy.hp).toBe(9699);
  b.cover=[{x:575,y:240,w:20,h:80,hp:100,indestructible:true}];mortarImpact(b,{x:565,y:280});expect(b.cover[0].hp).toBe(100);expect(enemy.hp).toBe(9699);
 });
 it("lets advanced enemies take cover throughout the barrage and resume orders afterward",()=>{
  const {b,enemy}=fixture();b.powers[0]=["mortar"];b.useSuper(0,"mortar",enemy);Object.assign(enemy,b.mortars[0].center);
  b.mortars[0].elapsed=MORTAR.setup-1;enemy.cooldown=2;
  expect(mortarCoverOrder(b,enemy)).toBe(true);expect(enemy.takingCover).toBe(true);expect(enemy.path).toEqual([]);expect(enemy.cooldown).toBe(4);expect(b.commands).toEqual([]);
  mortarCoverOrder(b,enemy);expect(enemy.cooldown).toBe(4);
  b.time=30;b.mortars=[];expect(mortarCoverOrder(b,enemy)).toBe(false);expect(enemy.takingCover).toBe(false);
 });
 it("preserves elite airstrike evasion when a mortar barrage is also active",()=>{
  const {b}=fixture(),elite=b.get(6)!;Object.assign(elite,{life:"alive",hp:300,x:600,y:280});
  b.powers[0]=["mortar"];b.useSuper(0,"mortar",elite);Object.assign(b.mortars[0],{elapsed:MORTAR.setup,center:{x:elite.x,y:elite.y}});
  b.strikes.push({id:0,side:0,point:{x:elite.x,y:elite.y},requested:{x:elite.x,y:elite.y},accuracy:"near",remaining:4.5,impacted:false,dropped:false});
  b.ai(elite);expect(elite.eliteEscape).toBeDefined();expect(elite.takingCover).toBe(false);expect(elite.path.length).toBeGreaterThan(0);
 });
 it("rejects invalid orders without consuming a reward and freezes during deployment and victory",()=>{
  const {b}=fixture();b.powers[0]=["mortar"];expect(b.useSuper(0,"mortar",{x:NaN,y:280})).toBe(false);
  b.planningTicks=30;expect(b.useSuper(0,"mortar",{x:600,y:280})).toBe(false);expect(b.powers[0]).toEqual(["mortar"]);
  b.planningTicks=0;b.useSuper(0,"mortar",{x:600,y:280});b.planningTicks=30;b.step();expect(b.mortars[0].elapsed).toBe(0);
  b.planningTicks=0;b.winner=0;b.step();expect(b.mortars[0].elapsed).toBe(0);
 });
 it("keeps legacy AI aiming settled while a target moves inside its firing arc",()=>{
  const b=new Battle(42);b.aiSides=[1];b.cover=[];b.water=[];b.supplies=[];b.random=()=>.5;
  for(const s of b.soldiers){s.life="dead";s.cooldown=999;}
  const shooter=b.get(5)!,target=b.get(0)!;
  Object.assign(shooter,{life:"alive",classId:"bazooka",x:600,y:280,heading:Math.PI,steadyTime:2,cooldown:0});
  Object.assign(target,{life:"alive",x:450,y:290,hp:230});
  b.aimAi(shooter,target);expect(shooter.steadyTime).toBe(2);expect(shooter.heading).toBe(Math.PI);
  expect(b.fire(shooter,target)).toBe(true);
 });
 it("replays a naturally captured mortar and its barrage deterministically",()=>{
  let found:Battle|undefined;
  for(let seed=1;seed<=12&&!found;seed++){
   const b=new Battle(seed);b.aiSides=[];b.command({type:"drop-gear",id:4});b.command({type:"move",id:4,point:b.supplies[1]});
   for(let i=0;i<1800&&!b.powers[0].length&&b.winner===null;i++)b.step();
   if(b.powers[0].includes("mortar")){b.command({type:"super",side:0,weapon:"mortar",point:{x:850,y:250}});for(let i=0;i<580&&b.winner===null;i++)b.step();found=b;}
  }
  expect(found).toBeDefined();const b=found!,r=replayBattle(b.replay(),b.tick);
  expect(r.mortars).toEqual(b.mortars);expect(r.mortarEvents).toEqual(b.mortarEvents);expect(r.soldiers).toEqual(b.soldiers);expect(r.rngState).toBe(b.rngState);
 },20000);
});

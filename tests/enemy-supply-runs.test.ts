import {describe,it,expect} from "vitest";
import {Battle,replayBattle} from "../src/sim/battle";
import {difficulty,type DifficultyMode} from "../src/sim/maps";
import {RUN_LIGHT} from "../src/sim/comeback";
import {distance} from "../src/sim/geometry";
import {runnerRoute} from "../src/sim/supply-runs";
function arena(mode:DifficultyMode="hard",level=1){
 const b=new Battle(42,0,false,0,{mapId:0,level,mode});b.cover=[];b.water=[];b.bridges=[];b.aiSides=[];b.random=()=>.99;b.chestsSpawned=6;
 for(const s of b.soldiers){s.cooldown=999;s.autoFireWait=999;s.think=999;s.hold=true;s.x=s.side?900:80;s.y=80+s.slot*90;s.heading=Math.PI;}
 b.supplies=[{id:0,x:600,y:260,label:"CONTESTED",claimedBy:null}];return b;
}
function dispatch(b:Battle){b.ai(b.get(5)!);return b.get(b.enemySupplyRun!.unitId)!;}
describe("enemy light supply runners",()=>{
 it("unlocks on every Hard map, later Medium maps and never Easy or Original",()=>{
  for(let stage=1;stage<=10;stage++){
   expect(difficulty(stage,"hard").supplyRunners).toBe(true);
   expect(difficulty(stage,"easy").supplyRunners).toBe(false);
   expect(difficulty(stage,"medium").supplyRunners).toBe(stage>=5);
   expect(difficulty(stage).supplyRunners).toBe(false);
  }
  for(const [mode,level] of [["easy",10],["medium",4]] as const){const b=arena(mode,level);b.ai(b.get(5)!);expect(b.enemySupplyRun).toBeNull();expect(b.gear).toEqual([]);}
 });
 it("prefers a Lobber, drops real gear and armor, and commits just one runner",()=>{
  const b=arena(),lob=b.get(7)!;const start={x:lob.x,y:lob.y};const runner=dispatch(b);
  expect(runner.id).toBe(lob.id);expect(runner.unarmed).toBe(true);expect(b.maxHp(runner)).toBe(Math.round(RUN_LIGHT.hp*b.challenge!.enemyHealth));expect(b.landSpeed(runner)).toBe(RUN_LIGHT.speed);
  expect(b.gear).toMatchObject([{owner:runner.id,...start}]);expect(runner.goal).toEqual({x:600,y:260});
  for(const s of b.soldiers.filter(s=>s.side===1))b.ai(s);
  expect(b.gear).toHaveLength(1);expect(b.soldiers.filter(s=>s.unarmed)).toHaveLength(1);
 });
 for(const water of [false,true])it(`collects and returns to the exact bag through actual AI ticks (${water?"swim":"land"})`,()=>{
  const b=arena();if(water)b.water=[{x:555,y:130,w:90,h:280}];
  const runner=dispatch(b),bag={...b.gear[0]};b.aiSides=[1];runner.think=0;
  let wet=false,returning=false;
  for(let i=0;i<2400&&runner.unarmed;i++){b.step();wet ||= b.inWater(runner);returning ||= b.enemySupplyRun?.phase==="return";}
  expect(b.supplies[0].claimedBy).toBe(1);expect(returning).toBe(true);expect(wet).toBe(water);
  expect(runner.unarmed).toBe(false);expect(b.gear).toEqual([]);expect(distance(runner,bag)).toBeLessThanOrEqual(18);expect(runner.cooldown).toBeGreaterThan(1);
 });
 it("returns and rearms if the player steals its committed drop",()=>{
  const b=arena(),runner=dispatch(b);runner.x-=100;b.supplies[0].claimedBy=0;b.ai(runner);
  expect(b.enemySupplyRun?.phase).toBe("return");expect(runner.recoveringGear).toBe(true);expect(runner.goal).toEqual({x:b.gear[0].x,y:b.gear[0].y});
 });
 it("abandons a threatened run without becoming a free unarmed attacker",()=>{
  const b=arena(),runner=dispatch(b),player=b.get(0)!;runner.x-=100;Object.assign(player,{x:runner.x-80,y:runner.y});b.ai(runner);
  expect(b.enemySupplyRun?.phase).toBe("return");expect(runner.target).toBeNull();expect(runner.recoveringGear).toBe(true);
 });
 it("does not strip wounded or already exposed troops",()=>{
  const b=arena();for(const s of b.soldiers.filter(s=>s.side===1))s.hp=b.maxHp(s)*.5;b.ai(b.get(5)!);expect(b.gear).toEqual([]);
  const c=arena();for(const s of c.soldiers.filter(s=>s.side===1))s.burnRemaining=3;c.ai(c.get(5)!);expect(c.gear).toEqual([]);
 });
 it("rejects unreachable rewards, expired chests and impossible chest deadlines",()=>{
  const b=arena();b.cover=[{x:550,y:200,w:100,h:120}];b.ai(b.get(5)!);expect(b.enemySupplyRun).toBeNull();expect(b.gear).toEqual([]);
  const c=arena();c.supplies=[];c.chests=[{id:0,x:600,y:260,expiresAt:2,claimedBy:null}];c.ai(c.get(5)!);expect(c.enemySupplyRun).toBeNull();
 });
 it("uses a live timed chest and returns when it expires",()=>{
  const b=arena();b.supplies=[];b.chests=[{id:4,x:600,y:260,expiresAt:45,claimedBy:null}];const runner=dispatch(b);
  expect(b.enemySupplyRun?.kind).toBe("chest");runner.x-=100;b.time=46;b.ai(runner);expect(b.enemySupplyRun?.phase).toBe("return");
 });
 it("clears a lost runner and lets a revived unarmed soldier recover its own gear",()=>{
  const b=arena(),runner=dispatch(b);b.damage(runner,9999,null,true);b.ai(b.get(5)!);expect(b.enemySupplyRun).toBeNull();
  Object.assign(runner,{life:"alive",hp:60,x:800,death:null});b.ai(runner);expect(runner.recoveringGear).toBe(true);expect(runner.goal).toEqual({x:b.gear[0].x,y:b.gear[0].y});
 });
 it("keeps a direct lake objective while preferring a short safe detour on return",()=>{
  const b=arena(),s=b.get(7)!;b.water=[{x:670,y:170,w:80,h:120}];
  const route=runnerRoute(b,s,{x:710,y:260});expect(route?.safe).toBe(false);expect(route?.path.at(-1)).toEqual({x:710,y:260});
  const dry=runnerRoute(b,s,{x:600,y:140});expect(dry).toBeDefined();
 });
 it("replays runner decisions, dropped gear and reward captures deterministically",()=>{
  const b=new Battle(88,0,false,0,{mapId:3,level:5,mode:"hard"});b.aiSides=[1];for(let i=0;i<1800&&b.winner===null;i++)b.step();
  const replay=replayBattle(b.replay(),b.tick);expect(replay.enemySupplyRun).toEqual(b.enemySupplyRun);expect(replay.gear).toEqual(b.gear);expect(replay.supplies).toEqual(b.supplies);expect(replay.soldiers).toEqual(b.soldiers);
 },15000);
});

import {describe,it,expect} from "vitest";
import {Battle,replayBattle} from "../src/sim/battle";
import {MAPS,difficulty} from "../src/sim/maps";
import {MAP_PLAYBOOKS,mapOpeningOrder,mapRewardCost,enemySupportTarget} from "../src/sim/map-strategy";
import {distance,legal,pathfind} from "../src/sim/geometry";

describe("rehearsed enemy map strategies",()=>{
 it("authors a distinct playbook, route and reward priority for every map",()=>{
  expect(MAP_PLAYBOOKS).toHaveLength(10);expect(new Set(MAP_PLAYBOOKS.map(p=>p.name)).size).toBe(10);
  expect(new Set(MAP_PLAYBOOKS.map(p=>JSON.stringify([p.advance,p.flank,p.overwatch]))).size).toBe(10);
  for(const p of MAP_PLAYBOOKS)expect([...p.drops].sort()).toEqual([0,1,2]);
 });
 for(const map of MAPS)it(`${map.name}: all authored orders have connected legal dry routes and separate posts`,()=>{
  const b=new Battle(42,0,false,10,{mapId:map.id,level:7,mode:"hard"});
  const plan=b.enemyMapPlan!;expect(plan.name).toBe(MAP_PLAYBOOKS[map.id].name);expect(plan.orders).toHaveLength(5);
  const posts=[];
  for(const order of plan.orders){let from=b.get(order.unitId)!;
   for(const point of order.route){expect(legal(point,b.dryCover())).toBe(true);expect(b.inWater(point)).toBe(false);
    const route=pathfind(from,point,b.dryCover());expect(route.length).toBeGreaterThan(0);expect(distance(route.at(-1)!,point)).toBeLessThan(1);
    from={...from,...point};
   }
   posts.push(order.route.at(-1)!);
  }
  for(let i=0;i<posts.length;i++)for(let j=i+1;j<posts.length;j++)expect(distance(posts[i],posts[j])).toBeGreaterThan(40);
 });
 it("prepares during deployment but cannot move, shoot or progress a route before GO",()=>{
  const b=new Battle(42,0,false,10,{mapId:3,level:7,mode:"hard"});const starts=b.soldiers.map(s=>({x:s.x,y:s.y}));
  const orders=structuredClone(b.enemyMapPlan!.orders);
  for(let i=0;i<299;i++)b.step();expect(b.planning).toBe(true);expect(b.time).toBe(0);
  expect(b.soldiers.map(s=>({x:s.x,y:s.y}))).toEqual(starts);expect(b.enemyMapPlan!.orders).toEqual(orders);expect(b.stats.shots).toBe(0);
 });
 it("coordinates the two different lake approaches and executes normal movement after GO",()=>{
  const b=new Battle(42,0,false,0,{mapId:3,level:7,mode:"hard"});b.supplies=[];b.aiSides=[];
  const flank=b.enemyMapPlan!.orders.find(o=>o.role==="flank")!,assault=b.enemyMapPlan!.orders.find(o=>o.role==="assault")!;
  expect(flank.route[0].y).toBeGreaterThan(450);expect(assault.route[0].y).toBeLessThan(70);
  b.time=1;b.combatTicks=30;
  const unit=b.get(flank.unitId)!,before={x:unit.x,y:unit.y};
  expect(mapOpeningOrder(b,unit)).toBe(true);expect(unit.safeRoute).toBe(true);expect(unit).toMatchObject(before);
  b.step();expect(distance(unit,before)).toBeGreaterThan(0);expect(distance(unit,before)).toBeLessThan(2);
 });
 it("assigns long-range weapons to overwatch and faster troops to flanking",()=>{
  const b=new Battle(42,0,false,0,{mapId:9,level:7,mode:"hard"});const p=b.enemyMapPlan!;
  const guard=b.get(p.orders.find(o=>o.role==="overwatch")!.unitId)!,flank=b.get(p.orders.find(o=>o.role==="flank")!.unitId)!;
  expect(guard.classId).toBe("bazooka");expect(b.landSpeed(flank)*b.movementMultiplier(flank)).toBeGreaterThan(b.landSpeed(guard)*b.movementMultiplier(guard));
 });
 it("yields to nearby combat, fire, runners, water and an expired opening",()=>{
  const b=new Battle(42,0,false,0,{mapId:0,level:1,mode:"hard"});const s=b.get(5)!,t=b.get(0)!;
  t.x=s.x-100;t.y=s.y;expect(mapOpeningOrder(b,s)).toBe(false);t.x=105;t.y=75;
  s.unarmed=true;expect(mapOpeningOrder(b,s)).toBe(false);s.unarmed=false;
  s.burnRemaining=2;expect(mapOpeningOrder(b,s)).toBe(false);s.burnRemaining=0;
  b.time=101;expect(mapOpeningOrder(b,s)).toBe(false);
 });
 it("changes supply-run priorities by map without overriding actual travel costs or safety",()=>{
  for(const map of MAPS){const b=new Battle(42,0,false,0,{mapId:map.id,level:1,mode:"hard"});const [first,,last]=MAP_PLAYBOOKS[map.id].drops;
   expect(mapRewardCost(b,first,"supply")).toBe(0);expect(mapRewardCost(b,last,"supply")).toBe(170);
  }
 });
 it("keeps the reward runner distinct from the flank, including three-soldier opening squads",()=>{
  for(const level of [1,7]) {
   const b=new Battle(42,0,false,0,{mapId:3,level,mode:"hard"});
   expect(b.enemyMapPlan!.orders.some(o=>o.role==="assault")).toBe(true);
   const flank=b.enemyMapPlan!.orders.find(o=>o.role==="flank")!;
   b.ai(b.get(5)!);expect(b.enemySupplyRun).not.toBeNull();
   expect(b.enemySupplyRun!.unitId).not.toBe(flank.unitId);
   expect(b.enemyMapPlan!.orders.find(o=>o.unitId===b.enemySupplyRun!.unitId)?.role).toBe("reserve");
  }
 });
 it("follows its safe approach instead of demolishing its own shelter for a distant target",()=>{
  const b=new Battle(42,0,false,0,{mapId:3,level:7,mode:"hard"});b.supplies=[];
  const s=b.get(6)!;b.ai(s);expect(s.terrainTarget).toBeNull();expect(s.path.length).toBeGreaterThan(0);
  s.path=[];s.goal=null;s.heading=Math.PI;s.steadyTime=3;s.cooldown=0;s.autoFireWait=0;
  b.cover=[{x:s.x-150,y:s.y-30,w:50,h:60,hp:100}];
  expect(b.fireDistant(s,b.get(1)!)).toBe(false);expect(b.stats.shots).toBe(0);expect(b.cover[0].hp).toBe(100);
 });
 it("staggers heavy overwatch behind the initial assault without delaying reactions to a threat",()=>{
  const b=new Battle(42,0,false,0,{mapId:3,level:7,mode:"hard"});b.supplies=[];
  const guard=b.enemyMapPlan!.orders.find(o=>o.role==="overwatch")!,assault=b.enemyMapPlan!.orders.find(o=>o.role==="assault")!;
  expect(guard.departAt).toBeGreaterThan(assault.departAt);
  const s=b.get(guard.unitId)!;expect(mapOpeningOrder(b,s)).toBe(true);expect(s.path).toEqual([]);
  b.time=5;expect(mapOpeningOrder(b,s)).toBe(true);expect(s.path.length).toBeGreaterThan(0);
  Object.assign(b.get(0)!,{x:s.x-100,y:s.y});expect(mapOpeningOrder(b,s)).toBe(false);
 });
 it("unlocks full intel in Hard and later stages of the other modes, leaving Original alone",()=>{
  for(let n=1;n<=10;n++){expect(difficulty(n,"hard").mapIntel).toBe(true);expect(difficulty(n,"medium").mapIntel).toBe(n>=3);expect(difficulty(n,"easy").mapIntel).toBe(n>=6);expect(difficulty(n).mapIntel).toBe(false);}
  expect(new Battle(42,0,true).enemyMapPlan).toBeNull();
 });
 it("uses sniper support on an armed heavy threat instead of an unarmed decoy",()=>{
  const b=new Battle(42,0,false,0,{mapId:0,level:7,mode:"hard"});b.get(0)!.unarmed=true;
  expect(enemySupportTarget(b,"sniper")).toBe(b.get(1));
 });
 it("aims airstrikes at clusters and declines a strike that would endanger its own nearby troops",()=>{
  const b=new Battle(42,0,false,0,{mapId:0,level:7,mode:"hard"});b.cover=[];
  for(const s of b.soldiers)s.life="dead";
  Object.assign(b.get(0)!,{life:"alive",x:200,y:200});Object.assign(b.get(1)!,{life:"alive",x:290,y:200});
  const target=enemySupportTarget(b,"airstrike")!;expect(distance(target,b.get(0)!)).toBeLessThan(105);expect(distance(target,b.get(1)!)).toBeLessThan(105);
  Object.assign(b.get(5)!,{life:"alive",x:245,y:200});expect(enemySupportTarget(b,"airstrike")).toBeUndefined();
 });
 it("replays prepared roles and executed map orders without adding player commands",()=>{
  const b=new Battle(42,0,false,1,{mapId:6,level:7,mode:"hard"});for(let i=0;i<1500&&b.winner===null;i++)b.step();
  const r=replayBattle(b.replay(),b.tick);expect(r.enemyMapPlan).toEqual(b.enemyMapPlan);expect(r.soldiers).toEqual(b.soldiers);expect(r.rngState).toBe(b.rngState);expect(b.commands).toEqual([]);
 },15000);
});

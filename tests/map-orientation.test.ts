import {describe,it,expect} from "vitest";
import {Battle,replayBattle} from "../src/sim/battle";
import {MAPS} from "../src/sim/maps";
import {waterOutlines,legal,distance} from "../src/sim/geometry";
import {inView} from "../src/sim/vision";
const vertical=MAPS.filter(m=>m.axis==="north-south");
describe("north–south campaign fronts",()=>{
 it("mixes four north–south fronts with six east–west fronts",()=>{
  expect(vertical.map(m=>m.id)).toEqual([2,4,8,9]);expect(MAPS.filter(m=>m.axis==="east-west")).toHaveLength(6);
 });
 for(const map of vertical)it(`${map.name}: deploys five troops on each opposing bank, already facing forward`,()=>{
  const b=new Battle(42,0,false,10,{mapId:map.id,level:7,mode:"hard"});
  for(const side of [0,1] as const){
   const squad=b.soldiers.filter(s=>s.side===side);expect(squad).toHaveLength(5);
   expect(Math.max(...squad.map(s=>s.x))-Math.min(...squad.map(s=>s.x))).toBeGreaterThan(600);
   for(const s of squad){expect(legal(s,b.dryCover())).toBe(true);expect(b.inWater(s)).toBe(false);
    expect(s.heading).toBe(side===0?Math.PI/2:-Math.PI/2);
    expect(inView(s,{x:s.x,y:s.y+(side===0?100:-100)})).toBe(true);
    expect(side===0?s.y<120:s.y>440).toBe(true);
   }
  }
  const start=b.soldiers.map(s=>({x:s.x,y:s.y}));for(let i=0;i<90;i++)b.step();expect(b.soldiers.map(s=>({x:s.x,y:s.y}))).toEqual(start);
  const shore=waterOutlines(b.water);expect(shore).toHaveLength(1);expect(Math.min(...shore[0].map(p=>p.x))).toBe(0);expect(Math.max(...shore[0].map(p=>p.x))).toBe(1100);
 });
 for(const side of [0,1] as const)it(`side ${side} medics enter, revive and leave via their north/south edge`,()=>{
  const b=new Battle(42,0,false,0,{mapId:2,level:1});b.aiSides=[];b.random=()=>.99;b.cover=[];b.water=[];b.supplies=[];
  for(const s of b.soldiers){s.hold=true;s.cooldown=999;s.autoFireWait=999;}
  const target=b.soldiers.find(s=>s.side===side)!;target.life="down";target.hp=0;
  expect(b.callMedic(target.id,side)).toBe(true);const medic=b.medics[0];
  expect(medic.x).toBe(target.x);expect(medic.y).toBe(side===0?10:550);
  for(let i=0;i<900&&b.medics.length;i++)b.step();
  expect(target.life).toBe("alive");expect(b.medics).toEqual([]);expect(b.stats.revives).toBe(1);
 });
 it("still yields deterministic north–south battles and enemy orders",()=>{
  const b=new Battle(71,0,false,1,{mapId:4,level:7,mode:"hard"});
  for(let i=0;i<600&&b.winner===null;i++)b.step();const replay=replayBattle(b.replay(),b.tick);
  expect(replay.soldiers).toEqual(b.soldiers);expect(replay.enemyMapPlan).toEqual(b.enemyMapPlan);expect(replay.rngState).toBe(b.rngState);
 });
});

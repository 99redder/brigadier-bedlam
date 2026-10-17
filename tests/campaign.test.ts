import { describe,it,expect } from "vitest";
import { Battle,replayBattle } from "../src/sim/battle";
import { MAPS,difficulty,campaignRoute } from "../src/sim/maps";
import { legal,pathfind,distance } from "../src/sim/geometry";
import { nickname,roundScore,totalScore,validHistory,type RoundResult } from "../src/sim/campaign";

describe("ten-map tours",()=>{
 it("shuffles a deterministic complete route with no repeated maps",()=>{
  const routes=new Set<string>();
  for(let seed=1;seed<=30;seed++){const route=campaignRoute(seed);expect(new Set(route).size).toBe(10);expect([...route].sort((a,b)=>a-b)).toEqual(MAPS.map(m=>m.id));expect(campaignRoute(seed)).toEqual(route);routes.add(route.join(","));}
  expect(routes.size).toBeGreaterThan(20);
 });
 for(const map of MAPS)it(`${map.name} has connected dry bridge routes, reachable supplies, and safe spawns`,()=>{
  const b=new Battle(42,0,false,0,{mapId:map.id,level:1});
  for(const s of b.soldiers)expect(legal(s,b.cover)).toBe(true);
  for(const side of [0,1]){
   const s=b.soldiers.find(s=>s.side===side)!;const goal={x:side===0?990:105,y:280};
   const path=pathfind(s,goal,b.dryCover());expect(path.length).toBeGreaterThan(0);expect(distance(path.at(-1)!,goal)).toBeLessThan(32);
  }
  expect(b.bridges.length).toBeGreaterThan(0);
  for(const drop of b.supplies){expect(legal(drop,b.cover)).toBe(true);const path=pathfind(b.get(0)!,drop,b.cover);expect(path.length).toBeGreaterThan(0);expect(distance(path.at(-1)!,drop)).toBeLessThan(32);}
  expect(b.supplies.some(p=>b.inWater(p))).toBe(true);
 });
 it("has genuinely distinct terrain for all ten maps",()=>{expect(new Set(MAPS.map(m=>JSON.stringify([m.cover,m.water,m.bridges]))).size).toBe(10);});
 it("ramps enemy health, speed and response without strengthening the player's squad",()=>{
  for(let n=1;n<10;n++){const a=difficulty(n),b=difficulty(n+1);expect(b.enemyHealth).toBeGreaterThan(a.enemyHealth);expect(b.enemySpeed).toBeGreaterThan(a.enemySpeed);expect(b.enemyReload).toBeLessThan(a.enemyReload);expect(b.enemyThink).toBeLessThan(a.enemyThink);expect(b.enemyCount).toBeGreaterThanOrEqual(a.enemyCount);}
  const easy=new Battle(44,0,false,0,{mapId:3,level:1}),hard=new Battle(44,0,false,0,{mapId:3,level:10});
  expect(easy.soldiers.filter(s=>s.side===1)).toHaveLength(3);expect(hard.soldiers.filter(s=>s.side===1)).toHaveLength(5);
  expect(easy.soldiers.filter(s=>s.side===1).map(s=>s.classId)).toEqual(["rifleman","rifleman","lobber"]);
  expect(easy.get(0)!.hp).toBe(hard.get(0)!.hp);expect(easy.challenge!.enemyPowers).toBe(false);expect(hard.challenge!.enemyPowers).toBe(true);
 });
 it("keeps map selection and difficulty deterministic in exported replays",()=>{
  const b=new Battle(91,0,false,1,{mapId:7,level:5});b.aiSides=[];b.command({type:"move",id:0,point:{x:250,y:250}});
  for(let i=0;i<180;i++)b.step();const replay=replayBattle(b.replay(),b.tick);
  expect(replay.soldiers).toEqual(b.soldiers);expect(replay.water).toEqual(b.water);expect(replay.cover).toEqual(b.cover);expect(replay.operation).toEqual(b.operation);
 });
});
describe("campaign scoring",()=>{
 const win:RoundResult={mapId:0,level:1,won:true,seconds:60,enemiesDefeated:3,survivors:5};
 it("awards kills, wins, survivors and speed, scaled by stage",()=>{expect(roundScore(win)).toBe(2430);expect(roundScore({...win,level:2})).toBe(4860);expect(totalScore([win,{...win,mapId:1,level:2}])).toBe(7290);expect(roundScore({...win,won:false,survivors:0,enemiesDefeated:2})).toBe(300);});
 it("validates score histories and rejects duplicate maps or impossible wins",()=>{expect(validHistory([win])).toBe(true);expect(validHistory([win,{...win,level:2}])).toBe(false);expect(validHistory([{...win,survivors:0}])).toBe(false);expect(validHistory([{...win,level:10}])).toBe(false);expect(validHistory([{...win,enemiesDefeated:5}])).toBe(false);expect(validHistory([{...win,seconds:NaN}])).toBe(false);});
 it("accepts optional public nicknames and rejects markup and oversized names",()=>{expect(nickname("")).toBe("");expect(nickname("  Major   Mishap ")).toBe("Major Mishap");expect(nickname("<script>alert(1)</script>")).toBe("");expect(nickname("x".repeat(21))).toBe("");expect(nickname("O'Brien")).toBe("O'Brien");});
});

it("applies stage difficulty to enemy movement and reloads in the actual simulation",()=>{
 const distances:number[]=[],reloads:number[]=[];
 for(const level of [1,10]){
  const b=new Battle(42,0,false,0,{mapId:0,level});b.aiSides=[];b.cover=[];b.water=[];b.random=()=>.5;
  const enemy=b.get(5)!,target=b.get(0)!;
  b.soldiers.forEach(s=>{s.cooldown=999;s.hold=true;});
  Object.assign(enemy,{x:900,y:100,classId:"rifleman",cooldown:0,steadyTime:1});Object.assign(target,{x:800,y:100});
  expect(b.fireAt(enemy,target,target.id)).toBe(true);reloads.push(enemy.cooldown);
  b.command({type:"move",id:enemy.id,point:{x:800,y:100}});
  target.x=100;target.y=400;
  for(let i=0;i<30;i++)b.step();distances.push(900-enemy.x);
 }
 expect(distances[1]).toBeGreaterThan(distances[0]);expect(reloads[1]).toBeLessThan(reloads[0]);
});

describe("battlefield environments",()=>{
 it("includes one snow map, one desert map and ten distinct environments",()=>{
  expect(new Set(MAPS.map(m=>m.environment.biome)).size).toBe(10);
  expect(MAPS.filter(m=>m.environment.biome==="snow")).toHaveLength(1);
  expect(MAPS.filter(m=>m.environment.biome==="desert")).toHaveLength(1);
  for(const map of MAPS){expect(map.ground).toBe(map.environment.ground);expect(map.waterColor).toBe(map.environment.water);expect(map.briefing).toContain(map.environment.briefing);}
 });
 for(const biome of ["snow","desert"])it(`${biome} rivers remain hazardous water with a safe bridge`,()=>{
  const map=MAPS.find(m=>m.environment.biome===biome)!;
  const b=new Battle(42,0,false,0,{mapId:map.id,level:1});b.random=()=>0;
  const r=b.water[4],s=b.get(1)!;s.x=r.x+r.w/2;s.y=r.y+r.h/2;
  expect(b.inWater(s)).toBe(true);b.updateWater(s);expect(s.drowningTime).toBeGreaterThan(0);
  const bridge=b.bridges[0];expect(b.inWater({x:bridge.x+bridge.w/2,y:bridge.y+bridge.h/2})).toBe(false);
 });
});

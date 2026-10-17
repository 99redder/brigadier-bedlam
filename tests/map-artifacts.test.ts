import { describe,expect,it } from "vitest";
import { Battle } from "../src/sim/battle";
import { MAPS } from "../src/sim/maps";
import { legal,blocked } from "../src/sim/geometry";
import { TERRAIN,type ClassId } from "../src/sim/data";
function fixture(mapId:number){
 const b=new Battle(42,0,false,0,{mapId,level:1});b.aiSides=[];b.water=[];b.random=()=>.5;
 const r=b.cover[0];b.cover=[r];b.soldiers.forEach(s=>s.life="dead");
 const a=b.get(0)!,t=b.get(5)!;
 Object.assign(a,{life:"alive",x:r.x-35,y:r.y+r.h/2,heading:0,steadyTime:2,cooldown:0});
 Object.assign(t,{life:"alive",x:r.x+r.w+25,y:a.y});
 const fire=(kind:ClassId)=>{a.classId=kind;a.cooldown=0;a.autoFireWait=0;a.heat=0;a.overheated=false;
  expect(b.fireAt(a,t,t.id)).toBe(true);b.resolveShot(b.shots.pop()!);
 };
 return {b,r,a,t,fire};
}
describe("themed battlefield cover",()=>{
 it("gives all ten maps distinct landmark silhouettes and authored footprints",()=>{
  expect(new Set(MAPS.map(m=>m.cover[0].artifact)).size).toBe(10);
  for(const map of MAPS){expect(map.cover.filter(r=>r.artifact)).toHaveLength(4);expect(map.cover.every(r=>r.w>0&&r.h>0)).toBe(true);expect(map.cover.filter(r=>r.artifact).every(r=>!!r.label)).toBe(true);}
 });
 for(const map of MAPS){
  it(`${map.name}: solid wrecks stop gunfire and take three rockets to destroy`,()=>{
   const {b,r,a,t,fire}=fixture(map.id);const hp=t.hp;
   const center={x:r.x+r.w/2,y:r.y+r.h/2};
   expect(legal(center,b.cover)).toBe(false);expect(blocked(a,t,b.cover)).toBe(true);
   fire("rifleman");expect(r.hp).toBe(TERRAIN.hp);expect(t.hp).toBe(hp);
   fire("torch");expect(r.hp).toBe(TERRAIN.hp);expect(t.burnRemaining).toBe(0);
   fire("bazooka");expect(r.hp).toBe(60);expect(b.cover).toContain(r);
   fire("bazooka");expect(r.hp).toBe(20);expect(b.cover).toContain(r);
   fire("bazooka");expect(b.cover).not.toContain(r);expect(b.rubble[0].artifact).toBe(r.artifact);
   expect(legal(center,b.cover)).toBe(true);expect(blocked(a,t,b.cover)).toBe(false);
  });
  it(`${map.name}: one dynamite bundle demolishes its landmark`,()=>{
   const {b,r,fire}=fixture(map.id);fire("sapper");expect(b.cover).not.toContain(r);expect(b.rubble).toHaveLength(1);
  });
 }
});

import { describe, expect, it } from "vitest";
import { Battle } from "../src/sim/battle";
import { MAPS } from "../src/sim/maps";
import { distance, inside, pathfind } from "../src/sim/geometry";

const lakes = MAPS.filter(m => m.layout === "lake");
describe("authored water and reward layouts", () => {
  it("uses three broad bounded lakes, plus rivers with substantially different courses", () => {
    expect(lakes).toHaveLength(3);
    for (const m of lakes) {
      expect(m.water[0].y).toBeGreaterThan(0);
      expect(m.water.at(-1)!.y + m.water.at(-1)!.h).toBeLessThan(560);
      expect(Math.max(...m.water.map(r => r.w))).toBeGreaterThanOrEqual(430);
      expect(m.water.reduce((area,r) => area+r.w*r.h,0)).toBeGreaterThan(110000);
    }
    const rivers = MAPS.filter(m => m.layout === "river");
    expect(rivers.filter(m => {
      const centers=m.water.map(r=>r.x+r.w/2);
      return Math.max(...centers)-Math.min(...centers)>=180;
    }).length).toBeGreaterThanOrEqual(5);
    expect(new Set(MAPS.map(m=>JSON.stringify(m.supplies))).size).toBe(10);
  });
  for (const map of MAPS) {
    it(`${map.name}: keeps banks, bridges, spawns and every reward usable`, () => {
      const b = new Battle(42,0,false,0,{mapId:map.id,level:1});
      for (const c of b.cover) for (const w of b.water)
        expect(c.x < w.x+w.w && c.x+c.w > w.x && c.y < w.y+w.h && c.y+c.h > w.y).toBe(false);
      for (const s of b.soldiers) expect(b.inWater(s)).toBe(false);
      for (const side of [0,1] as const) {
        const start=b.soldiers.find(s=>s.side===side)!;
        const origin={x:start.x,y:start.y};
        const bridge=b.bridges[0];
        b.command({type:"bridge",id:start.id,point:{x:bridge.x+bridge.w/2,y:bridge.y+bridge.h/2}});
        expect(start.path.length).toBeGreaterThan(0);
        expect(start.goal!.x).toBe(side===0?bridge.x+bridge.w-2:bridge.x+2);
        let from={x:start.x,y:start.y};
        for (const to of start.path) {
          const steps=Math.ceil(distance(from,to));
          for(let i=0;i<=steps;i++)expect(b.inWater({x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps})).toBe(false);
          from=to;
        }
        for (const drop of b.supplies) {
          drop.claimedBy=null;
          const path=pathfind(start,drop,b.cover);
          expect(distance(path.at(-1)!,drop)).toBeLessThan(1);
          if(map.layout==="lake") expect(b.inWater(drop)).toBe(true);
          Object.assign(start,{x:drop.x,y:drop.y});
          b.collectSupplies();
          expect(drop.claimedBy).toBe(side);
        }
        Object.assign(start,origin);
      }
    });
  }
  for (const map of lakes) for (const side of [0,1] as const)
    it(`${map.name}: side ${side} physically swims to and claims a central drop`, () => {
      const b=new Battle(42,0,false,0,{mapId:map.id,level:1});
      b.aiSides=[];b.random=()=>.99;
      for(const s of b.soldiers){s.cooldown=999;s.autoFireWait=999;s.hold=true;}
      const runner=b.soldiers.find(s=>s.side===side)!,drop=b.supplies[0];
      b.command({type:"move",id:runner.id,point:drop});
      let enteredWater=false;
      for(let i=0;i<3600&&drop.claimedBy===null;i++) {
        b.step();enteredWater ||= b.inWater(runner);
      }
      expect(enteredWater).toBe(true);
      expect(drop.claimedBy).toBe(side);
      expect(b.powers[side]).toHaveLength(1);
    });
  for (const map of lakes) {
    it(`${map.name}: timed chests stay central, AI can swim to them, recalls find a dry shore`, () => {
      const b=new Battle(42,0,false,0,{mapId:map.id,level:1});
      b.aiSides=[];b.time=30;
      expect(b.spawnChest()).toBe(true);
      const chest=b.chests[0];
      expect(inside(chest,map.rewardZone!)).toBe(true);
      expect(b.inWater(chest)).toBe(true);
      b.supplies.forEach(s=>s.claimedBy=0);
      const runner=b.get(5)!;
      Object.assign(runner,{x:chest.x+100,y:chest.y,hp:b.maxHp(runner),classId:"rifleman"});
      for(const s of b.soldiers)if(s.id!==runner.id)Object.assign(s,{x:s.side===0?100:1000,y:20+s.id*45});
      b.ai(runner);
      expect(runner.safeRoute).toBe(false);
      expect(runner.goal).toEqual({x:chest.x,y:chest.y});
      expect(distance(runner.path.at(-1)!,chest)).toBeLessThan(1);
      const fallen=b.get(6)!;fallen.life="dead";
      Object.assign(runner,{x:chest.x,y:chest.y});
      expect(b.grantChestReward(runner,"recall")).toBe("recall");
      expect(fallen.life).toBe("alive");
      expect(b.inWater(fallen)).toBe(false);
    });
  }
});

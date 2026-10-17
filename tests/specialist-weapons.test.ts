import { describe, expect, it } from "vitest";
import { Battle, replayBattle } from "../src/sim/battle";
import { CLASSES, TUNING, type ClassId } from "../src/sim/data";
import { inView } from "../src/sim/vision";
function fixture(id: ClassId = "torch") {
  const b = new Battle(42); b.aiSides=[]; b.cover=[]; b.water=[]; b.supplies=[];
  b.soldiers.forEach(s=>{s.life="dead";s.cooldown=999;s.hold=true;});
  const a=b.get(0)!,t=b.get(5)!;
  Object.assign(a,{life:"alive",classId:id,x:200,y:250,cooldown:0,heading:0,steadyTime:2});
  Object.assign(t,{life:"alive",x:280,y:250,cooldown:999});
  b.command({type:"select",id:a.id}); return {b,a,t};
}
const advance=(b:Battle,n:number)=>{for(let i=0;i<Math.ceil(n/TUNING.step);i++)b.step();};
describe("planned rockets",()=>{
  it("cannot receive manual aim, even through direct fireAt calls",()=>{
    const {b,a,t}=fixture("bazooka");
    b.command({type:"aim",id:a.id,point:t});
    expect(b.shots).toHaveLength(0);
    expect(b.fireAt(a,t,-1,false,true)).toBe(false);
  });
  it("fires selected launchers automatically, scatters and keeps a long reload",()=>{
    const {b,a,t}=fixture("bazooka");b.random=()=>.99;b.step();
    expect(b.shots).toHaveLength(1);expect(b.shots[0].manual).toBe(false);
    expect(b.shots[0].to.y).not.toBe(t.y);expect(a.cooldown).toBeCloseTo(8);
    expect(b.fireAll()).toBe(0);
    b.command({type:"select",id:null});expect(a.cooldown).toBeCloseTo(8);
  });
  it("requires settling after an explicit turn and cannot fire outside its narrow arc",()=>{
    const {b,a,t}=fixture("bazooka");t.x=120;
    expect(inView(a,t)).toBe(false);
    b.command({type:"attack",id:a.id,target:t.id});
    b.step();expect(b.shots).toHaveLength(0);
    advance(b,1);expect(b.stats.shots).toBe(0);
    advance(b,.6);expect(b.stats.shots).toBe(1);
    expect(inView({...a,heading:0},{x:a.x+100,y:a.y+100})).toBe(false);
    expect(inView({...a,classId:"rifleman",heading:0},{x:a.x+100,y:a.y+100})).toBe(true);
  });
});
describe("manual flame bursts",()=>{
  it("keeps passive fire and Fire all available while selected",()=>{
    const {b,a}=fixture();b.step();expect(b.stats.shots).toBe(1);
    a.cooldown=0;expect(b.fireAll()).toBe(1);
  });
  it("requires stopping, preserves movement when rejected, and rejects non-selected units",()=>{
    const {b,a,t}=fixture();b.command({type:"move",id:a.id,point:{x:220,y:250}});
    expect(b.aimTorch(a,t)).toBe(false);expect(a.path.length).toBeGreaterThan(0);
    b.command({type:"hold",id:a.id});a.moving=false;
    expect(b.aimTorch(a,t)).toBe(true);expect(b.shots[0].manual).toBe(true);
    a.cooldown=0;b.selected=null;expect(b.aimTorch(a,t)).toBe(false);
  });
  it("uses a narrow cone and refreshes rather than stacking burns",()=>{
    const {b,a,t}=fixture();const off=b.get(6)!;
    Object.assign(off,{life:"alive",x:270,y:280,hp:230,cooldown:999});
    expect(b.aimTorch(a,t)).toBe(true);b.resolveShot(b.shots.pop()!);
    expect(t.burnRemaining).toBe(8);expect(off.burnRemaining).toBe(0);
    t.burnRemaining=3;a.cooldown=0;
    expect(b.aimTorch(a,t)).toBe(true);b.resolveShot(b.shots.pop()!);
    expect(t.burnRemaining).toBe(8);
  });
  it("shares heat between manual and automatic shots and cannot bypass cooling",()=>{
    const {b,a,t}=fixture();
    expect(b.aimTorch(a,t)).toBe(true);a.cooldown=0;
    expect(b.fire(a,t)).toBe(true);expect(a.overheated).toBe(true);
    a.cooldown=0;expect(b.aimTorch(a,t)).toBe(false);expect(b.fireAll()).toBe(0);
    b.command({type:"select",id:null});expect(a.overheated).toBe(true);
    t.x=20;a.autoFireWait=999;advance(b,7);expect(a.overheated).toBe(true);
    advance(b,1.1);expect(a.overheated).toBe(false);
  });
  it("respects deployment, water, reload, range and cover",()=>{
    const {b,a,t}=fixture();b.planningTicks=30;expect(b.aimTorch(a,t)).toBe(false);
    b.planningTicks=0;b.water=[{x:180,y:230,w:60,h:60}];expect(b.aimTorch(a,t)).toBe(false);
    b.water=[];a.cooldown=2;expect(b.aimTorch(a,t)).toBe(false);a.cooldown=0;
    b.cover=[{x:240,y:220,w:15,h:60,material:"rock",hp:100}];
    expect(b.aimTorch(a,t)).toBe(true);b.resolveShot(b.shots.pop()!);expect(t.burnRemaining).toBe(0);
    b.cover=[];a.cooldown=0;t.x=400;
    b.aimTorch(a,t);b.resolveShot(b.shots.pop()!);expect(t.burnRemaining).toBe(0);
  });
  it("uses a distant cursor as direction while respecting actual flame reach",()=>{
    const {b,a,t}=fixture();
    expect(b.aimTorch(a,{x:900,y:250})).toBe(true);
    b.resolveShot(b.shots.pop()!);expect(t.burnRemaining).toBe(8);
  });
  it("freezes heat during deployment and cannot cool by reselecting",()=>{
    const {b,a,t}=fixture();b.aimTorch(a,t);const heat=a.heat;
    b.planningTicks=60;advance(b,1);expect(a.heat).toBe(heat);
    b.command({type:"select",id:null});b.command({type:"select",id:a.id});expect(a.heat).toBe(heat);
  });
  it("replays aim and heat deterministically",()=>{
    const b=new Battle(42);b.command({type:"select",id:3});
    b.command({type:"aim",id:3,point:{x:200,y:400}});advance(b,4);
    const r=replayBattle(b.replay(),b.tick);expect(r.soldiers).toEqual(b.soldiers);expect(r.rngState).toBe(b.rngState);
  });
});

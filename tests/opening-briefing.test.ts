import {describe,it,expect} from "vitest";
import {Battle,replayBattle} from "../src/sim/battle";
import {TUNING} from "../src/sim/data";
import {publicState} from "../src/net/protocol";
import {DeploymentCues} from "../src/view/deployment-cues";
describe("synchronized squad introduction",()=>{
 it("holds the full countdown, troops and combat until the introduction finishes",()=>{
  const b=new Battle(42,0,false,10,{mapId:4,level:1},false,TUNING.briefingSeconds),start=b.soldiers.map(s=>({x:s.x,y:s.y}));
  b.command({type:"move",id:0,point:{x:200,y:200}});b.powers[0]=["mortar"];expect(b.useSuper(0,"mortar",{x:500,y:300})).toBe(false);
  const cues=new DeploymentCues();cues.reset(b.planning);const played:number[]=[];
  for(let i=0;i<90;i++){if(!b.briefingTicks){const cue=cues.poll(b.countdown);if(cue!==null)played.push(cue);}b.step();}
  expect(played).toEqual([]);expect(b.briefingTicks).toBe(0);expect(b.countdown).toBe(10);expect(b.time).toBe(0);expect(b.soldiers.map(s=>({x:s.x,y:s.y}))).toEqual(start);
  for(let i=0;i<=300;i++){const cue=cues.poll(b.countdown);if(cue!==null)played.push(cue);b.step();}
  expect(played).toEqual([10,9,8,7,6,5,4,3,2,1,0]);
  const replay=replayBattle(b.replay(),b.tick);expect(replay.soldiers).toEqual(b.soldiers);expect(replay.briefingTicks).toBe(b.briefingTicks);
 });
 it("ends deployment immediately if a player forfeits during the introduction",()=>{
  const b=new Battle(42,0,false,10,{mapId:0,level:1},true,3);expect(b.planning).toBe(true);
  b.winner=0;expect(b.planning).toBe(false);b.step();expect(b.briefingTicks).toBe(90);expect(b.time).toBe(0);
 });
 it("publishes the same remaining introduction to either player and skips it for training",()=>{
  const b=new Battle(42,0,false,10,{mapId:0,level:1},true,3);for(let i=0;i<30;i++)b.step();
  expect(publicState(b,0).briefingTicks).toBe(60);expect(publicState(b,1).briefingTicks).toBe(60);expect(b.planningTicks).toBe(300);
  expect(new Battle(42,0,true,10,undefined,false,3).briefingTicks).toBe(0);
 });
});

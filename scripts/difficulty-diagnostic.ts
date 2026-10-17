// AI-vs-AI diagnostic, not a substitute for human playtesting.
// Bundle with esbuild (platform=node), then run with Node.
import {Battle} from "../src/sim/battle";
import {inView} from "../src/sim/vision";
import {distance} from "../src/sim/geometry";
import {MODES,type DifficultyMode} from "../src/sim/maps";
for(const mode of Object.keys(MODES) as DifficultyMode[])for(const level of [1,5,10]){
 if(process.argv[2]&&mode!==process.argv[2])continue;
 if(process.argv[3]&&level!==Number(process.argv[3]))continue;
 let wins=0,losses=0,unfinished=0,survivors=0,enemySurvivors=0,seconds=0;
 for(let sample=0;sample<4;sample++){
  const defend=process.argv.includes("defend");
  const b=new Battle(101+sample,defend?1:0,false,0,{mapId:[0,2,4,8][sample],level,mode});b.aiSides=defend?[1]:[0,1];
  for(let tick=0;tick<5400&&b.winner===null;tick++){
   if(defend){
    for(const s of b.soldiers.filter(s=>s.side===0&&s.life==="alive")){
     const target=b.soldiers.filter(t=>t.side===1&&t.life==="alive").sort((a,z)=>distance(s,a)-distance(s,z))[0];
     if(target&&!inView(s,target))b.facePoint(s,target);
    }
    b.fireAll();
    if(tick%90===0){const down=b.soldiers.find(s=>s.side===0&&s.life==="down");if(down)b.command({type:"medic",side:0,target:down.id});}
   }
   b.step();
  }
  if(b.winner===null)console.error(JSON.stringify({seed:b.seed,shots:b.stats.shots,terrain:b.cover,units:b.soldiers.filter(s=>s.life==="alive").map(s=>({id:s.id,hp:s.hp,steady:s.steadyTime,heading:s.heading,cooldown:s.cooldown,wait:s.autoFireWait,x:Math.round(s.x),y:Math.round(s.y),goal:s.goal,terrain:s.terrainTarget,target:s.target,cover:s.takingCover}))}));
  if(b.winner===0)wins++;else if(b.winner===1)losses++;else unfinished++;
  survivors+=b.soldiers.filter(s=>s.side===0&&s.life==="alive").length;
  enemySurvivors+=b.soldiers.filter(s=>s.side===1&&s.life==="alive").length;seconds+=b.time;
 }
 console.log(JSON.stringify({doctrine:process.argv.includes("defend")?"defensive volleys":"basic AI",mode,stage:level,playerWins:wins,enemyWins:losses,unfinished,playerSurvivors:survivors/4,enemySurvivors:enemySurvivors/4,seconds:Math.round(seconds/4)}));
}

import type Phaser from "phaser";
import type { Environment } from "../sim/environments";
import type { Point } from "../sim/geometry";

/** Flat scenery is decorative; solid silhouettes remain owned by destructible cover. */
export function drawEnvironment(g:Phaser.GameObjects.Graphics, env:Environment, mapId:number, project:(p:Point)=>Point) {
  let seed=(831+mapId*9127)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const mark=(x:number,y:number,w:number,h:number,color:number,alpha:number)=>{
    const p=project({x,y});g.fillStyle(color,alpha);g.fillEllipse(p.x,p.y,w,h*.74);
  };
  // Large, low-contrast patches give each biome texture without hiding soldiers or paths.
  for(let i=0;i<38;i++) {
    const x=45+random()*1010,y=30+random()*500;
    const broad=env.biome==="desert"||env.biome==="snow"||env.biome==="mud"||env.biome==="marsh";
    const w=broad?70+random()*100:30+random()*60,h=broad?18+random()*35:10+random()*20;
    if(env.biome==="snow") mark(x+5,y+h*.35,w*.9,7,env.dark,.2);
    mark(x,y,w,h,env.biome==="snow"?env.light:i%2?env.light:env.dark,env.biome==="snow"?.7:.22);
  }
  if(env.biome==="cobblestone") {
    for(let row=0;row<28;row++)for(let col=0;col<41;col++) {
      const wx=col*27+(row%2?13:0),wy=row*20;
      if(wx>1080)continue;
      const pts=[{x:wx+2,y:wy+2},{x:wx+24,y:wy+2},{x:wx+24,y:wy+17},{x:wx+2,y:wy+17}].map(project);
      g.fillStyle((row+col)%3?env.light:env.dark,.36);g.fillPoints(pts,true);
    }
  }
  // A differently routed pair of wheel tracks replaces the identical stripe on every map.
  const route=[{x:10,y:160+(mapId%4)*60},{x:360,y:230+(mapId%3)*25},{x:740,y:310-(mapId%3)*30},{x:1090,y:370-(mapId%4)*55}];
  for(const offset of [-10,10]) {
    g.lineStyle(env.biome==="mud"?8:4,env.road,env.biome==="snow"?.85:.55);
    g.strokePoints(route.map(p=>project({x:p.x,y:p.y+offset})));
  }
  for(let i=0;i<390;i++) {
    const x=12+random()*1076,y=10+random()*540,p=project({x,y});
    const color=i%3?env.dark:env.light;
    if(env.biome==="desert") {
      g.lineStyle(1,color,.42);g.strokePoints([{x:p.x-9,y:p.y+2},{x:p.x,y:p.y},{x:p.x+12,y:p.y+1}]);
    } else if(env.biome==="autumn") {
      g.fillStyle([0xb77942,0xcd964b,0x8e6842][i%3],.65);
      g.fillTriangle(p.x-3,p.y,p.x+2,p.y-3,p.x+5,p.y+2);
    } else if(env.biome==="meadow"||env.biome==="drygrass"||env.biome==="marsh") {
      g.lineStyle(1,color,.6);g.lineBetween(p.x-3,p.y,p.x-4,p.y-4);g.lineBetween(p.x,p.y,p.x+2,p.y-5);
      if(env.biome==="meadow"&&i%11===0){g.fillStyle(i%2?0xf3df9c:0xc88867,.85);g.fillCircle(p.x,p.y-3,2);}
    } else if(env.biome==="snow") {
      g.fillStyle(i%5?env.light:env.dark,.7);g.fillEllipse(p.x,p.y,3+random()*6,2);
      if(i%17===0){g.lineStyle(1,0xaec4c9,.55);g.lineBetween(p.x-8,p.y,p.x+8,p.y-2);}
    } else {
      g.fillStyle(color,.38);g.fillEllipse(p.x,p.y,3+random()*7,2+random()*3);
    }
  }
  if(env.biome==="desert") {
    for(let i=0;i<14;i++) {
      const p=project({x:70+random()*950,y:30+random()*480});
      g.lineStyle(2,env.light,.7);g.strokePoints([{x:p.x-40,y:p.y+6},{x:p.x-10,y:p.y-2},{x:p.x+20,y:p.y-1},{x:p.x+48,y:p.y+4}]);
    }
  }
}

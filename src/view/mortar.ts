import type Phaser from "phaser";
import type { MortarStrike } from "../sim/mortar";
import {MORTAR,mortarDuration} from "../sim/mortar";
import type {Point} from "../sim/geometry";
// Crew, construction, firing recoil, arcing shells and blast warnings all use
// simulation time. These temporary support personnel do not add squad slots.
export function drawMortar(g:Phaser.GameObjects.Graphics,m:MortarStrike,project:(p:Point)=>Point){
 if(m.elapsed>=mortarDuration)return;
 const pit=project(m.pit),center=project(m.center),color=m.side===0?0xffd36d:0xff7962;
 const setup=Math.min(1,m.elapsed/MORTAR.setup),walk=Math.max(0,1-m.elapsed/1.4);
 const packing=Math.max(0,m.elapsed-(mortarDuration-.8))/.8;
 const active=m.elapsed<MORTAR.setup+(MORTAR.shells-1)*MORTAR.interval+MORTAR.flight;
 if(active){
  g.lineStyle(2,color,.65);g.strokeEllipse(center.x,center.y,MORTAR.coverage*2,MORTAR.coverage*1.48);
  g.fillStyle(color,.035);g.fillEllipse(center.x,center.y,MORTAR.coverage*2,MORTAR.coverage*1.48);
  // Dashed inner ring denotes broad uncertainty, not a precise blast boundary.
  for(let i=0;i<12;i++){const a=i*Math.PI/6;g.lineBetween(center.x+Math.cos(a)*MORTAR.coverage*.75,center.y+Math.sin(a)*MORTAR.coverage*.55,center.x+Math.cos(a)*MORTAR.coverage*.85,center.y+Math.sin(a)*MORTAR.coverage*.63);}
 }
 // A visible three-person crew walks in, digs in, loads and fires the tube.
 g.fillStyle(0x273d33,.38);g.fillEllipse(pit.x,pit.y+4,84,36);
 if(setup>.18){
  g.fillStyle(0x5f5740);g.fillEllipse(pit.x,pit.y,63,28);
  const bags=Math.floor(setup*9);
  for(let i=0;i<bags;i++){const a=i*Math.PI/5;g.fillStyle(i%2?0xb1a575:0x91865f);g.fillRoundedRect(pit.x+Math.cos(a)*32-9,pit.y+Math.sin(a)*13-4,18,8,3);}
 }
 const bob=m.elapsed<MORTAR.setup?Math.sin(m.elapsed*9)*2:0;
 const crew=(dx:number,dy:number,loading:boolean)=>{
  const x=pit.x+dx+walk*(dx<0?-32:32)+packing*40,y=pit.y+dy+walk*15;
  g.fillStyle(0x263b32);g.fillRoundedRect(x-7,y-17,14,18,3);
  g.fillStyle(m.side===0?0x668064:0x865b4d);g.fillRoundedRect(x-6,y-15,12,14,3);
  g.fillStyle(0xd7ac80);g.fillCircle(x,y-22,6);
  g.fillStyle(m.side===0?0x4d6754:0x734c42);g.fillEllipse(x,y-26,17,9);
  g.lineStyle(3,0x23382f);g.lineBetween(x-4,y-1,x-5,y+4);g.lineBetween(x+4,y-1,x+5,y+4);
  g.lineStyle(4,0xc9a37c);g.lineBetween(x+5,y-12,x+(loading?11:9),y-15+(loading?bob:0));
  if(loading&&setup===1){g.fillStyle(0xdac98b);g.fillEllipse(x+12,y-19+bob,5,13);}
 };
 crew(-29,0,false);crew(22,-2,true);crew(-10,-22,false);
 if(setup>.45){
  const recent=m.shells.some(s=>s.launched&&m.elapsed-s.launchAt>=0&&m.elapsed-s.launchAt<.12);
  g.fillStyle(0x303d36);g.fillEllipse(pit.x,pit.y+1,23,9);
  g.lineStyle(4,0x8d9c8b);g.lineBetween(pit.x,pit.y-14,pit.x-10,pit.y+1);g.lineBetween(pit.x+3,pit.y-14,pit.x+14,pit.y+2);
  g.lineStyle(10,0x283f35);g.lineBetween(pit.x+4,pit.y-4,pit.x-5,pit.y-29+(recent?3:0));
  g.lineStyle(4,0x96a78d);g.lineBetween(pit.x+2,pit.y-6,pit.x-5,pit.y-27+(recent?3:0));
  g.fillStyle(0x172b26);g.fillEllipse(pit.x-5,pit.y-29+(recent?3:0),11,6);
  if(recent){g.fillStyle(0xffe6a1,.9);g.fillCircle(pit.x-5,pit.y-33,8);}
 }
 // An ammunition box makes this visually distinct from an ordinary soldier.
 g.fillStyle(0x7f754e);g.fillRoundedRect(pit.x+33,pit.y-4,20,13,2);
 g.lineStyle(2,0xd8cb93);g.strokeRoundedRect(pit.x+33,pit.y-4,20,13,2);
 const width=70;g.fillStyle(0x283b30);g.fillRect(pit.x-width/2,pit.y+22,width,4);
 g.fillStyle(color);g.fillRect(pit.x-width/2,pit.y+22,width*setup,4);
 for(const shell of m.shells){
  const p=project(shell.point),age=m.elapsed-shell.launchAt;
  if(shell.launched&&!shell.impacted){
   const t=Math.max(0,Math.min(1,age/MORTAR.flight));
   const x=pit.x+(p.x-pit.x)*t,y=pit.y-28+(p.y-pit.y+28)*t-Math.sin(t*Math.PI)*190;
   g.lineStyle(2,0xf3dfac,.8);g.lineBetween(x-4,y-10,x,y);
   g.fillStyle(0x283c32);g.fillEllipse(x,y,7,12);g.fillStyle(0xffd47b);g.fillCircle(x,y-3,2);
   if(t>.55){g.lineStyle(2,color,.7);g.strokeEllipse(p.x,p.y,MORTAR.blast*2,MORTAR.blast*1.48);}
  }
  if(shell.impacted){
   const after=age-MORTAR.flight;
   if(after>=0&&after<MORTAR.aftermath){
    const t=after/MORTAR.aftermath;
    g.lineStyle(3,0xffd08d,1-t);g.strokeEllipse(p.x,p.y,15+t*MORTAR.blast*2,10+t*MORTAR.blast*1.48);
    for(let i=0;i<5;i++){const a=i*Math.PI*.4;g.fillStyle(i%2?0x827d67:0xecc38a,(1-t)*.65);g.fillCircle(p.x+Math.cos(a)*t*35,p.y-12-Math.sin(t*Math.PI)*25+Math.sin(a)*t*15,8+t*15);}
   }
  }
 }
}

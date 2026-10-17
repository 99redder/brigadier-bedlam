import type Phaser from "phaser";
import type { Battle } from "../sim/battle";
import { CLASSES } from "../sim/data";
import { CHEST_LABELS } from "../sim/comeback";
import type { Point } from "../sim/geometry";
export function drawFieldLoot(g:Phaser.GameObjects.Graphics,b:Battle,project:(p:Point)=>Point,time:number){
 const labels:{x:number;y:number;text:string;color:string}[]=[];
 for(const kit of b.gear){
  const p=project(kit),owner=b.get(kit.owner),color=kit.side===0?0xe6c979:0xd98f70;
  g.lineStyle(2,color,.85);g.strokeEllipse(p.x,p.y+3,36,17);
  g.fillStyle(0x334b3e);g.fillRoundedRect(p.x-12,p.y-15,24,18,4);
  g.lineStyle(2,0xbcb68c);g.strokeRoundedRect(p.x-12,p.y-15,24,18,4);
  g.fillStyle(CLASSES[kit.classId].color);g.fillRect(p.x-4,p.y-12,8,12);
  g.lineStyle(5,0x273e31);g.lineBetween(p.x-18,p.y-18,p.x+17,p.y-22);
  g.fillStyle(0x657653);g.fillEllipse(p.x+9,p.y-25,19,11);
  labels.push({x:p.x,y:p.y+15,text:`${(owner?.slot??0)+1} ${CLASSES[kit.classId].short} KIT`,color:kit.side===0?"#ead69d":"#edb598"});
 }
 for(const chest of b.chests){
  const p=project(chest),open=chest.claimedBy!==null,pulse=1+Math.sin(time*5+chest.id)*.1;
  g.lineStyle(3,0xffd579,open ? .35 : .8);g.strokeEllipse(p.x,p.y+4,49*pulse,23*pulse);
  g.fillStyle(0x465e45);g.fillRoundedRect(p.x-16,p.y-20,32,24,4);
  g.lineStyle(2.5,0xffd579);g.strokeRoundedRect(p.x-16,p.y-20,32,24,4);
  g.fillStyle(0x967548);g.fillRect(p.x-12,p.y-16,24,16);
  g.lineStyle(3,0xe9cc84);g.lineBetween(p.x-17,p.y-(open?34:21),p.x+17,p.y-(open?29:21));
  g.fillStyle(0xf9e3a5);g.fillRect(p.x-3,p.y-15,6,9);
  if(!open){g.fillStyle(0xffe098,.16);g.fillTriangle(p.x-11,p.y-26,p.x+11,p.y-26,p.x,p.y-64);}
  labels.push({x:p.x,y:p.y+19,text:open?`${chest.claimedBy===0?"YOUR":"ENEMY"}: ${CHEST_LABELS[chest.reward!]}`:`REWARD CHEST · ${Math.max(0,Math.ceil(chest.expiresAt-b.time))}s`,color:open?chest.claimedBy===0?"#bce8bf":"#f3b18f":"#ffe29a"});
 }
 return labels;
}

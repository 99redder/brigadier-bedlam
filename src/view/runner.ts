import { CLASSES,type ClassId } from "../sim/data";
export const runnerKey=(id:ClassId,side:number,frame:number)=>`runner-${id}-${side}-${frame}`;
// Light shirts and empty hands make dropping both weapons and armor visible.
export function drawRunner(c:CanvasRenderingContext2D,id:ClassId,side:number,gait=0,crouched=false){
 c.save();if(crouched){c.translate(0,16);c.scale(1,.82);}c.lineJoin="round";c.lineCap="round";
 const ink="#27362f",skin=id==="bazooka"?"#b78058":"#dfb88c",shirt=`#${CLASSES[id].color.toString(16).padStart(6,"0")}`;
 const rect=(x:number,y:number,w:number,h:number,color:string,r=4)=>{c.fillStyle=color;c.strokeStyle=ink;c.lineWidth=2.5;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();c.stroke();};
 const limb=(x:number,y:number,tx:number,ty:number,color:string,w=8)=>{c.strokeStyle=ink;c.lineWidth=w+4;c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.stroke();c.strokeStyle=color;c.lineWidth=w;c.stroke();};
 limb(34,66,32-gait*7,83, "#667457");limb(46,66,48+gait*7,83,"#667457");
 rect(23-gait*7,81,15,8,"#303f34");rect(42+gait*7,81,15,8,"#303f34");
 rect(27,40,27,29,shirt,6);rect(28,64,26,5,"#53634c",1);
 limb(28,45,20+gait*7,60-gait*6,skin,8);limb(53,45,61-gait*7,59+gait*6,skin,8);
 rect(23,42,9,8,side===0?"#477963":"#c45e48",2);
 rect(27,14,28,28,skin,8);rect(26,11,29,10,id==="sapper"?"#bc703a":id==="torch"?"#6b533b":"#463e32",5);
 c.fillStyle=ink;c.fillRect(33,26,3,5);c.fillRect(47,26,3,5);
 c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.moveTo(33,23);c.lineTo(38,24);c.moveTo(45,24);c.lineTo(51,22);c.stroke();
 if(id==="rifleman"){c.fillStyle="#765638";c.beginPath();c.ellipse(42,35,9,3,0,0,Math.PI*2);c.fill();}
 else if(id==="sapper"){rect(24,17,34,5,"#c65340",1);}
 else {rect(35,34,15,6,"#f3e2bc",2);}
 c.strokeStyle="rgba(255,248,211,.5)";c.lineWidth=2;c.beginPath();c.moveTo(33,46);c.lineTo(33,59);c.stroke();c.restore();
}

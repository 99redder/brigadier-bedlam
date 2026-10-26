import type Phaser from "phaser";
import type { Cover } from "../sim/data";
import type { Biome } from "../sim/environments";

export const artifactHeight=(r:Cover)=>Math.max(68,r.h*.74+30);
// Supersampled painted props: lighting, panel seams, rust and volume are baked once.
// The simulation footprint remains the sole source of collision and blast shielding.
export function artifactTexture(scene:Phaser.Scene,r:Cover,biome:Biome) {
 const key=`landmark-v3-${r.artifact}-${biome}-${r.x}-${r.y}-${r.w}-${r.h}`;
 if(scene.textures.exists(key))return key;
 const height=artifactHeight(r),scale=3,canvas=document.createElement("canvas");
 canvas.width=Math.ceil((r.w+16)*scale);canvas.height=Math.ceil((height+14)*scale);
 const c=canvas.getContext("2d")!;c.scale(scale,scale);c.translate(8,6);c.scale(r.w/100,height/100);
 paintArtifact(c,r,biome);scene.textures.addCanvas(key,canvas);return key;
}
export function paintArtifact(c:CanvasRenderingContext2D,r:Cover,biome:Biome) {
 c.save();c.lineJoin="round";c.lineCap="round";
 const ink="#303933",steel="#626f67",light="#9ea994",rust="#925b3c";
 let state=(r.x*131+r.y*37+r.w)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const gradient=(top:string,bottom:string)=>{const g=c.createLinearGradient(0,15,25,95);g.addColorStop(0,top);g.addColorStop(1,bottom);return g;};
 const path=(points:number[][])=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();};
 const poly=(points:number[][],fill:string|CanvasGradient,stroke=ink,width=.7)=>{path(points);c.fillStyle=fill;c.fill();if(width){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
 const rect=(x:number,y:number,w:number,h:number,fill:string|CanvasGradient,radius=1,outline=true)=>{c.beginPath();c.roundRect(x,y,w,h,radius);c.fillStyle=fill;c.fill();if(outline){c.strokeStyle=ink;c.lineWidth=.7;c.stroke();}};
 const ellipse=(x:number,y:number,rx:number,ry:number,fill:string|CanvasGradient)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();};
 const line=(x:number,y:number,tx:number,ty:number,color=ink,w=.7)=>{c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.strokeStyle=color;c.lineWidth=w;c.stroke();};
 const rivets=(x:number,y:number,count:number,dx:number,dy=0)=>{for(let i=0;i<count;i++){ellipse(x+i*dx,y+i*dy,.65,.8,"#c0bda1");ellipse(x+i*dx+.2,y+i*dy+.5,.3,.4,"#4b5147");}};
 const wheel=(x:number,y:number,size=11)=>{ellipse(x+1,y+1,size*.7,size,"#202723");ellipse(x-1,y-1,size*.53,size*.82,gradient("#535b50","#242b26"));ellipse(x-2,y-1,size*.25,size*.43,"#8c917c");ellipse(x-2,y-1,1.2,2,"#373f36");for(let a=0;a<6;a++){const angle=a*Math.PI/3;line(x-1+Math.cos(angle)*size*.52,y+Math.sin(angle)*size*.78,x-1+Math.cos(angle)*size*.67,y+Math.sin(angle)*size,"#85806a",.6);}};
 const window=(points:number[][])=>{poly(points,gradient("#94b0b0","#263f46"));const [p,q]=points;line(p[0]+1,p[1]+1,q[0]-1,q[1]+1,"#d7ded0",.8);};
 const scratch=(x:number,y:number,w:number,h:number)=>{c.save();c.globalAlpha=.55;for(let i=0;i<35;i++){const a=x+random()*w,b=y+random()*h;line(a,b,a+random()*3,b-1,random()<.4?rust:"#b6b39b",.4);}c.restore();};
 const scorch=(x:number,y:number,rx:number,ry:number)=>{const g=c.createRadialGradient(x,y,0,x,y,Math.max(rx,ry));g.addColorStop(0,"#1d2420d9");g.addColorStop(1,"#25292000");ellipse(x,y,rx,ry,g);};
 const truckBase=(paint:string)=>{wheel(22,83,12);wheel(79,81,12);poly([[5,61],[87,54],[97,65],[92,83],[8,88]],gradient(paint,"#3d493d"));poly([[5,61],[14,51],[87,48],[97,65],[24,70]],gradient("#a0a389",paint));line(7,77,92,72,"#252e28",2);rect(5,80,13,4,"#999783");rect(88,75,9,5,"#bbb799");};
 switch(r.artifact){
 case "tank": {
  // Readable side silhouette: continuous caterpillar track, six road wheels,
  // a distinct turret and a long, snapped gun barrel. Wreckage, not a green box.
  poly([[5,64],[87,60],[97,69],[94,91],[83,98],[15,98],[3,88]],"#252c29",ink,1.5);
  rect(10,69,78,23,gradient("#5e6659","#353f36"),9);
  for(let i=0;i<6;i++){
    ellipse(20+i*12,82,6,8,gradient("#a2a287","#65715a"));
    ellipse(20+i*12,82,2.2,3,"#303b31");
  }
  for(let i=0;i<17;i++){const x=8+i*5;line(x,65,x+1,70,"#aaa58a",1.5);line(x,94,x+1,98,"#888876",1.2);}
  // Crumpled sloping hull and an exposed engine compartment.
  poly([[9,57],[22,43],[78,43],[94,58],[88,72],[16,73]],gradient("#929c77","#4a5945"),ink,1.1);
  poly([[18,56],[29,47],[74,47],[84,57]],"#adb08c");
  poly([[8,58],[21,58],[26,65],[19,69],[8,67]],"#222d29");
  line(12,57,24,63,rust,2);line(12,63,23,58,"#d6ad76",1.2);
  poly([[28,42],[32,24],[52,19],[68,28],[67,45],[54,52],[33,51]],gradient("#b1b491","#526448"),ink,1.2);
  poly([[32,44],[54,46],[67,38],[67,45],[54,52],[33,51]],"#44553e");
  // Oversized recognizable barrel, with a torn muzzle instead of a rounded tube.
  poly([[60,31],[91,30],[94,34],[91,39],[61,39]],gradient("#a0aa8e","#485b46"),ink,1.1);
  poly([[91,30],[99,29],[96,33],[99,37],[94,40],[91,39]],"#485447");
  line(95,32,96,37,"#131f1c",2);
  ellipse(44,25,9,4,"#1d2c26");
  poly([[37,21],[40,10],[50,14],[49,23]],"#a2ab83",ink,1.1);
  line(39,13,46,16,"#d5d7b7",1);
  // Missing armor plate, black scorch and a broken track hanging loose.
  poly([[62,52],[75,49],[80,53],[75,61],[63,60]],"#202b26");
  line(67,51,72,59,"#ba8258",1);line(71,51,68,59,"#77786a",1);
  poly([[82,83],[91,80],[95,91],[88,95],[82,91]],"#131f1b");
  line(86,90,94,98,"#777c69",2);line(91,96,98,94,"#777c69",2);
  rivets(21,69,9,7);scratch(24,47,38,20);scorch(69,58,15,13);
  // Faded roundel keeps the military identity clear without lettering.
  ellipse(42,36,4,5,"#d4caaa");ellipse(42,36,2,3,"#62765d");break;
 }
 case "plane": {
  // A broad winged aircraft silhouette, with cockpit, propeller and separate
  // broken tail. Larger shapes remain recognizable on the smallest wreck.
  poly([[39,47],[45,8],[57,3],[64,7],[56,46]],gradient("#d6d8ca","#83948f"),ink,1.2);
  line(49,13,45,44,"#647c78",1.1);
  poly([[39,58],[49,83],[60,94],[69,92],[56,58]],gradient("#c2c9bd","#6d8580"),ink,1.2);
  line(46,62,58,87,"#dce1d0",1.3);
  // Nose and fuselage have a clean airplane contour, not overlapping shards.
  poly([[5,49],[11,42],[27,40],[60,45],[71,48],[71,61],[59,65],[23,64],[10,59]],gradient("#d5d7bd","#80958d"),ink,1.3);
  poly([[11,59],[27,61],[60,60],[71,55],[71,61],[59,65],[23,64]],"#526e69");
  window([[24,43],[34,44],[40,49],[37,55],[23,54],[19,49]]);
  line(29,44,30,54,"#d9e3d6",1.2);
  // Obvious radial engine, broken two-blade propeller and bent undercarriage.
  ellipse(9,51,5,9,"#475951");ellipse(7,51,2.5,5,"#202f2b");
  line(6,49,2,36,"#394a42",2.5);line(6,53,11,65,"#394a42",2.5);
  line(27,65,23,77,"#475e54",1.8);wheel(23,78,5);
  // Broken tail sits at a different angle, exposing a jagged gap and cables.
  poly([[76,49],[91,48],[96,54],[93,62],[77,61],[80,57],[75,54]],gradient("#c0cbbb","#708c81"),ink,1.1);
  poly([[84,49],[85,29],[91,30],[95,50]],gradient("#a5b8a9","#607e72"),ink,1.1);
  poly([[82,57],[98,66],[96,71],[78,63]],"#b5c6b6");
  line(70,49,74,53,"#c2a06b",1);line(70,58,76,57,"#d1b27c",1);
  // Missing wing skin, exposed ribs and an unmistakably torn panel.
  poly([[43,28],[49,23],[54,28],[50,39],[43,38]],"#263c35");
  for(let i=0;i<3;i++)line(44,29+i*3,52-i,29+i*3,"#b6bca4",.8);
  poly([[48,49],[56,47],[62,52],[59,59],[51,58]],"#26382f");
  line(51,49,58,57,rust,1.5);scorch(54,54,13,12);
  ellipse(54,16,4.5,5,"#f0e6c8");ellipse(54,16,2.6,3,"#546f82");
  ellipse(57,81,4,4,"#e6ddbf");ellipse(57,81,2.2,2.2,"#546f82");
  poly([[76,82],[91,77],[98,84],[87,93],[78,90]],"#a5b9a7",ink,1.1);
  line(81,83,91,85,"#5a7468",1);scratch(17,58,27,5);break;
 }
 case "picnic": {
  line(23,57,13,94,"#4a4430",4);line(73,50,86,87,"#504931",4);line(21,68,82,74,"#6e5938",3);
  poly([[4,39],[75,23],[98,43],[27,64]],gradient("#c2965e","#8b623a"));poly([[27,64],[98,43],[98,50],[27,71]],"#765433");poly([[4,39],[27,64],[27,71],[4,46]],"#8d6840");
  for(let i=0;i<7;i++)line(10+i*10,38-i*2,31+i*9,59-i*2.6,"#6c5436",.6);
  poly([[25,35],[61,27],[83,47],[46,58]],"#d0d0ad");for(let i=0;i<5;i++){line(28+i*6,35-i*1.2,49+i*6,54-i*1.2,"#85916b",1.4);line(30+i*9,35-i*2,41+i*9,44-i*2,"#a1aa81",2);}
  ellipse(46,40,7,3,"#f1e8cc");ellipse(47,39,4,1.8,"#b6b798");rect(66,32,5,10,gradient("#a1724c","#643d2b"));ellipse(68,31,2.8,1,"#e5d8b3");
  poly([[4,76],[26,70],[40,80],[16,88]],"#c09861");poly([[16,88],[40,80],[39,94],[16,99]],"#85603a");poly([[4,76],[16,88],[16,99],[4,88]],"#a47c49");
  for(let i=0;i<5;i++){line(5+i*2,79+i*2,5+i*2,89+i*2,"#d1b080",.7);line(18+i*4,89-i*1.4,18+i*4,96-i,"#c09c68",.7);}
  line(17,74,17,69,"#715333",2);line(17,69,24,68,"#715333",2);poly([[79,20],[88,4],[98,14],[92,24]],"#96704e");line(90,17,89,67,"#6b6446",1.4);break;
 }
 case "tea-truck":
 case "supply-truck": {
  truckBase(r.artifact==="tea-truck"?"#697d67":"#7d8262");
  poly([[64,51],[63,28],[82,22],[94,39],[95,64],[72,69]],gradient("#9ca78c","#586e55"));
  poly([[64,28],[77,23],[87,25],[82,30]],"#b1b598");window([[69,33],[80,29],[88,41],[69,47]]);line(80,30,81,43,"#bfccbb",1);
  rect(74,53,7,1.8,"#c9c5a6",.5);line(67,50,67,65,"#374c3c");for(let i=0;i<5;i++)line(88+i,48,88+i,57,"#2d3e34",.7);
  ellipse(91,62,2.5,3,"#ddd3aa");ellipse(91,62,1.5,2,"#fbefd0");
  if(r.artifact==="tea-truck"){
   poly([[10,48],[12,26],[47,23],[54,43],[50,64],[14,68]],gradient("#d6d3b8","#8c9784"));ellipse(32,25,18,5,"#e4dec3");ellipse(32,23,12,2.5,"#a6ac96");rect(28,16,8,6,"#777e6c");
   line(12,31,4,35,"#c5c7ac",3);line(4,35,6,51,"#bfc4aa",3);line(6,51,14,56,"#9fae94",3);
   poly([[49,35],[58,27],[61,29],[56,44],[49,50]],"#c9cbb3");rect(26,43,13,10,"#8b9c84");line(28,47,36,46,"#d3d6b9");
  }else{
   poly([[5,30],[14,15],[54,14],[63,25],[62,61],[7,68]],gradient("#aba484","#707c5d"));poly([[14,15],[54,14],[63,25],[14,29],[5,30]],"#b5ae8d");
   for(let i=0;i<5;i++){line(15+i*9,30-i*.7,15+i*9,61-i*.7,"#5a694d",1);line(17+i*9,30-i*.7,17+i*9,57-i*.7,"#c5bea0",.5);}
   poly([[20,41],[40,36],[49,42],[28,48]],"#c8a878");poly([[28,48],[49,42],[49,61],[28,67]],"#94754c");poly([[20,41],[28,48],[28,67],[20,59]],"#b49361");line(29,49,47,59,"#d0b481",1.4);line(46,44,30,64,"#d0b481",1.4);
  }
  // Shattered windshield, crumpled hood and a missing cargo panel expose the wreck.
  line(72,34,79,40,"#172d2d",1.5);line(79,40,73,44,"#d4ddd0",1.2);line(79,40,85,36,"#172d2d",1.2);
  poly([[86,47],[97,45],[94,52],[98,58],[89,57]],"#34433b",ink,1);
  if(r.artifact==="supply-truck"){
   poly([[17,35],[27,33],[32,38],[28,50],[18,51],[20,43]],"#283a30",ink,1);
   line(19,37,29,46,"#bba174",1);line(19,46,29,37,"#bba174",1);
  }
  rivets(10,72,10,7,-.6);scratch(69,49,20,15);scorch(55,68,12,13);break;
 }
 case "tractor": {
  wheel(77,75,19);wheel(22,83,11);poly([[15,55],[62,48],[77,55],[75,78],[20,89]],gradient("#b4975f","#78603b"));
  poly([[13,34],[43,29],[57,37],[55,61],[17,68]],gradient("#cfad6a","#99783f"));poly([[17,68],[55,61],[57,37],[63,43],[61,66],[22,76]],"#7d653b");
  rect(24,16,3,22,"#4e5144");ellipse(26,15,4,2,"#262f29");poly([[56,21],[82,16],[90,24],[61,30]],"#7d8c67");line(62,30,62,52,"#555e46",2);line(85,27,83,50,"#465640",2);
  rect(64,46,13,6,"#333e31");line(65,42,59,38,"#434c37",1.7);line(56,35,62,36,"#323e31",2);
  for(let i=0;i<6;i++)line(20+i*3,42-i*.3,20+i*3,56-i*.3,"#424c37",1);line(82,66,98,47,"#5c674e",3);line(95,48,98,59,"#4b5946",3);
  scratch(19,36,32,25);scorch(43,56,8,10);break;
 }
 case "mess-hall":
 case "radio": {
  const radio=r.artifact==="radio",right=radio?71:96;
  poly([[5,45],[right-16,33],[right,44],[right,83],[21,98],[5,84]],gradient("#b8aa83","#7f805e"));
  poly([[21,57],[right,44],[right,83],[21,98]],gradient("#aaa17b","#686f55"));
  poly([[1,45],[21,18],[right-20,10],[right+3,43],[21,59]],gradient("#87917a","#495f4d"));
  for(let i=0;i<8;i++)line(8+i*7,43-i*1.3,22+i*7,24-i*1.1,"#a7ad91",.7);
  poly([[31,64],[43,61],[43,93],[31,96]],"#293e32");line(33,67,41,65,"#59684e",1);
  window([[53,60],[66,57],[66,73],[53,76]]);line(60,59,60,74,"#b0b79c",1);line(54,67,65,65,"#b0b79c",1);
  for(let j=0;j<4;j++)line(22,65+j*7,right-1,50+j*7,"#6c775d",.6);rivets(24,62,8,7,-1.5);
  if(radio){line(73,85,85,12,"#53675b",2.2);line(85,12,98,79,"#53675b",2.2);line(73,85,98,79,"#53675b",1);for(let j=0;j<4;j++)line(77+j*2,66-j*12,96-j*2,58-j*12,"#879286",.6);
   ellipse(86,18,12,10,gradient("#d3d0b9","#879b91"));ellipse(86,18,8,6,"#718b81");line(86,18,79,33,"#3d554b",1.5);
  }else{poly([[34,28],[51,13],[66,33],[53,47],[48,36]],"#273e32");line(35,29,53,44,"#b3a17a",1.7);line(10,76,84,85,"#c0a67c",3);line(20,80,70,95,"#7b6648",2);}
  scratch(24,67,45,20);scorch(25,54,10,14);break;
 }
 case "boat": {
  poly([[1,50],[79,37],[99,25],[94,64],[70,88],[23,100],[8,78]],gradient("#96a7a2","#455e59"));
  poly([[8,48],[78,39],[91,32],[85,58],[66,76],[26,85],[15,71]],"#c0b9a0");
  poly([[8,78],[24,91],[70,80],[94,60],[94,66],[70,88],[23,100]],"#3c514b");line(17,79,68,70,"#d0c7a7",1.4);
  for(let i=0;i<6;i++)line(22+i*8,53-i*1.2,29+i*8,77-i*1.2,"#968a6b",.6);
  poly([[32,34],[55,27],[66,35],[66,60],[36,68]],gradient("#d3cfb7","#9aab98"));poly([[29,34],[53,24],[68,33],[36,43]],"#e3dcc3");window([[39,46],[49,43],[49,55],[39,58]]);window([[53,42],[61,40],[61,51],[53,54]]);
  line(68,12,67,51,"#465b50",1.5);poly([[69,12],[81,16],[69,23]],"#9f5b45");ellipse(79,60,5,6,"#243d37");ellipse(79,60,2.7,3.8,"#a09d7e");
  poly([[18,77],[26,70],[33,80],[30,91],[26,84]],"#293e35");rivets(26,94,10,5,-1.5);scratch(20,82,48,10);break;
 }
 case "staff-car": {
  wheel(24,83,11);wheel(78,78,11);
  poly([[4,61],[21,49],[34,26],[67,20],[82,44],[96,52],[96,74],[11,88],[4,77]],gradient("#718975","#344c3e"));
  poly([[34,26],[67,20],[79,29],[44,37]],"#a0ad91");window([[28,49],[36,31],[43,39],[43,52]]);window([[48,38],[65,29],[76,45],[48,51]]);
  poly([[6,61],[26,55],[44,61],[20,71]],"#8a9b81");poly([[20,71],[44,61],[91,50],[96,55],[94,65],[22,80]],gradient("#718570","#4a6250"));
  line(47,55,47,72,"#263d32");rect(52,56,6,1.5,"#b5b79a",.5);rect(6,65,10,6,"#e4d2a6");rect(86,62,7,4,"#9a5640");
  for(let i=0;i<7;i++)line(10+i*2,74-i*.4,10+i*2,80-i*.4,"#25382d",.7);line(5,83,29,77,"#a7aa94",2);line(76,76,96,70,"#8c9a84",2);
  poly([[35,28],[42,14],[58,15],[62,24],[46,29]],"#4b6350");line(38,24,59,21,"#9eac8c",1.5);poly([[79,46],[88,47],[86,57],[77,54]],"#2c3d31");line(51,41,61,48,"#182e2b",1.6);line(55,44,66,36,"#e1e1cc",1);
  poly([[34,26],[41,20],[47,28],[53,22],[62,26],[46,31]],"#405348",ink,1);
  scratch(26,60,48,15);scorch(79,52,14,14);break;
 }
 case "bunker": {
  poly([[4,42],[70,28],[96,43],[96,80],[29,99],[4,79]],gradient("#aeb3a7","#6f7e75"));
  poly([[29,58],[96,43],[96,80],[29,99]],gradient("#939f94","#586c63"));
  poly([[0,40],[14,19],[70,11],[100,34],[96,48],[28,65]],gradient("#c6c8b8","#87978b"));
  poly([[0,40],[28,57],[100,34],[96,48],[28,65],[1,51]],"#667a6b");
  poly([[37,70],[84,58],[84,70],[37,82]],"#253c35");poly([[39,71],[82,61],[82,65],[39,76]],"#111f1c");
  line(36,84,86,71,"#b6beb0",1.3);line(12,54,12,78,"#728479",1);
  for(let i=0;i<7;i++){const x=34+i*8;ellipse(x,89-i*2.3,.9,1.2,"#465e54");line(x-1,88-i*2.3,x,87-i*2.3,"#c0c3ad",.7);}
  poly([[13,23],[27,19],[39,25],[31,33],[18,32]],"#7c8b69");poly([[56,17],[72,16],[84,25],[68,30],[56,25]],"#899575");scratch(34,83,45,8);break;
 }
 case "boulder": {
  const desert=biome==="desert"||biome==="dust",top=desert?"#d6bd91":"#b3b8a5",mid=desert?"#a58d69":"#7c8e80",dark=desert?"#826d52":"#526b60";
  poly([[2,66],[13,29],[38,10],[70,16],[94,45],[99,81],[72,97],[24,100],[0,85]],gradient(top,dark));
  poly([[13,29],[38,10],[61,19],[42,46],[6,64]],top);poly([[42,46],[61,19],[70,16],[94,45],[75,67]],mid);poly([[6,64],[42,46],[75,67],[72,97],[24,100],[0,85]],gradient(mid,dark));
  line(13,30,37,14,"#e0ddc3",1);line(41,45,60,22,"#ccd2ba",.8);line(12,65,38,51,"#b3c2ab",1);
  for(let i=0;i<60;i++){const x=8+random()*81,y=30+random()*55;c.save();c.globalAlpha=.3;ellipse(x,y,.3+random()*.9,.4+random()*.7,random()<.5?top:dark);c.restore();}
  poly([[65,83],[74,72],[85,79],[78,88]],"#80906e");poly([[20,84],[29,81],[35,89],[24,93]],"#859775");break;
 }
 }
 // Small grounded stones/debris and a soft contact shadow tie props to the terrain.
 c.globalAlpha=.28;ellipse(50,97,43,3,"#293c2d");c.globalAlpha=1;
 c.restore();
}

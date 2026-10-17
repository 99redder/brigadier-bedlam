import type Phaser from "phaser";
import type { Cover } from "../sim/data";

// Code-drawn silhouettes keep the established cartoon style and stay crisp at any scale.
// Coordinates fit the cover's footprint; damage and collision remain simulation-owned.
export function drawArtifact(g: Phaser.GameObjects.Graphics, r: Cover) {
  const height=Math.max(54,r.h*.74+18), sx=r.w/100, sy=height/100;
  const x=(n:number)=>n*sx, y=(n:number)=>(n-100)*sy;
  const rect=(a:number,b:number,w:number,h:number,c:number,round=3)=>{
    g.fillStyle(c);g.fillRoundedRect(x(a),y(b),x(w),h*sy,round);
    g.lineStyle(2,0x303d36);g.strokeRoundedRect(x(a),y(b),x(w),h*sy,round);
  };
  const poly=(pts:number[][],c:number)=>{
    const p=pts.map(([a,b])=>({x:x(a),y:y(b)}));g.fillStyle(c);g.fillPoints(p,true);g.lineStyle(2,0x303d36);g.strokePoints(p,true,true);
  };
  const ellipse=(a:number,b:number,w:number,h:number,c:number)=>{g.fillStyle(c);g.fillEllipse(x(a),y(b),x(w),h*sy);};
  const line=(a:number,b:number,c:number,d:number,color=0x303d36,width=2)=>{g.lineStyle(width,color);g.lineBetween(x(a),y(b),x(c),y(d));};
  const wheels=(big=false)=>{
    for(const a of [22,79]) {ellipse(a,85,big?28:19,big?35:25,0x283832);ellipse(a,85,big?13:8,big?18:12,0x8b8b68);}
  };
  switch(r.artifact){
    case "tank":
      rect(2,65,96,29,0x293d35,9);
      for(let a=12;a<96;a+=16) {ellipse(a,80,13,19,0x737b64);ellipse(a,80,6,8,0x35493c);}
      poly([[7,65],[17,38],[72,34],[94,60],[90,73],[12,73]],0x697553);
      rect(31,18,39,25,0x7b8261,6);poly([[64,22],[81,24],[82,33],[64,33]],0x414c3e);poly([[83,35],[96,42],[94,49],[82,43]],0x414c3e);
      ellipse(45,20,18,8,0x252e2b);ellipse(28,56,20,22,0x303a31);
      ellipse(59,51,24,24,0x3a3c30);ellipse(61,51,13,15,0x995d3d);poly([[6,79],[22,77],[20,94],[4,96]],0x26352e);line(20,40,39,36,0xa0a181,3);line(69,45,79,62,0x3b3a2e,4);break;
    case "plane":
      poly([[7,76],[31,49],[18,20],[37,23],[57,46],[95,55],[98,70],[59,67],[38,91],[21,88],[34,65]],0xb0b3a0);
      poly([[14,45],[75,35],[93,43],[79,58],[16,60],[4,50]],0x7b8983);
      poly([[58,37],[72,34],[76,45],[57,48]],0x344d51);
      ellipse(46,50,14,15,0x343b35);line(38,45,48,59,0xe0bf76,3);
      poly([[73,75],[93,78],[94,88],[71,86]],0x8b968b);line(78,40,89,46,0x303d36,3);break;
    case "picnic":
      poly([[6,52],[77,35],[97,56],[26,76]],0x996d43);
      poly([[8,49],[76,34],[94,52],[25,72]],0xbbc58c);
      for(let a=22;a<77;a+=17)line(a,45,a+8,62,0xe8dfb5,3);
      line(18,65,13,91,0x695438,5);line(76,62,83,91,0x695438,5);
      rect(7,76,28,19,0xba8a51);line(11,81,30,81,0xe4c18a);
      ellipse(48,52,15,9,0xede9cc);ellipse(70,49,12,8,0xe5dec0);
      poly([[56,24],[72,7],[92,17],[81,31]],0xb56346);line(77,24,88,66,0x756245,3);break;
    case "tea-truck":
      wheels();rect(8,58,85,22,0x647e68);rect(62,34,29,31,0x82957c);rect(68,39,17,14,0x364f50);
      rect(14,26,38,34,0xb8bca1,8);ellipse(33,24,31,10,0xd2d2b7);rect(28,16,10,9,0x6a775e);
      poly([[50,33],[66,21],[64,37],[50,48]],0xc4c4a7);line(15,31,6,38,0xd9d7b5,5);line(6,38,15,50,0xd9d7b5,5);
      ellipse(78,61,16,13,0x38463b);break;
    case "tractor":
      wheels(true);rect(13,52,72,25,0x9c794b);rect(18,31,38,25,0xc29a59);rect(61,25,14,38,0x6d7656);
      rect(55,13,28,10,0x687e5c);rect(25,10,5,24,0x41463a);ellipse(28,8,14,7,0x383e36);
      for(let a=23;a<49;a+=7)line(a,39,a,48,0x4d583f,2);line(78,60,94,43,0x4e5b45,5);ellipse(22,97,34,8,0x6f6243);ellipse(79,97,32,8,0x6f6243);break;
    case "supply-truck":
      wheels();rect(4,32,59,44,0x7e8766);rect(65,43,29,34,0x89926b);rect(69,46,16,15,0x314e4e);
      poly([[5,31],[19,16],[59,21],[64,34]],0x9f9471);
      for(let a=9;a<60;a+=16)line(a,36,a,68,0xb5ac83,2);
      rect(22,38,24,26,0xb99861);line(24,41,43,60,0x70583b,3);line(43,41,24,60,0x70583b,3);ellipse(75,70,15,12,0x354535);break;
    case "mess-hall":
      rect(4,48,92,45,0x9a8860);poly([[0,47],[25,19],[48,40],[63,14],[99,48],[68,55],[44,44],[20,56]],0x626f55);
      rect(14,65,19,28,0x3d4838);rect(62,59,20,18,0x394c42);line(6,82,90,52,0xceb582,4);line(18,55,87,89,0xc1a777,4);
      ellipse(46,67,15,11,0xd0c7a1);rect(39,64,14,5,0x696950);break;
    case "boat":
      poly([[0,54],[86,51],[100,38],[89,82],[29,96],[11,80]],0x667e7c);
      poly([[7,53],[82,54],[92,47],[82,68],[26,79],[15,69]],0xa5a18a);
      rect(34,25,30,31,0xc3c0a0);rect(39,29,18,14,0x395453);
      line(63,10,61,54,0x394d43,3);poly([[65,9],[81,15],[64,21]],0xb46044);
      line(28,79,37,64,0x2e3c36,4);line(37,64,44,84,0x2e3c36,3);ellipse(74,67,13,13,0x344640);break;
    case "staff-car":
      wheels();poly([[4,65],[23,55],[32,30],[69,27],[82,55],[96,64],[92,80],[7,80]],0x4b6354);
      poly([[36,34],[53,33],[53,52],[28,55]],0x90a6a0);poly([[58,33],[67,32],[77,53],[58,52]],0x9bb1a6);
      rect(9,60,15,10,0xd8c793);rect(83,63,10,7,0xb95742);
      ellipse(48,24,27,9,0x3d4b3d);rect(38,12,19,11,0x5d7153);rect(44,17,6,4,0xddba69);
      poly([[5,57],[22,63],[14,72],[2,66]],0x817957);line(65,61,79,77,0x273b31,4);line(73,63,90,56,0x273b31,3);line(37,35,47,48,0x354c43,2);break;
    case "radio":
      rect(6,47,63,43,0x7c8467);poly([[3,47],[34,24],[73,48]],0x4a6250);rect(17,61,19,30,0x33473c);
      rect(43,57,16,14,0xc6b77e);line(50,59,50,68,0x505c43);line(44,64,57,64,0x505c43);
      line(70,81,86,22,0x394e42,5);line(70,81,95,62,0x66735a,4);
      poly([[63,15],[85,7],[96,23],[86,39],[70,30]],0xb6b5a0);ellipse(82,23,12,11,0x586d60);line(82,23,68,40,0x354d42,3);poly([[8,43],[23,35],[33,47],[21,52]],0x354c3e);line(57,78,65,88,0x334238,3);break;
  }
  // Permanent scorch and broken panels distinguish wrecks from working vehicles.
  if(r.artifact!=="picnic") {ellipse(14,71,10,9,0x384137);line(14,70,21,58,0x303b34,2);}
}

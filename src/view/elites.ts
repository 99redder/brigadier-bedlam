import { ELITES, type EliteId } from "../sim/elites";

export const eliteKey = (elite: EliteId, base: string) => `${elite}-${base}`;
// Broad silhouettes and oversized expressions remain readable at battlefield scale.
export function drawEliteUniform(c: CanvasRenderingContext2D, id: EliteId, crouched=false) {
  c.save();
  if(crouched){c.translate(0,16);c.scale(1,.82);}
  c.lineJoin="round";c.lineCap="round";c.lineWidth=2;c.strokeStyle="#202d34";
  const ink="#202d34", navy="#26384d", gold="#efc56b", pale="#fff0c3";
  const box=(x:number,y:number,w:number,h:number,color:string,r=2)=>{
    c.fillStyle=color;c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();c.stroke();
  };
  const shape=(points:number[][],color:string,width=2)=>{
    c.fillStyle=color;c.strokeStyle=ink;c.lineWidth=width;c.beginPath();
    points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();
  };
  const line=(points:number[][],color=ink,width=2)=>{
    c.strokeStyle=color;c.lineWidth=width;c.beginPath();
    points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
  };
  const rivet=(x:number,y:number)=>{c.fillStyle=pale;c.beginPath();c.arc(x,y,1.2,0,Math.PI*2);c.fill();};
  if(id==="crackshot") {
    // An absurdly stern parade-ground villain: huge cap, winged moustache,
    // angry amber shooting glasses and far too many medals for one chest.
    box(26,39,29,11,navy);
    shape([[12,40],[25,35],[32,42],[25,49],[12,47]],navy);
    shape([[49,41],[56,35],[67,40],[67,47],[54,49]],navy);
    line([[14,41],[25,39],[28,42]],gold,3);line([[53,42],[56,39],[64,41]],gold,3);
    for(const x of [15,20,25,55,60,65])line([[x,45],[x,49]],gold,1.5);
    shape([[23,18],[19,4],[30,1],[54,4],[59,17]],navy);
    box(23,14,35,6,gold);
    shape([[17,20],[59,19],[64,24],[26,25]],navy);
    // Oversized officer's badge: a stern little skull with a crooked jaw.
    box(34,5,12,8,pale,4);box(37,11,6,4,pale,1);
    box(36,8,3,2,ink,0);box(42,8,3,2,ink,0);
    shape([[28,27],[40,29],[39,33],[29,32]],"#dca34a");
    shape([[42,29],[54,26],[53,32],[43,33]],"#dca34a");
    line([[27,25],[39,28]],ink,3);line([[43,28],[55,24]],ink,3);
    line([[40,29],[43,29]],gold,2);
    shape([[40,34],[34,33],[26,36],[24,32],[25,39],[34,39],[41,36],[48,39],[57,38],[57,31],[53,35],[47,33]],"#41372d");
    line([[38,41],[46,40],[51,42]],ink,2);
    // The rifle remains exposed; the chunky scope makes the threat obvious.
    box(48,42,24,6,navy);box(50,41,5,8,gold);box(68,41,6,8,navy);
    line([[58,44],[65,44]],"#f3d69a",1);
    box(26,65,29,5,navy);box(36,64,8,7,gold);
    for(const [x,y] of [[27,57],[34,58],[28,63]]) {
      box(x,y,4,3,"#b9403b",0);
      shape([[x,y+3],[x+4,y+3],[x+5,y+7],[x+2,y+9],[x-1,y+7]],gold);
    }
  } else {
    // A walking ammunition cupboard: square jaw, tiny furious eyes,
    // enormous shoulder plates and a launcher with a ridiculous shark grin.
    box(21,38,39,32,navy,5);
    shape([[4,38],[12,31],[24,35],[28,47],[9,49]],navy);
    shape([[53,36],[67,31],[76,39],[72,49],[55,47]],navy);
    shape([[8,35],[8,27],[15,32]],gold);shape([[64,32],[71,26],[72,36]],gold);
    line([[8,39],[20,37],[23,42]],gold,3);line([[59,39],[67,36],[72,40]],gold,3);
    for(const [x,y] of [[10,44],[21,44],[59,44],[70,44],[27,65],[54,65]])rivet(x,y);
    box(18,2,43,18,navy,6);box(16,17,48,6,"#465363");
    box(24,7,31,5,gold);line([[27,8],[32,11],[37,8],[42,11],[47,8]],ink,1.5);
    box(24,23,32,8,"#121f29");
    shape([[27,25],[37,28],[27,28]],"#ffb65e",.6);
    shape([[44,28],[53,24],[53,28]],"#ffb65e",.6);
    box(27,31,28,11,"#bb8a66",4);
    box(34,34,19,7,pale,2);
    for(const x of [39,45,50])line([[x,35],[x,40]],ink,1);
    line([[30,31],[34,33]],ink,2);line([[52,31],[55,30]],ink,2);
    // Repaint the launcher in charcoal, with hazard bands and comic teeth.
    box(31,36,47,19,"#3c4950",5);box(38,36,7,19,gold);
    line([[39,39],[44,43]],ink,2);line([[39,46],[44,50]],ink,2);
    box(57,38,16,6,"#b94438");
    shape([[55,47],[72,46],[70,53],[57,52]],"#9f3f36");
    for(const x of [57,63,69])shape([[x,47],[x+4,47],[x+2,51]],pale,.7);
    box(74,39,4,12,"#16282c");
    box(28,60,24,7,"#465363");box(34,59,12,9,gold);
    // A ludicrously large buckle, shaped like a cartoon bomb.
    c.fillStyle=ink;c.beginPath();c.arc(40,64,3,0,Math.PI*2);c.fill();
    line([[42,62],[44,59],[47,60]],ink,1.5);
  }
  c.restore();
}
export const eliteCaption = (id: EliteId) => `★ ${ELITES[id].short}`;

import type Phaser from "phaser";
// Presentation uses simulation time: pausing freezes rain without touching simulation RNG.
export function drawRain(g:Phaser.GameObjects.Graphics,time:number) {
  g.lineStyle(1.2,0xd5e8ec,.42);
  for(let i=0;i<85;i++) {
    const x=68+(i*137.23)%1118, y=94+((i*83.71+time*225)%436);
    g.lineBetween(x,y,x-5,y+13);
  }
  g.lineStyle(1,0xc0d9d6,.28);
  for(let i=0;i<18;i++) {
    const phase=(time*1.6+i*.39)%1;
    const x=90+(i*113.7)%1060,y=145+(i*63.3)%370;
    g.strokeEllipse(x,y,3+phase*9,1+phase*3);
  }
}

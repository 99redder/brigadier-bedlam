import { ELITES, type EliteId } from "../sim/elites";

export const eliteKey = (elite: EliteId, base: string) => `${elite}-${base}`;
// Uniform overlays use the same canvas scale and gait as the normal character.
export function drawEliteUniform(c: CanvasRenderingContext2D, id: EliteId, crouched=false) {
  c.save();
  if(crouched){c.translate(0,16);c.scale(1,.82);}
  c.lineJoin="round";c.lineWidth=2;c.strokeStyle="#202d34";
  const box=(x:number,y:number,w:number,h:number,color:string)=>{
    c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,2);c.fill();c.stroke();
  };
  if(id==="crackshot") {
    // Navy tunic, gold epaulettes, shooting goggles and a conspicuous rifle scope.
    box(28,40,23,10,"#354b69");box(17,39,10,5,"#efd17a");box(51,39,10,5,"#efd17a");
    box(24,8,32,12,"#354b69");box(29,10,6,7,"#efd17a");
    box(29,27,11,7,"#d6eeef");box(43,27,11,7,"#d6eeef");
    c.beginPath();c.moveTo(40,29);c.lineTo(43,29);c.stroke();
    box(51,43,18,5,"#263c43");box(53,42,3,7,"#e9c46c");
  } else {
    // Black-and-gold shoulder plates, visor and hazard bands on the launcher.
    box(20,4,39,13,"#354052");box(27,7,24,3,"#efc267");
    box(25,23,29,6,"#c5e1e9");box(10,37,15,9,"#efc267");box(55,37,15,9,"#efc267");
    box(38,37,7,17,"#eac36a");box(61,37,5,17,"#eac36a");
    box(27,58,24,6,"#354052");
  }
  c.restore();
}
export const eliteCaption = (id: EliteId) => `★ ${ELITES[id].short}`;

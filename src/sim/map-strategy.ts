import { orientPoint } from "./orientation";
import type { Battle, Soldier, SuperWeapon } from "./battle";
import { blocked, distance, pathfind, safePoint, type Point } from "./geometry";
import { TUNING } from "./data";

type XY = readonly [number,number];
interface Playbook {
  name:string; advance:readonly XY[]; flank:readonly XY[]; overwatch:XY; screen:XY; reserve:XY;
  watch:XY; drops:readonly number[];
}
// Rehearsed terrain knowledge: these are map routes and objectives, never player orders.
export const MAP_PLAYBOOKS:readonly Playbook[]=[
 {name:"The Northern Picnic",advance:[[650,35],[375,35],[390,210]],flank:[[650,35],[375,35],[390,455]],overwatch:[660,240],screen:[690,325],reserve:[760,455],watch:[390,275],drops:[2,0,1]},
 {name:"Sunstroke Southern Hook",advance:[[835,525],[625,525],[580,440]],flank:[[835,525],[625,525],[450,300]],overwatch:[600,235],screen:[705,215],reserve:[570,115],watch:[605,385],drops:[1,2,0]},
 {name:"The Kettle Pincer",advance:[[760,105],[560,105],[420,275]],flank:[[760,105],[560,105],[330,445]],overwatch:[660,300],screen:[610,455],reserve:[690,245],watch:[550,245],drops:[1,2,0]},
 {name:"Moustache Around Both Ends",advance:[[810,40],[375,40],[290,160]],flank:[[815,520],[300,520],[280,380]],overwatch:[800,260],screen:[800,330],reserve:[800,180],watch:[620,290],drops:[1,0,2]},
 {name:"The Broken Wing Sweep",advance:[[710,455],[490,455],[410,300]],flank:[[710,455],[490,455],[300,235]],overwatch:[735,275],screen:[735,455],reserve:[540,85],watch:[650,315],drops:[1,0,2]},
 {name:"Quartermaster's Crossfire",advance:[[565,175],[350,215],[375,300]],flank:[[565,175],[350,215],[270,465]],overwatch:[590,260],screen:[750,350],reserve:[770,115],watch:[570,215],drops:[2,0,1]},
 {name:"Lunch Before the Long Way",advance:[[800,75],[440,75],[290,285]],flank:[[700,455],[400,455],[280,340]],overwatch:[810,285],screen:[805,445],reserve:[700,75],watch:[630,305],drops:[1,2,0]},
 {name:"The Soggy Southern Shuffle",advance:[[805,475],[430,475],[290,420]],flank:[[700,105],[410,105],[290,230]],overwatch:[815,260],screen:[790,400],reserve:[760,65],watch:[640,245],drops:[1,2,0]},
 {name:"Brass Hat's Back Door",advance:[[785,525],[410,525],[400,315]],flank:[[785,525],[410,525],[300,300]],overwatch:[650,245],screen:[715,310],reserve:[700,75],watch:[650,275],drops:[2,0,1]},
 {name:"Operation Cold Shoulder",advance:[[850,35],[585,35],[440,200]],flank:[[850,35],[585,35],[320,280]],overwatch:[735,260],screen:[600,390],reserve:[780,320],watch:[500,315],drops:[2,0,1]},
];
export interface MapOrder {
  unitId:number;role:"assault"|"flank"|"overwatch"|"screen"|"reserve";
  route:Point[];index:number;watch:Point;departAt:number;arrivedAt?:number;finished:boolean;progressAt:number;position:Point;
}
export interface EnemyMapPlan {mapId:number;name:string;duration:number;orders:MapOrder[];}
const point=([x,y]:XY):Point=>({x,y});
export function prepareMapPlan(b:Battle):EnemyMapPlan|null {
 if(!b.operation||b.training||!b.challenge?.mapIntel)return null;
 const spec=MAP_PLAYBOOKS[b.operation.mapId],dry=b.dryCover();
 const units=b.soldiers.filter(s=>s.side===1);
 const loss={lobber:0,torch:1,rifleman:2,sapper:3,bazooka:4};
 const priority=b.supplies.find(d=>d.id===spec.drops[0]);
 const runner=[...units].sort((a,z)=>loss[a.classId]*120+(priority?distance(a,priority)*.2:0)-loss[z.classId]*120-(priority?distance(z,priority)*.2:0)||a.id-z.id)[0];
 // Heavy weapons cover the approaches; the fastest armed troop takes the long flank.
 const overwatch=units.length>=4?[...units].filter(s=>s!==runner).sort((a,z)=>b.weaponRange(z)-b.weaponRange(a)||a.id-z.id)[0]:undefined;
 const flank=[...units].filter(s=>s!==overwatch&&s!==runner).sort((a,z)=>b.landSpeed(z)*b.movementMultiplier(z)-b.landSpeed(a)*b.movementMultiplier(a)||a.id-z.id)[0];
 const rest=units.filter(s=>s!==overwatch&&s!==flank&&s!==runner);
 const full=b.operation.mode==="hard"||b.operation.level>=7;
 const orders=units.map(s=>{
   const role:MapOrder["role"]=s===runner?"reserve":s===overwatch?"overwatch":s===flank?(full?"flank":"assault"):s===rest[0]?"assault":s===rest[1]?"screen":"reserve";
   const raw=role==="assault"?spec.advance:role==="flank"?spec.flank:[spec[role]];
   const route=raw.map(p=>safePoint(orientPoint(point(p),b.operation!.mapId),dry));
   return {unitId:s.id,role,route,index:0,watch:orientPoint(point(spec.watch),b.operation!.mapId),departAt:role==="overwatch"?4:role==="screen"?1.5:role==="flank"?.8:0,finished:false,progressAt:0,position:{x:s.x,y:s.y}};
 });
 return {mapId:b.operation.mapId,name:spec.name,duration:b.operation.mode==="hard"?100:b.operation.mode==="medium"?85:65,orders};
}
export function mapOpeningOrder(b:Battle,s:Soldier):boolean {
 const plan=b.enemyMapPlan;
 if(!plan||s.side!==1||s.life!=="alive"||s.brawl!==null||s.drowningTime>0||b.planning||b.time>plan.duration||s.unarmed||s.recoveringGear||s.coverPlan||s.takingCover||b.inWater(s))return false;
 const order=plan.orders.find(o=>o.unitId===s.id);
 if(!order||order.finished)return false;
 // Rehearsal never takes priority over an actual engagement or immediate danger.
 if(s.burnRemaining>0||b.strikes.some(a=>!a.impacted&&distance(s,a.point)<TUNING.airstrikeRadius+30)||b.threatAt(s,s)>0||b.soldiers.some(t=>t.side!==s.side&&t.life==="alive"&&distance(s,t)<=b.weaponRange(s)+50))return false;
 if(b.time<order.departAt){s.hold=true;s.path=[];s.goal=null;s.target=null;s.terrainTarget=null;return true;}
 if(distance(s,order.position)>8){order.position={x:s.x,y:s.y};order.progressAt=b.time;}
 const goal=order.route[order.index];
 if(goal&&(distance(s,goal)<24||(!s.path.length&&distance(s,goal)<80))){order.index++;order.progressAt=b.time;}
 if(order.index>=order.route.length){
   order.arrivedAt??=b.time;
   if(b.time-order.arrivedAt>6){order.finished=true;return false;}
   s.path=[];s.goal=null;s.target=null;s.terrainTarget=null;s.hold=true;
   b.aimAi(s,order.watch);return true;
 }
 if(b.time-order.progressAt>12){order.finished=true;return false;}
 const next=order.route[order.index];
 if(!s.path.length||!s.goal||distance(s.goal,next)>80){
   const route=pathfind(s,next,b.dryCover());
   if(!route.length){order.finished=true;return false;}
   s.hold=false;s.target=null;s.terrainTarget=null;s.watchAngle=undefined;
   b.setGoal(s,next,true);
 }
 return true;
}
export function mapRewardCost(b:Battle,id:number,kind:"supply"|"chest") {
 if(!b.enemyMapPlan)return 0;
 if(kind==="chest")return -45;
 const rank=MAP_PLAYBOOKS[b.enemyMapPlan.mapId].drops.indexOf(id);
 return rank<0?0:rank*85;
}
export function mapRunnerRoleCost(b:Battle,id:number) {
 const role=b.enemyMapPlan?.orders.find(o=>o.unitId===id)?.role;
 return role==="reserve"?-100:role==="flank"?80:0;
}
export function enemySupportTarget(b:Battle,weapon:SuperWeapon):Point|undefined {
 const foes=b.soldiers.filter(s=>s.side===0&&s.life==="alive"&&s.drowningTime<=0);
 if(weapon==="sniper")return [...foes].sort((a,z)=>{
   const value=(s:Soldier)=>s.unarmed?0:s.classId==="bazooka"?6:s.classId==="lobber"?4:s.classId==="torch"?3:2;
   return value(z)-value(a)||a.id-z.id;
 })[0];
 const friends=b.soldiers.filter(s=>s.side===1&&s.life==="alive");
 const candidates:Point[]=[...foes];
 for(let i=0;i<foes.length;i++)for(let j=i+1;j<foes.length;j++)
   if(distance(foes[i],foes[j])<TUNING.airstrikeRadius*1.8)candidates.push({x:(foes[i].x+foes[j].x)/2,y:(foes[i].y+foes[j].y)/2});
 const score=(p:Point)=>foes.reduce((n,s)=>n+(distance(p,s)<TUNING.airstrikeRadius&&!blocked(p,s,b.cover)?(s.unarmed ? .6 : 1):0),0)
   -friends.filter(s=>distance(p,s)<TUNING.airstrikeRadius+40).length*3;
 candidates.sort((a,z)=>score(z)-score(a)||a.x-z.x||a.y-z.y);
 return candidates[0]&&score(candidates[0])>0?candidates[0]:undefined;
}

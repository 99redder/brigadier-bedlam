import { fortuneLabel } from "./luck";
import { ENVIRONMENTS, type Environment } from "./environments";
import { type ArtifactKind, type Cover, type Rect } from "./data";
export interface MapSpec {
  id: number; name: string; briefing: string;
  ground: number; waterColor: number; environment: Environment;
  cover: Cover[]; water: Rect[]; bridges: Rect[];
  layout: "river" | "lake"; terrainAdvice: string; rewardZone?: Rect;
  supplies: { x: number; y: number; label: string }[];
}
// Actual shoreline geometry, crossings and objectives are authored together.
// Bands form one continuous silhouette and are shared by rendering and hazards.
interface Layout {
  name: string; advice: string; layout: "river" | "lake";
  start: number; banks: readonly (readonly [number, number])[];
  bridgeBand: number; drops: readonly (readonly [number, number])[];
  rows: readonly number[]; rewardZone?: Rect;
}
const designs: Layout[] = [
  {name:"Picnic Panic", layout:"river", start:0,
    advice:"The creek bends east. Cross safely at the north bridge or risk the central water drop.",
    banks:[[425,495],[395,485],[440,520],[480,580],[530,610],[565,655],[550,630],[510,590]], bridgeBand:0,
    drops:[[530,245],[390,275],[690,450]],rows:[120,300,430]},
  {name:"Sunstroke Salute", layout:"river", start:0,
    advice:"A diagonal river cuts from northwest to southeast. The southern bridge is a long detour; supplies follow the bends.",
    banks:[[315,405],[355,455],[395,505],[435,565],[495,635],[555,685],[610,730],[665,775]], bridgeBand:7,
    drops:[[450,175],[605,385],[535,65]],rows:[80,245,410]},
  {name:"Tea Break Trenches", layout:"river", start:0,
    advice:"A westward dogleg splits the firing lanes. The northeast bridge is safe, but the western bend holds two rewards.",
    banks:[[600,700],[595,705],[565,675],[485,615],[440,540],[385,475],[380,480],[415,505]], bridgeBand:1,
    drops:[[430,385],[550,245],[570,490]],rows:[145,280,455]},
  {name:"Muddy Moustache", layout:"lake", start:70,
    advice:"A broad central mud lake holds EVERY reward, including timed chests. Circle either shore for combat; swim for supplies. The north bridge skirts its narrow head.",
    banks:[[450,650],[370,730],[330,770],[330,770],[390,710],[460,640]], bridgeBand:0,
    drops:[[475,235],[620,290],[510,375]],rows:[100,320,465], rewardZone:{x:440,y:210,w:220,h:180}},
  {name:"Crooked Crossing", layout:"river", start:0,
    advice:"A Z-shaped river widens into a central reach. Supplies lie on three different bends; the southwest bridge opens a flanking route.",
    banks:[[375,485],[405,515],[440,600],[505,655],[595,705],[600,700],[530,670],[485,595]], bridgeBand:6,
    drops:[[460,105],[650,315],[460,455]],rows:[65,230,390]},
  {name:"Quartermaster's Folly", layout:"river", start:0,
    advice:"A serpentine channel snakes between the wrecks. The western bridge and eastern supply bend pull troops in opposite directions.",
    banks:[[515,645],[430,570],[402,498],[440,560],[525,655],[607,713],[545,675],[477,603]], bridgeBand:2,
    drops:[[580,315],[660,385],[570,215]],rows:[110,285,450]},
  {name:"The Long Lunch", layout:"lake", start:140,
    advice:"A sprawling southern lake leaves a broad northern land route. EVERY reward floats in the lake's middle; the southern bridge is the long way around.",
    banks:[[460,620],[350,740],[320,780],[365,740],[440,650]], bridgeBand:4,
    drops:[[465,260],[630,305],[520,375]],rows:[75,250,425], rewardZone:{x:430,y:235,w:240,h:150}},
  {name:"Soggy Bottom", layout:"lake", start:70,
    advice:"A rain-swollen northern lake leaves the southern shore open. EVERY reward is offshore. Use the north bridge to flank, or send a light swimmer into the middle.",
    banks:[[450,650],[350,730],[310,790],[340,760],[440,660]], bridgeBand:0,
    drops:[[470,185],[640,245],[510,325]],rows:[140,305,460], rewardZone:{x:430,y:170,w:240,h:150}},
  {name:"Brass Hat Bottleneck", layout:"river", start:0,
    advice:"Wide upper and lower basins squeeze into a narrow central channel. Race for the central bank reward or contest the two basin drops.",
    banks:[[395,645],[410,630],[465,615],[510,590],[510,590],[490,650],[470,710],[450,730]], bridgeBand:6,
    drops:[[520,105],[590,525],[650,275]],rows:[90,260,435]},
  {name:"Frostbite Fiasco", layout:"river", start:0,
    advice:"An icy diagonal river runs northeast to southwest. The remote northeast bridge is safe; the river reward and two opposite-bank caches demand separate routes.",
    banks:[[645,775],[600,720],[535,685],[500,620],[430,570],[387,513],[335,445],[297,403]], bridgeBand:0,
    drops:[[500,315],[450,210],[650,485]],rows:[60,220,400]},
];
// Landmark footprints are authored per map. They use the same solid-cover simulation as rocks.
const landmarks: {kind:ArtifactKind; label:string; briefing:string; footprints:number[][]}[] = [
  {kind:"picnic",label:"OFFICERS' PICNIC",briefing:"Overturned picnic tables and abandoned hampers shelter a lunch nobody ordered.",footprints:[[205,110,170,72],[715,350,165,68],[315,370,104,46],[735,125,112,48]]},
  {kind:"tank",label:"TANK: OUT OF ORDER",briefing:"Burned-out tanks block long firing lanes. Demolish a hull to open the tank graveyard.",footprints:[[205,185,184,78],[720,285,180,76],[300,420,120,58],[705,75,132,62]]},
  {kind:"tea-truck",label:"TEA CONVOY",briefing:"Wrecked tea wagons make staggered shelters. The kettle is cold; the firing lanes are not.",footprints:[[220,315,174,70],[710,135,176,70],[305,95,112,52],[720,420,128,56]]},
  {kind:"tractor",label:"BOGGED RECOVERY TRACTOR",briefing:"Abandoned recovery tractors are stuck axle-deep. Their broad wheels provide solid cover.",footprints:[[200,225,180,80],[725,355,174,78],[290,65,128,58],[705,140,126,58]]},
  {kind:"plane",label:"UNSCHEDULED LANDING",briefing:"Broken aircraft wings and scorched fuselages divide the banks. Blast through a wreck to make a route.",footprints:[[205,110,208,90],[685,335,208,90],[285,375,130,60],[720,110,140,64]]},
  {kind:"supply-truck",label:"MISPLACED SUPPLIES",briefing:"Overloaded supply lorries shed crates across the depot. Truck wrecks shelter both approaches.",footprints:[[205,350,190,76],[710,180,190,76],[295,120,124,54],[705,400,130,56]]},
  {kind:"mess-hall",label:"MESS HALL: CLOSED",briefing:"Collapsed mess halls and splintered serving counters turn the long lunch into a flanking problem.",footprints:[[200,170,200,82],[700,330,200,82],[285,400,132,56],[710,95,138,58]]},
  {kind:"boat",label:"DRY-DOCK DISASTER",briefing:"Stranded patrol boats sit on both banks. Their battered hulls shield troops until blasted apart.",footprints:[[205,305,205,74],[690,145,205,74],[290,95,130,54],[715,400,134,54]]},
  {kind:"staff-car",label:"BRASS HAT PARKING",briefing:"Crumpled staff cars form an extremely unofficial motorcade. Open a lane through the wrecks.",footprints:[[210,180,180,68],[715,355,180,68],[295,415,122,52],[715,110,132,54]]},
  {kind:"radio",label:"LAST ORDERS OUTPOST",briefing:"Toppled aerials and ruined radio huts make a final defensive line. The complaints desk is offline.",footprints:[[205,330,190,84],[705,145,190,84],[285,105,132,62],[710,395,136,62]]},
];
export const MAPS: MapSpec[] = designs.map((design,id) => {
  const {name,advice,layout,rows,rewardZone}=design;
  const water = design.banks.map(([left,right],i) => ({x:left,y:design.start+i*70,w:right-left,h:70}));
  const crossing=water[design.bridgeBand];
  const bridges = [{x:crossing.x-26,y:crossing.y+4,w:crossing.w+52,h:62}];
  const theme=landmarks[id], environment=ENVIRONMENTS[id];
  const cover: Cover[] = theme.footprints.map(([originalX,y,originalW,h],index)=>{
    // Keep broad landmarks on their bank, with room to walk along the shoreline.
    const banks=water.filter(r=>r.y<y+h+24&&r.y+r.h>y-24);
    const left=originalX<550;
    const shore=left?Math.min(...banks.map(r=>r.x),1100):Math.max(...banks.map(r=>r.x+r.w),0);
    const w=Math.min(originalW,left?shore-56-170:930-shore-56);
    const x=left?Math.min(originalX,shore-56-w):Math.max(originalX,shore+56);
    return {x,y,w,h,material:"rock",artifact:index===(id%2===0?3:2)?([0,3,6,7].includes(id)?"boulder":"bunker"):theme.kind,indestructible:index===(id%2===0?3:2)||undefined,label:theme.label};
  });
  for (const side of [0,1]) {
    const x=side===0?220:800, y=rows[1]+(side?20:-20);
    const small={x,y,w:82,h:34,material:"sandbags" as const};
    if(![...cover,...water].some(r=>small.x<r.x+r.w+22&&small.x+small.w+22>r.x&&small.y<r.y+r.h+22&&small.y+small.h+22>r.y))cover.push(small);
  }
  return {id,name,layout,terrainAdvice:advice,rewardZone,
    briefing:environment.briefing+" "+theme.briefing+" "+advice,
    environment,ground:environment.ground,waterColor:environment.water,water,bridges,cover,
    supplies:design.drops.map(([x,y],i)=>({x,y,label:layout==="lake"?`LAKE DROP ${i+1}`:`${i+1} / CONTESTED DROP`})),
  };
});
export const MODES = {
  easy: {name:"Easy",score:1,description:"Gentler enemies. A small luck advantage builds gradually."},
  medium: {name:"Medium",score:1.5,description:"Stronger tactics and increasingly favorable enemy rolls."},
  hard: {name:"Hard",score:2,description:"Enemy-favored accuracy, critical hits and quick reloads. Ruthless late stages."},
} as const;
export type DifficultyMode = keyof typeof MODES;
export const validMode=(value:unknown):value is DifficultyMode=>typeof value==="string"&&Object.hasOwn(MODES,value);
export function difficulty(level: number, mode?: DifficultyMode) {
  const n = Math.max(1,Math.min(10,level));
  const legacy = { level:n, enemyCount:n===1?3:n<=3?4:5,
    enemyHealth: .55+(n-1)*.075, enemySpeed:.65+(n-1)*.055,
    enemyReload:1.6-(n-1)*.085, enemySpread:1.8-(n-1)*.09,
    enemyThink:2.2-(n-1)*.14, enemyPowers:n>=4, enemyMedics:n>=6,
    tactics:0, volley:1, fortune:0, supplyRunners:false, coverTactics:0, mapIntel:false,
  };
  // Preserve existing tours/replays; all newly created tours select an explicit mode.
  if(!mode)return legacy;
  const progress=(n-1)/9;
  const rank=mode==="easy"?0:mode==="medium"?1:2;
  const tactics=Math.min(4,rank===0?Math.floor((n-1)/4):Math.floor((n-1)/2)+(rank===2?1:0));
  return {...legacy,tactics,mapIntel:mode==="hard"||(mode==="medium"&&n>=3)||(mode==="easy"&&n>=6),coverTactics:mode==="hard"?2+(n>=6?1:0):mode==="medium"?(n>=4?1+(n>=7?1:0):0):(n>=8?1:0),supplyRunners:mode==="hard"||(mode==="medium"&&n>=5),fortune:[.02,.15,.4][rank]+progress*[.28,.5,.6][rank],
    enemyHealth:[.55,.8,1.15][rank]+progress*[.65,.85,.95][rank],
    enemySpeed:[.62,.7,.78][rank]+progress*[.3,.34,.36][rank],
    enemyReload:[1.75,1.35,.95][rank]-progress*[.85,.77,.57][rank],
    enemySpread:[1.9,1.4,.95][rank]-progress*[.7,.75,.55][rank],
    enemyThink:[2.4,1.8,1.35][rank]-progress*[1,1.05,.8][rank],
    enemyPowers:n>=[6,4,3][rank],enemyMedics:n>=[8,6,4][rank],
    volley:tactics>=3?(tactics>=4?.15:.4):1,
  };
}
export function campaignRoute(seed: number) {
  const ids=MAPS.map(m=>m.id); let state=seed>>>0;
  for(let i=ids.length-1;i>0;i--) {state=(Math.imul(state,1664525)+1013904223)>>>0; const j=state%(i+1); [ids[i],ids[j]]=[ids[j],ids[i]];}
  return ids;
}
export const validMapId=(id:number)=>Number.isInteger(id)&&id>=0&&id<MAPS.length;

export function enemyBrief(level:number,mode?:DifficultyMode) {
 const d=difficulty(level,mode),notes=[`${d.enemyCount} opponents`];
 if(mode)notes.push(`enemy luck: ${fortuneLabel(d.fortune).toLowerCase()}`);
 if(d.tactics>=1)notes.push("focus fire");
 if(d.tactics>=2)notes.push(d.coverTactics?"flanking":"flanking & defensive cover");
 if(d.tactics>=3)notes.push("bomb evasion & rapid volleys");
 if(d.tactics>=4)notes.push("cover demolition");
 if(d.mapIntel)notes.push("rehearsed map plan");
 if(d.coverTactics)notes.push("cover & peeking");
 if(d.supplyRunners)notes.push("light supply runners");
 if(d.enemyPowers)notes.push("support powers");
 if(d.enemyMedics)notes.push("medics");
 return notes.join(" · ");
}

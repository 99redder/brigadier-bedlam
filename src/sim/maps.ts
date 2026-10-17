import { ENVIRONMENTS, type Environment } from "./environments";
import { type ArtifactKind, type Cover, type Rect } from "./data";
export interface MapSpec {
  id: number; name: string; briefing: string;
  ground: number; waterColor: number; environment: Environment;
  cover: Cover[]; water: Rect[]; bridges: Rect[];
  supplies: { x: number; y: number; label: string }[];
}
// Each map has authored river bends, bridge placement and shelter rows. Campaign order is independent of difficulty.
const designs = [
  ["Picnic Panic", "Broad shelters and a narrow creek. Establish a firing lane before advancing.", [0,-20,10,-10,25,0,20,-5], 78, 0, [120,300,430]],
  ["Sunstroke Salute", "A winding river puts the safe crossing at the southern end. Watch both approaches.", [-30,0,30,0,-25,10,35,0], 94, 7, [80,245,410]],
  ["Tea Break Trenches", "Staggered sandbags make diagonal firing lanes. Turn troops to cover the gaps.", [20,-10,-35,0,30,5,-20,10], 90, 1, [145,280,455]],
  ["Muddy Moustache", "Wide muddy banks and a northern bridge reward a cautious opening route.", [-10,25,0,-30,5,30,0,-25], 118, 0, [100,320,465]],
  ["Crooked Crossing", "A zigzag channel and a southern crossing split your squad's safe and risky routes.", [35,0,-30,5,30,-5,-35,0], 106, 6, [65,230,390]],
  ["Quartermaster's Folly", "Shelters face awkward supply alcoves. Leave a covering soldier before making a run.", [-25,5,35,0,-30,0,30,10], 100, 2, [110,285,450]],
  ["The Long Lunch", "A broad river forces a long northern detour. Coordinate movement rather than trickling in.", [5,30,0,-30,-5,25,5,-20], 126, 0, [75,250,425]],
  ["Soggy Bottom", "An offset southern bridge and tight bank shelters make explosive cover destruction useful.", [30,10,-20,10,35,0,-30,-5], 112, 7, [140,305,460]],
  ["Brass Hat Bottleneck", "Paired rock teeth narrow the lanes. Cover your flank and avoid bunching up.", [-35,-5,25,0,-25,5,30,0], 122, 1, [90,260,435]],
  ["Frostbite Fiasco", "Long diagonal lanes and a remote crossing demand a plan, facing orders and timely volleys.", [15,-20,10,35,0,-30,0,25], 132, 6, [60,220,400]],
] as const;
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
export const MAPS: MapSpec[] = designs.map(([name,briefing,bends,width,bridgeBand,rows],id) => {
  const water = bends.map((bend,i) => ({x:550 + bend - width/2,y:i*70,w:width,h:70}));
  const center = 550+bends[bridgeBand];
  const bridges = [{x:center-width/2-26,y:bridgeBand*70+4,w:width+52,h:62}];
  const theme=landmarks[id], environment=ENVIRONMENTS[id];
  const cover: Cover[] = theme.footprints.map(([x,y,w,h])=>({x,y,w,h,material:"rock",artifact:theme.kind,label:theme.label}));
  // Smaller barriers frame the wrecks, leaving passages around the broad landmarks.
  for (const side of [0,1]) {
    const x=side===0?220:800;
    const y=rows[1]+(side?20:-20);
    // Only add a shelter where it leaves a clear gap from the themed footprints.
    const small={x,y,w:82,h:34,material:"sandbags" as const};
    if(!cover.some(r=>small.x<r.x+r.w+22&&small.x+small.w+22>r.x&&small.y<r.y+r.h+22&&small.y+small.h+22>r.y))cover.push(small);
  }
  const middle = water[4];
  return {id,name,briefing:environment.briefing+" "+theme.briefing+" "+briefing,environment,ground:environment.ground,waterColor:environment.water,water,bridges,cover,supplies:[
    {x:middle.x+middle.w/2,y:middle.y+35,label:"RIVER DROP"},
    {x:365,y:530,label:"SOUTH DROP"}, {x:735,y:22,label:"NORTH DROP"},
  ]};
});
export function difficulty(level: number) {
  const n = Math.max(1,Math.min(10,level));
  return { level:n, enemyCount:n===1?3:n<=3?4:5,
    enemyHealth: .55+(n-1)*.075, enemySpeed:.65+(n-1)*.055,
    enemyReload:1.6-(n-1)*.085, enemySpread:1.8-(n-1)*.09,
    enemyThink:2.2-(n-1)*.14, enemyPowers:n>=4, enemyMedics:n>=6,
  };
}
export function campaignRoute(seed: number) {
  const ids=MAPS.map(m=>m.id); let state=seed>>>0;
  for(let i=ids.length-1;i>0;i--) {state=(Math.imul(state,1664525)+1013904223)>>>0; const j=state%(i+1); [ids[i],ids[j]]=[ids[j],ids[i]];}
  return ids;
}
export const validMapId=(id:number)=>Number.isInteger(id)&&id>=0&&id<MAPS.length;

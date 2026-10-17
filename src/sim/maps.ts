import { type Cover, type Rect } from "./data";
export interface MapSpec {
  id: number; name: string; briefing: string;
  ground: number; waterColor: number;
  cover: Cover[]; water: Rect[]; bridges: Rect[];
  supplies: { x: number; y: number; label: string }[];
}
// Each map has authored river bends, bridge placement and shelter rows. Campaign order is independent of difficulty.
const designs = [
  ["Picnic Panic", "Broad shelters and a narrow creek. Establish a firing lane before advancing.", [0,-20,10,-10,25,0,20,-5], 78, 0, [120,300,430], 0xbec38e,0x6a9e9a],
  ["Bootlace Bend", "A winding river puts the safe crossing at the southern end. Watch both approaches.", [-30,0,30,0,-25,10,35,0], 94, 7, [80,245,410], 0xaebc91,0x649eaa],
  ["Tea Break Trenches", "Staggered sandbags make diagonal firing lanes. Turn troops to cover the gaps.", [20,-10,-35,0,30,5,-20,10], 90, 1, [145,280,455], 0xc3b88f,0x6c9b99],
  ["Muddy Moustache", "Wide muddy banks and a northern bridge reward a cautious opening route.", [-10,25,0,-30,5,30,0,-25], 118, 0, [100,320,465], 0xa5af83,0x7c9c88],
  ["Crooked Crossing", "A zigzag channel and a southern crossing split your squad's safe and risky routes.", [35,0,-30,5,30,-5,-35,0], 106, 6, [65,230,390], 0xb5b997,0x5e969c],
  ["Quartermaster's Folly", "Shelters face awkward supply alcoves. Leave a covering soldier before making a run.", [-25,5,35,0,-30,0,30,10], 100, 2, [110,285,450], 0xc8c19b,0x6b9b9a],
  ["The Long Lunch", "A broad river forces a long northern detour. Coordinate movement rather than trickling in.", [5,30,0,-30,-5,25,5,-20], 126, 0, [75,250,425], 0xb9bb84,0x65969d],
  ["Soggy Bottom", "An offset southern bridge and tight bank shelters make explosive cover destruction useful.", [30,10,-20,10,35,0,-30,-5], 112, 7, [140,305,460], 0xa9b68d,0x689e91],
  ["Brass Hat Bottleneck", "Paired rock teeth narrow the lanes. Cover your flank and avoid bunching up.", [-35,-5,25,0,-25,5,30,0], 122, 1, [90,260,435], 0xb9ae86,0x719caa],
  ["Last Orders Ridge", "Long diagonal lanes and a remote crossing demand a plan, facing orders and timely volleys.", [15,-20,10,35,0,-30,0,25], 132, 6, [60,220,400], 0xb5b28e,0x5f939d],
] as const;
export const MAPS: MapSpec[] = designs.map(([name,briefing,bends,width,bridgeBand,rows,ground,waterColor],id) => {
  const water = bends.map((bend,i) => ({x:550 + bend - width/2,y:i*70,w:width,h:70}));
  const center = 550+bends[bridgeBand];
  const bridges = [{x:center-width/2-26,y:bridgeBand*70+4,w:width+52,h:62}];
  const cover: Cover[] = [];
  for (const side of [0,1]) rows.forEach((y,i) => {
    const x = side === 0 ? 205 + ((id+i)%2)*22 : 760 - ((id+i)%2)*22;
    cover.push({x,y:y+side*10,w:120+(id%3)*8,h:40+(i%2)*12,material:(id+i)%2?"sandbags":"rock"});
    if(i<2) cover.push({x:side===0?355:660,y:Math.min(490,y+75+(id%3)*7),w:70,h:42,material:"rock"});
  });
  const middle = water[4];
  return {id,name,briefing,ground,waterColor,water,bridges,cover,supplies:[
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

import type { Weather } from "./weather";
export type Biome = "meadow" | "desert" | "autumn" | "mud" | "coast" | "dust" | "drygrass" | "marsh" | "cobblestone" | "snow";
export interface Environment {
  biome: Biome; name: string; briefing: string; weather?: Weather;
  ground: number; water: number; edge: number; bank: number; glint: number;
  light: number; dark: number; road: number;
}
// Weather rules are explicit; ground decoration does not create hidden collision or hazards.
export const ENVIRONMENTS: readonly Environment[] = [
  {biome:"meadow",name:"Wildflower Meadow",briefing:"A grassy picnic ground dotted with wildflowers.",ground:0xacc483,water:0x659b96,edge:0x7f9967,bank:0x82966c,glint:0xb7d8c7,light:0xd8d4a0,dark:0x6f965d,road:0xc7b989},
  {biome:"desert",name:"Sunburnt Dunes",briefing:"Sand dunes frame a deep oasis channel. The bridge is still the safe crossing.",ground:0xe0bf7d,water:0x4f9baf,edge:0xb69a65,bank:0xc6a36c,glint:0xaedee0,light:0xf1d49a,dark:0xb49054,road:0xc4a064},
  {biome:"autumn",name:"Autumn Tea Gardens",briefing:"Rust-colored leaves carpet the old convoy route.",ground:0xc2b17c,water:0x758e77,edge:0x948660,bank:0x998761,glint:0xc8d3a7,light:0xdbba78,dark:0x8c7047,road:0xb29a6c},
  {biome:"mud",name:"Mudflat Motor Pool",briefing:"Dark churned earth and wheel ruts surround the stranded tractors.",ground:0x9a8968,water:0x789484,edge:0x776c54,bank:0x736b51,glint:0xbed0b0,light:0xb4a27b,dark:0x6e6048,road:0x79654b},
  {biome:"coast",name:"Chalk Coast",briefing:"Pale coastal gravel and chalk patches surround the aircraft wrecks.",ground:0xd1d1b9,water:0x5a9eaf,edge:0x9ca79a,bank:0xabbba6,glint:0xd5ebdc,light:0xeee6cb,dark:0x99a899,road:0xc0c4ad},
  {biome:"dust",name:"Red Dust Depot",briefing:"Rust-red dust and faded tire tracks mark the quartermaster's depot.",ground:0xc69a77,water:0x669d9c,edge:0xa17f62,bank:0xa48864,glint:0xc2d6bc,light:0xdeb48b,dark:0x966d51,road:0xae815d},
  {biome:"drygrass",name:"Parched Hayfield",briefing:"Straw-colored grass and harvested rows lead to the abandoned mess halls.",ground:0xc7bd79,water:0x65979d,edge:0x9f9d63,bank:0xa6a16b,glint:0xc1dfce,light:0xe0d296,dark:0x9b985b,road:0xb1a66d},
  {biome:"marsh",weather:"rain",name:"Rain-Soaked Marsh",briefing:"RAIN: Torch range is 25% shorter, damage is halved and burns last only 3 seconds. Favor rifles and explosives in the downpour.",ground:0x879d78,water:0x4d7971,edge:0x607e65,bank:0x627d5e,glint:0xa5c4a1,light:0xa4af7d,dark:0x577b5c,road:0x839065},
  {biome:"cobblestone",name:"Ruined Parade Square",briefing:"Cracked cobbles and weed-filled paving surround the brass hats' motorcade.",ground:0xb4b4a7,water:0x638b91,edge:0x8b9589,bank:0x8b9b8d,glint:0xc2d5c4,light:0xcdcbbb,dark:0x90998e,road:0xa2a697},
  {biome:"snow",weather:"snow",name:"Snowbound Ridge",briefing:"DEEP SNOW: Bazookas move 45% slower, Torch 35%, Lobbers 20%, Riflemen 10% and Sappers 5%. Cleared bridges keep normal speed; rivers remain dangerous.",ground:0xe4ecdf,water:0x638f9e,edge:0xafc4c6,bank:0xc9dcdf,glint:0xe3f5ef,light:0xf7faf0,dark:0xb7cbd0,road:0xc4d4d3},
];

export type ClassId = "rifleman" | "bazooka" | "lobber" | "torch" | "sapper";
export interface ClassStats {
  name: string;
  short: string;
  color: number;
  hp: number;
  speed: number;
  range: number;
  preferred: number;
  cooldown: number;
  damage: number;
  radius: number;
  arc: boolean;
  instant: number;
  jam: number;
  description: string;
}
export const CLASSES: Record<ClassId, ClassStats> = {
  rifleman: {
    name: "Rifleman",
    short: "RIF",
    color: 0xe7c46f,
    hp: 300,
    speed: 72,
    range: 240,
    preferred: 185,
    cooldown: 0.48,
    damage: 2,
    radius: 0,
    arc: false,
    instant: 0,
    jam: 0.045,
    description: "Reliable firepower. Occasionally unreliable gun.",
  },
  bazooka: {
    name: "Bazooka",
    short: "BAZ",
    color: 0xeda16d,
    hp: 275,
    speed: 62,
    range: 385,
    preferred: 300,
    cooldown: 3.4,
    damage: 9.6,
    radius: 0,
    arc: false,
    instant: 0.008,
    jam: 0,
    description: "Long-range rockets. Cover gets the last word.",
  },
  lobber: {
    name: "Lobber",
    short: "LOB",
    color: 0xb7b58b,
    hp: 260,
    speed: 67,
    range: 290,
    preferred: 220,
    cooldown: 3.1,
    damage: 6.4,
    radius: 48,
    arc: true,
    instant: 0,
    jam: 0,
    description: "Grenades go over cover. Also over common sense.",
  },
  torch: {
    name: "Torch",
    short: "TOR",
    color: 0xea8270,
    hp: 325,
    speed: 75,
    range: 112,
    preferred: 83,
    cooldown: 0.3,
    damage: 1.2,
    radius: 45,
    arc: false,
    instant: 0.001,
    jam: 0,
    description: "Close-range crowd control. Allergic to puddles.",
  },
  sapper: {
    name: "Sapper",
    short: "SAP",
    color: 0x9cc4b9,
    hp: 285,
    speed: 80,
    range: 155,
    preferred: 120,
    cooldown: 4.5,
    damage: 14.4,
    radius: 60,
    arc: true,
    instant: 0.01,
    jam: 0,
    description: "Dynamite. A very persuasive conversation starter.",
  },
};
export const SQUADS: {
  name: string;
  tag: string;
  description: string;
  classes: ClassId[];
}[] = [
  {
    name: "Mixed Bag",
    tag: "BALANCED",
    description: "One of everything. Five different ways to make a mess.",
    classes: ["rifleman", "bazooka", "lobber", "torch", "sapper"],
  },
  {
    name: "Long Distance",
    tag: "FIRE SUPPORT",
    description: "Keep your distance. Send your regrets by rocket.",
    classes: ["rifleman", "rifleman", "bazooka", "bazooka", "lobber"],
  },
  {
    name: "Bad Company",
    tag: "CLOSE QUARTERS",
    description: "Get personal. Bring fire, dynamite, and poor judgment.",
    classes: ["rifleman", "torch", "torch", "sapper", "lobber"],
  },
];
export const TUNING = {
  step: 1 / 30,
  medicCalls: 3,
  medicSpeed: 160,
  reviveHealth: 0.6,
  brawlRange: 28,
  brawlDamage: 14,
  brawlCooldown: 0.85,
  kickDamage: 18,
  kickCooldown: 1.15,
  blockReduction: 0.22,
  knockback: 36,
  aiThink: 0.65,
  aiRetreatHp: 0.28,
  aiRetreatDuration: 2.5,
  aiRetreatCooldown: 12,
  aiMedicDelay: 5,
  aiAccuracy: 0.85,
  aiAggression: 0.8,
  jamDuration: 2.4,
  waterSpeed: 0.65,
};
export const FIELD = { width: 1100, height: 560, cell: 26 };
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const COVER: Rect[] = [
  { x: 230, y: 100, w: 100, h: 40 },
  { x: 260, y: 370, w: 90, h: 44 },
  { x: 492, y: 225, w: 112, h: 46 },
  { x: 760, y: 110, w: 95, h: 42 },
  { x: 790, y: 375, w: 80, h: 44 },
  { x: 500, y: 460, w: 80, h: 34 },
];
export const WATER: Rect[] = [
  { x: 445, y: 55, w: 180, h: 94 },
  { x: 590, y: 345, w: 134, h: 73 },
];

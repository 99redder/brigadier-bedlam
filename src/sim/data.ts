export type ClassId = "rifleman" | "bazooka" | "lobber" | "torch" | "sapper";
export interface ClassStats {
  name: string;
  short: string;
  color: number;
  hp: number;
  armor: string;
  accuracy: string;
  spread: number;
  speed: number;
  range: number;
  preferred: number;
  cooldown: number;
  damage: number;
  radius: number;
  lethalRadius: number;
  arc: boolean;
  instant: number;
  jam: number;
  waterSpeed: number;
  drowningRisk: number;
  description: string;
}
export const CLASSES: Record<ClassId, ClassStats> = {
  rifleman: {
    name: "Rifleman",
    short: "RIF",
    color: 0xe7c46f,
    hp: 230,
    armor: "Medium",
    accuracy: "Good",
    spread: 2,
    speed: 47,
    range: 300,
    preferred: 235,
    cooldown: 0.65,
    damage: 18,
    radius: 0,
    lethalRadius: 0,
    arc: false,
    instant: 0,
    jam: 0.045,
    waterSpeed: 0.85,
    drowningRisk: 0.1,
    description:
      "Fast, accurate rifle fire at good range. Medium armor; low damage.",
  },
  bazooka: {
    name: "Bazooka",
    short: "BAZ",
    color: 0xc49cde,
    hp: 330,
    armor: "Heavy",
    accuracy: "Manual: precise / auto: poor",
    spread: 14,
    speed: 40,
    range: 385,
    preferred: 300,
    cooldown: 4,
    damage: 260,
    radius: 24,
    lethalRadius: 24,
    arc: false,
    instant: 0,
    jam: 0,
    waterSpeed: 0.45,
    drowningRisk: 0.4,
    description:
      "Heavy armor, lethal rockets. Precise manual aim; poor automatic accuracy.",
  },
  lobber: {
    name: "Lobber",
    short: "LOB",
    color: 0x8ab852,
    hp: 180,
    armor: "Light",
    accuracy: "High",
    spread: 2,
    speed: 44,
    range: 350,
    preferred: 275,
    cooldown: 5,
    damage: 115,
    radius: 48,
    lethalRadius: 0,
    arc: true,
    instant: 0,
    jam: 0,
    waterSpeed: 0.65,
    drowningRisk: 0.25,
    description:
      "Accurate long-range grenades. Moderate damage and light armor.",
  },
  torch: {
    name: "Torch",
    short: "TOR",
    color: 0xef7650,
    hp: 220,
    armor: "Medium",
    accuracy: "Wide cone",
    spread: 0,
    speed: 49,
    range: 112,
    preferred: 83,
    cooldown: 2,
    damage: 12,
    radius: 45,
    lethalRadius: 0,
    arc: false,
    instant: 0,
    jam: 0,
    waterSpeed: 0.4,
    drowningRisk: 0.45,
    description: "Ignites an eight-second burn. Water puts it out.",
  },
  sapper: {
    name: "Sapper",
    short: "SAP",
    color: 0x72b4df,
    hp: 130,
    armor: "None",
    accuracy: "Very high",
    spread: 1,
    speed: 52,
    range: 80,
    preferred: 66,
    cooldown: 6,
    damage: 260,
    radius: 34,
    lethalRadius: 34,
    arc: true,
    instant: 0,
    jam: 0,
    waterSpeed: 0.5,
    drowningRisk: 0.35,
    description: "Accurate, lethal dynamite. Extremely short range; no armor.",
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
  deploymentSeconds: 10,
  burnDuration: 8,
  burnDamagePerSecond: 35,
  medicCalls: 2,
  medicHealth: 60,
  medicSpeed: 104,
  reviveHealth: 0.6,
  brawlRange: 28,
  brawlDamage: 14,
  brawlCooldown: 0.85,
  punchAnimation: 0.32,
  kickAnimation: 0.44,
  recoilAnimation: 0.28,
  autoBlockDuration: 0.35,
  knockdownAnimation: 0.45,
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
  enemyRocketScatter: 1.7,
  manualRocketReload: 6,
  aiAggression: 0.8,
  aiBridgeRisk: 0.35,
  aiUnsafeBlastPenalty: 240,
  aiUnsafePositionPenalty: 300,
  jamDuration: 2.4,
  drowningDuration: 1.2,
};
export const FIELD = { width: 1100, height: 560, cell: 26 };
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Cover extends Rect {
  hp?: number;
  material?: "rock" | "sandbags" | "crate";
}
export const TERRAIN = {
  hp: 100,
  damage: { rifleman: 0, bazooka: 40, lobber: 20, torch: 0, sapper: 100 },
};
// Broad firing shelters, with exposed reward alcoves at opposite map edges.
export const COVER: Cover[] = [
  { x: 230, y: 100, w: 135, h: 60, material: "rock" },
  { x: 215, y: 300, w: 130, h: 55, material: "sandbags" },
  { x: 340, y: 200, w: 115, h: 50, material: "rock" },
  { x: 300, y: 445, w: 145, h: 40, material: "sandbags" },
  { x: 425, y: 485, w: 35, h: 60, material: "rock" },
  { x: 735, y: 400, w: 135, h: 60, material: "rock" },
  { x: 755, y: 205, w: 130, h: 55, material: "sandbags" },
  { x: 680, y: 310, w: 100, h: 50, material: "rock" },
  { x: 700, y: 75, w: 145, h: 40, material: "sandbags" },
  { x: 685, y: 15, w: 35, h: 60, material: "rock" },
];
export const SUPPLY_POINTS = [
  { x: 580, y: 325, label: "RIVER DROP" },
  { x: 380, y: 520, label: "SOUTH DROP" },
  { x: 765, y: 35, label: "NORTH DROP" },
];
// Bank-to-bank crossing is unavoidable when moving between the two halves.
export const WATER: Rect[] = [
  { x: 505, y: 0, w: 90, h: 100 },
  { x: 475, y: 100, w: 100, h: 60 },
  { x: 530, y: 160, w: 95, h: 65 },
  { x: 490, y: 225, w: 110, h: 65 },
  { x: 535, y: 290, w: 110, h: 75 },
  { x: 495, y: 365, w: 110, h: 60 },
  { x: 550, y: 425, w: 100, h: 65 },
  { x: 505, y: 490, w: 100, h: 70 },
];

// Deliberately far from the central fight: safe but a substantial detour.
export const BRIDGES: Rect[] = [{ x: 485, y: 36, w: 130, h: 64 }];

export const TRAINING_COVER: Cover[] = [
  { x: 255, y: 250, w: 80, h: 40, material: "rock" },
  { x: 365, y: 390, w: 70, h: 40, material: "crate" },
  { x: 780, y: 360, w: 80, h: 44, material: "sandbags" },
];

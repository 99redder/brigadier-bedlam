import type { ClassId } from "./data";
import type { Point } from "./geometry";
export const RUN_LIGHT={speed:36,hp:130,waterSpeed:.85,drowningRisk:.1,equipTime:1.5} as const;
export const COMEBACK={first:30,interval:45,limit:6,lifetime:45,radius:23,reviveHealth:.6,healFraction:.35} as const;
export type ChestReward="recall"|"treatment"|"sniper"|"airstrike";
export const CHEST_LABELS:Record<ChestReward,string>={recall:"SQUADMATE RECALLED",treatment:"FIELD TREATMENT",sniper:"SNIPER SHOT",airstrike:"AIRSTRIKE"};
export interface GearDrop extends Point {owner:number;side:0|1;classId:ClassId;}
export interface RewardChest extends Point {id:number;expiresAt:number;claimedBy:0|1|null;openedAt?:number;reward?:ChestReward;}

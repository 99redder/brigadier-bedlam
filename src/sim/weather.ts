import type { ClassId } from "./data";
export type Weather = "clear" | "rain" | "snow";
export const RAIN = { flameRange: .75, flameDamage: .5, burnDuration: 3, burnDamage: .5 } as const;
export const SNOW_SPEED: Record<ClassId,number> = {rifleman:.9,bazooka:.55,lobber:.8,torch:.65,sapper:.95};
export const weatherLabel=(weather:Weather)=>weather==="rain"?"RAIN · TORCH WEAKENED":weather==="snow"?"DEEP SNOW · HEAVY TROOPS SLOW":"CLEAR";
export const weatherAdvice=(weather:Weather)=>weather==="rain"
  ? "RAIN: Torch range -25%, flame and burn damage halved, burns last only 3 seconds. Favor rifles and explosives."
  : weather==="snow"
    ? "DEEP SNOW: speed penalties — Bazooka 45%, Torch 35%, Lobber 20%, Rifleman 10%, Sapper 5%. Let light troops lead; bridges keep normal speed."
    : "Clear conditions: normal movement and weapon performance.";
export const weatherBrief=(weather:Weather)=>weather==="rain"
  ? "RAIN: Torch -25% range, half damage, 3s burns. Favor rifles and explosives; queue moves before GO."
  : weather==="snow"
    ? "SNOW: Bazooka -45% speed, Torch -35%, Lobber -20%, Rifleman -10%, Sapper -5%. Light troops lead; bridges stay fast."
    : "Queue your movement and facing orders before GO.";

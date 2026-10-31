export const SUPPORT_WEAPONS=["airstrike","mortar","sniper"] as const;
export type SupportWeapon=(typeof SUPPORT_WEAPONS)[number];
export const SUPPORT_ODDS={airstrike:.4,mortar:.4,sniper:.2} as const;
export function rollSupport(roll:number):SupportWeapon {
  return roll<SUPPORT_ODDS.airstrike?"airstrike":roll<SUPPORT_ODDS.airstrike+SUPPORT_ODDS.mortar?"mortar":"sniper";
}

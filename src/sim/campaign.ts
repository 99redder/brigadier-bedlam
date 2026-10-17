import { campaignRoute, validMapId } from "./maps";
export interface RoundResult { mapId:number; level:number; won:boolean; seconds:number; enemiesDefeated:number; survivors:number; }
export interface Campaign { id:string; claim:string; seed:number; squad:number; route:number[]; history:RoundResult[]; inProgress:boolean; }
export function roundScore(r:RoundResult) {
  return r.level*(r.enemiesDefeated*150+(r.won?1000+r.survivors*100+Math.max(0,300-Math.floor(r.seconds))*2:0));
}
export const totalScore=(history:RoundResult[])=>history.reduce((sum,r)=>sum+roundScore(r),0);
export function validHistory(value:unknown): value is RoundResult[] {
  if(!Array.isArray(value)||value.length<1||value.length>10)return false;
  const seen=new Set<number>();
  return value.every((r,i)=> {
    if(!r||!validMapId(r.mapId)||seen.has(r.mapId)||r.level!==i+1||typeof r.won!=="boolean"||!Number.isFinite(r.seconds)||r.seconds<0||r.seconds>7200||!Number.isInteger(r.enemiesDefeated)||r.enemiesDefeated<0||r.enemiesDefeated>5||!Number.isInteger(r.survivors)||r.survivors<0||r.survivors>5)return false;
    const enemies=i===0?3:i<=2?4:5;
    if(r.enemiesDefeated>enemies || (r.won && (r.survivors<1||r.enemiesDefeated!==enemies)) || (!r.won&&r.survivors!==0))return false;
    seen.add(r.mapId);return true;
  });
}
export function nickname(value:string) {
  const name=value.normalize("NFKC").trim().replace(/\s+/g," ");
  return /^[\p{L}\p{N}][\p{L}\p{N} ._'’-]{1,19}$/u.test(name)?name:"";
}
export function newCampaign(seed:number,squad=0):Campaign {
  return {id:crypto.randomUUID(),claim:crypto.randomUUID(),seed:seed>>>0,squad,route:campaignRoute(seed),history:[],inProgress:true};
}

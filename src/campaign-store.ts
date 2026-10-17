import { type Campaign, validHistory, nickname } from "./sim/campaign";
import { campaignRoute, validMode, type DifficultyMode } from "./sim/maps";
const KEY="brigadier-bedlam.campaign.v1";
export const API=import.meta.env.DEV?"http://localhost:8791":"https://brigadier-bedlam-scores.99redder.workers.dev";
export interface ScoreRow { name:string; score:number; rounds:number; wins:number; mode?:DifficultyMode; }
export interface SaveState { name:string; run:Campaign|null; records:{run:Campaign;name:string;pending:boolean}[]; }
export let storageAvailable=true;
export let saved:SaveState={name:"",run:null,records:[]};
try {
 const raw=JSON.parse(localStorage.getItem(KEY)??"null");
 const validRun=(r:Campaign)=>r&&(r.mode===undefined||validMode(r.mode))&&r.history?.every(x=>x.mode===r.mode)&&typeof r.id==="string"&&typeof r.claim==="string"&&Number.isInteger(r.seed)&&r.seed>=0&&r.seed<=0xffffffff&&(r.squad===undefined||[0,1,2].includes(r.squad))&&JSON.stringify(r.route)===JSON.stringify(campaignRoute(r.seed))&&Array.isArray(r.history)&&(r.history.length===0||validHistory(r.history));
 if(raw&&typeof raw.name==="string"&&Array.isArray(raw.records))saved={name:nickname(raw.name),run:validRun(raw.run)?raw.run:null,records:raw.records.filter((r:{run:Campaign;name:string})=>validRun(r.run)&&typeof r.name==="string"&&(r.name===""||nickname(r.name))).slice(0,50)};
}catch{storageAvailable=false;/* Private browsing or a corrupt save must never prevent playing. */}
export function persist(){try{localStorage.setItem(KEY,JSON.stringify(saved));storageAvailable=true;}catch{storageAvailable=false;/* Keep the in-memory run playable. */}}
export function rememberScore(run:Campaign){
 if(!run.history.length)return;
 const record={run:structuredClone(run),name:saved.name,pending:!!saved.name};
 const i=saved.records.findIndex(r=>r.run.id===run.id);
 if(i<0)saved.records.unshift(record);else saved.records[i]=record;
 saved.records=saved.records.slice(0,50);persist();
}
let syncing:Promise<boolean>|null=null;
export function syncScores():Promise<boolean> {
 if(syncing)return syncing;
 syncing=(async()=>{
  let ok=true;
  for(const item of saved.records.filter(r=>r.pending)){
   const snapshot=JSON.stringify({id:item.run.id,claim:item.run.claim,seed:item.run.seed,name:item.name,history:item.run.history});
   try{const res=await fetch(API+"/scores",{method:"POST",headers:{"Content-Type":"application/json"},body:snapshot,signal:AbortSignal.timeout(8000)});if(!res.ok)throw new Error("Save failed");
    const current=saved.records.find(r=>r.run.id===item.run.id);
    if(current===item)current.pending=false;
   }catch{ok=false;}
  }persist();return ok;
 })().finally(()=>{syncing=null;});return syncing;
}
export async function loadScores():Promise<ScoreRow[]>{const res=await fetch(API+"/scores",{signal:AbortSignal.timeout(8000)});if(!res.ok)throw new Error("Scores unavailable");return (await res.json()).scores;}
window.addEventListener("online",()=>void syncScores());

if(navigator.onLine)void syncScores();

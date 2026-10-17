import { nickname, validHistory, totalScore } from "../src/sim/campaign";
import { campaignRoute } from "../src/sim/maps";
const ORIGIN="https://99redder.github.io";
const cors={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin","X-Content-Type-Options":"nosniff"};
async function boundedJson(request:Request) {
 const reader=request.body?.getReader();if(!reader)throw new Error("Missing body");
 let size=0,text="";const decoder=new TextDecoder();
 while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>16384){await reader.cancel();throw new Error("Body too large");}text+=decoder.decode(chunk.value,{stream:true});}
 return JSON.parse(text+decoder.decode());
}
export default {
 async fetch(request:Request,env:Env):Promise<Response> {
  const headers={...cors,"Access-Control-Allow-Origin":request.headers.get("Origin")==="http://localhost:5173"?"http://localhost:5173":ORIGIN};
  const json=(body:unknown,status=200)=>Response.json(body,{status,headers});
  const path=new URL(request.url).pathname;
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
  try {
   if(request.method==="GET"&&path==="/scores") {
    const rows=await env.DB.prepare(`SELECT name,score,rounds,wins,history FROM (SELECT name,score,rounds,wins,history,created_at,ROW_NUMBER() OVER(PARTITION BY lower(name) ORDER BY score DESC,rounds DESC,created_at ASC) AS place FROM scores) WHERE place=1 ORDER BY score DESC,rounds DESC,created_at ASC LIMIT 50`).all();
    return json({scores:rows.results.map(row=>{
      let mode;try{const history=JSON.parse(String(row.history));if(validHistory(history))mode=history[0].mode;}catch{/* Legacy or damaged history has no mode label. */}
      const {history,...score}=row;return {...score,mode};
    })});
   }
   if(request.method!=="POST"||path!=="/scores")return json({error:"Not found"},404);
   const origin=request.headers.get("Origin");
   if(origin!==ORIGIN && origin!=="http://localhost:5173")return json({error:"Origin not allowed"},403);
   const body=await boundedJson(request);
   const name=typeof body.name==="string"?nickname(body.name):"";
   if(!name||!/^[-a-f0-9]{36}$/.test(body.id)||!/^[-a-f0-9]{36}$/.test(body.claim)||!Number.isInteger(body.seed)||body.seed<0||body.seed>0xffffffff||!validHistory(body.history))return json({error:"Invalid score record"},400);
   const route=campaignRoute(body.seed);
   if(body.history.some((r:{mapId:number},i:number)=>r.mapId!==route[i]))return json({error:"Invalid map sequence"},400);
   const now=Date.now();
   const ip=request.headers.get("CF-Connecting-IP")??"local";
   const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${Math.floor(now/86400000)}:${ip}`));
   const key=Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,"0")).join("")+":"+Math.floor(now/60000);
   const rate=await env.DB.prepare("INSERT INTO rate_limits(key,hits,expires) VALUES(?1,1,?2) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits").bind(key,now+120000).first<{hits:number}>();
   if((rate?.hits??0)>30)return json({error:"Please wait a minute before saving again"},429);
   const existing=await env.DB.prepare("SELECT run_id,history FROM scores WHERE run_id=?1").bind(body.id).first();
   if(existing && !(await env.DB.prepare("SELECT run_id FROM scores WHERE run_id=?1 AND claim=?2").bind(body.id,body.claim).first()))return json({error:"Run does not belong to this device"},403);
   if(existing) {
    const previous=JSON.parse(String(existing.history));
    if(previous[0]?.mode!==body.history[0]?.mode)return json({error:"Difficulty cannot change during a tour"},400);
   }
   const score=totalScore(body.history),wins=body.history.filter((r:{won:boolean})=>r.won).length;
   await env.DB.prepare(`INSERT INTO scores(run_id,claim,name,score,rounds,wins,history,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?8) ON CONFLICT(run_id) DO UPDATE SET name=excluded.name,score=excluded.score,rounds=excluded.rounds,wins=excluded.wins,history=excluded.history,updated_at=excluded.updated_at WHERE scores.claim=excluded.claim AND excluded.score>=scores.score AND excluded.rounds>=scores.rounds`).bind(body.id,body.claim,name,score,body.history.length,wins,JSON.stringify(body.history),now).run();
   await env.DB.prepare("DELETE FROM rate_limits WHERE expires<?1").bind(now).run();
   return json({saved:true,score});
  }catch(error){console.error(JSON.stringify({event:"leaderboard_request_failed",kind:error instanceof Error?error.name:"Unknown error"}));return json({error:"Could not save or load scores. Try again shortly."},400);}
 }
} satisfies ExportedHandler<Env>;

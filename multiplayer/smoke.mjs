// Exercises the real Worker/DO runtime. Start npm run multiplayer:dev first.
// Optional: MULTIPLAYER_URL=https://... npm run multiplayer:smoke
import assert from 'node:assert/strict';
const base=process.env.MULTIPLAYER_URL||'http://127.0.0.1:8792';
const clients=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function post(path,data){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});return {status:r.status,...await r.json()};}
function client(name){const c={key:crypto.randomUUID(),name,ws:null,state:null,notices:[],seq:0,states:0};clients.push(c);return c;}
async function join(c,extra={}){const t=await post('/queue',{key:c.key,name:c.name,...extra});assert.equal(t.status,200,JSON.stringify(t));c.ticket=t;return t;}
async function connect(c){
 c.ws=new WebSocket(`${base.replace(/^http/,'ws')}/match/${c.ticket.room}`,['bedlam-v1',`auth.${c.key}`]);
 c.ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='state'){c.state=m;c.states++;}if(m.type==='notice')c.notices.push(m);});
 await until(()=>c.state&&c.ws.readyState===1,'socket state');
 c.ping=setInterval(()=>{if(c.ws?.readyState===1)c.ws.send(JSON.stringify({type:'ping',sent:Date.now()}));},5000);
}
async function until(fn,label,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){if(fn())return;await delay(40);}throw new Error(`Timed out: ${label}`);}
const send=(c,m)=>c.ws.send(JSON.stringify(m));
const command=(c,command)=>send(c,{type:'command',seq:++c.seq,command});
try{
 assert.equal((await fetch(base+'/health').then(r=>r.json())).ok,true);
 const denied=await fetch(base+'/health',{headers:{Origin:'https://example.net'}});assert.equal(denied.status,403);
 const a=client('Smoke Alpha'),b=client('Smoke Bravo'),third=client('Smoke Spare');
 await Promise.all([join(a),join(b)]);assert.equal(a.ticket.room,b.ticket.room);assert.notEqual(a.ticket.side,b.ticket.side);
 await join(third);assert.notEqual(third.ticket.room,a.ticket.room);
 await Promise.all([connect(a),connect(b)]);
 send(a,{type:'ready'});await delay(100);assert.notEqual(a.state.phase,'playing');send(b,{type:'ready'});
 await until(()=>a.state.phase==='playing'&&b.state.phase==='playing','both ready');
 assert.equal(a.state.mapId,b.state.mapId);assert.equal(a.state.state.soldiers.length,10);assert(a.state.state.planningTicks>0);
 assert(!('rngState' in a.state.state));
 // The wire uses authoritative ids. Each recipient's own squad is remapped to 0..4.
 const own=a.ticket.side*5,other=(a.ticket.side^1)*5;
 command(a,{type:'move',id:own,point:{x:200,y:200}});
 await until(()=>a.state.ack===a.seq,'movement acknowledgement');
 assert(a.state.state.soldiers.find(s=>s.id===0).goal,"valid movement order stored (destination may snap around cover)");
 command(a,{type:'move',id:other,point:{x:20,y:20}});await until(()=>a.notices.length,'ownership rejection');
 assert.notDeepEqual(b.state.state.soldiers.find(s=>s.id===0).goal,{x:20,y:20});
 // Close and reconnect the same seat; server keeps its orders and acknowledges.
 const ack=a.state.ack;clearInterval(a.ping);a.ws.close();await delay(250);a.state=null;await connect(a);assert.equal(a.state.ack,ack);
 command(b,{type:'select',id:b.ticket.side*5+3});await until(()=>b.state.ack===b.seq,'second player control');
 await until(()=>a.state.state.planningTicks===0&&b.state.state.planningTicks===0,'synchronized GO',15000);
 assert(Math.abs(a.state.state.tick-b.state.state.tick)<=3);
 const before=a.state.state.time;await delay(500);assert(a.state.state.time>before,'authoritative simulation runs');
 send(b,{type:'leave'});await until(()=>a.state.phase==='finished','forfeit');assert.equal(a.state.state.winner,0);
 // A matched room must not be recycled when one participant leaves it.
 await post('/cancel',{key:b.key});const fourth=client('Smoke Fourth');await join(fourth);assert.notEqual(fourth.ticket.room,a.ticket.room);
 // Private lobbies stay outside the public queue and accept their invite code.
 const host=client('Private Host'),guest=client('Private Guest');await join(host,{private:true});await join(guest,{invite:host.ticket.code});assert.equal(host.ticket.room,guest.ticket.room);
 // An unrelated token cannot take over a seat.
 const deniedSocket=new WebSocket(`${base.replace(/^http/,'ws')}/match/${host.ticket.room}`,['bedlam-v1',`auth.${crypto.randomUUID()}`]);
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Unauthorized socket timeout')),10000);deniedSocket.addEventListener('error',()=>{clearTimeout(timeout);resolve();},{once:true});deniedSocket.addEventListener('open',()=>{clearTimeout(timeout);deniedSocket.close();reject(new Error('Unauthorized socket accepted'));},{once:true});});
 console.log(`PASS: live lobby pairing, private invites, auth, both players' orders, synchronized deployment, reconnect, forfeit and room isolation (${base}).`);
}finally{
 for(const c of clients){clearInterval(c.ping);c.ws?.close();await post('/cancel',{key:c.key}).catch(()=>{});}
}

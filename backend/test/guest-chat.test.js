const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const express=require('express');
const jwt=require('jsonwebtoken');

test('guest chat: anonymous send, cookie resume, isolated histories, operator reply and permissions',async t=>{
  const sessions=[],messages=[];
  const match=(row,where)=>Object.entries(where).every(([key,value])=>row[key]===value);
  const prisma={
    chatSession:{
      deleteMany:async({where})=>{const ids=where.id.in;let count=0;for(let i=sessions.length-1;i>=0;i--)if(ids.includes(sessions[i].id)){sessions.splice(i,1);count++;}for(let i=messages.length-1;i>=0;i--)if(ids.includes(messages[i].sessionId))messages.splice(i,1);return {count};},
      findFirst:async({where})=>sessions.find(row=>match(row,where))||null,
      create:async({data})=>{const row={id:sessions.length+1,status:'open',createdAt:new Date(),updatedAt:new Date(),...data};sessions.push(row);return row;},
      update:async({where,data})=>Object.assign(sessions.find(row=>match(row,where)),data),
      findUnique:async({where,include})=>{const row=sessions.find(row=>match(row,where));return row ? {...row,...(include?{messages:messages.filter(m=>m.sessionId===row.id)}:{})}:null;},
      findMany:async()=>sessions.map(row=>({...row,messages:messages.filter(m=>m.sessionId===row.id).slice(-1)}))
    },
    chatMessage:{
      deleteMany:async({where})=>{let count=0;for(let i=messages.length-1;i>=0;i--)if(match(messages[i],where)){messages.splice(i,1);count++;}return {count};},
      findMany:async({where})=>messages.filter(row=>match(row,where)),
      create:async({data})=>{const row={id:messages.length+1,createdAt:new Date(),...data};messages.push(row);return row;}
    }
  };
  const prismaPath=require.resolve('../lib/prisma');
  const original=require.cache[prismaPath];
  require.cache[prismaPath]={id:prismaPath,filename:prismaPath,loaded:true,exports:prisma};
  const previousSecret=process.env.JWT_SECRET;
  process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
  const adminToken=jwt.sign({id:1,role:'admin'},process.env.JWT_SECRET);
  const userToken=jwt.sign({id:2,role:'user'},process.env.JWT_SECRET);
  const app=express();app.use(express.json());app.use('/api/chats',require('../routes/chats'));
  const server=app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>{server.closeAllConnections();server.close();if(original)require.cache[prismaPath]=original;else delete require.cache[prismaPath];if(previousSecret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previousSecret;});
  const base='http://127.0.0.1:'+server.address().port+'/api/chats';
  const request=(url,{cookie,token,body,method='GET',headers={},signal}={})=>fetch(base+url,{method,signal,headers:{...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  const first=await request('/guest/session',{method:'POST'});assert.equal(first.status,200);
  const cookie=first.headers.get('set-cookie').split(';')[0];assert.match(first.headers.get('set-cookie'),/HttpOnly/);assert.match(first.headers.get('set-cookie'),/SameSite=Strict/i);
  const a=await first.json();assert(!('chatKey' in a));
  assert.notEqual(sessions[0].chatKey,cookie.split('=')[1]);
  const resumed=await request('/guest/session',{method:'POST',cookie});assert.equal((await resumed.json()).id,a.id);assert.equal(sessions.length,1);
  const second=await request('/guest/session',{method:'POST'});const cookieB=second.headers.get('set-cookie').split(';')[0];const b=await second.json();assert.notEqual(a.id,b.id);
  assert.equal((await request('/guest/messages')).status,401);
  assert.equal((await request('/guest/messages',{method:'POST',cookie,body:{text:' '}})).status,400);
  assert.equal((await request('/guest/messages',{method:'POST',cookie,body:{text:'x'.repeat(2001)}})).status,400);
  const visitorText='<img src=x onerror=alert(1)>\nSalam';
  assert.equal((await request('/guest/messages',{method:'POST',cookie,body:{text:visitorText}})).status,201);
  assert.equal((await (await request('/guest/messages',{cookieB,cookie:cookieB})).json()).length,0);
  assert.equal((await request('/admin/sessions/list',{cookie})).status,401);
  assert.equal((await request('/admin/sessions/list',{token:userToken})).status,403);
  assert.equal((await request('/'+a.id+'/messages',{cookie})).status,401);
  const list=await (await request('/admin/sessions/list',{token:adminToken})).json();assert.equal(list[0].messages[0].text,visitorText);
  const streamAbort=new AbortController();
  const stream=await request('/guest/stream',{cookie,signal:streamAbort.signal});
  const reader=stream.body.getReader();await reader.read();
  await request('/admin/sessions/'+b.id+'/messages',{method:'POST',token:adminToken,body:{text:'Only B'}});
  await request('/admin/sessions/'+a.id+'/messages',{method:'POST',token:adminToken,body:{text:'Salam, necə kömək edə bilərəm?'}});
  let chunk='';while(!chunk.includes('data:')){const next=await reader.read();chunk+=new TextDecoder().decode(next.value);}
  assert(!chunk.includes('Only B'));assert(chunk.includes('necə kömək'));
  streamAbort.abort();
  const history=await (await request('/guest/messages',{cookie})).json();assert.equal(history.length,2);assert.equal(history[1].sender,'admin');
  const deleteUrl='/admin/sessions/'+a.id+'/messages/'+history[1].id;
  assert.equal((await request(deleteUrl,{method:'DELETE',cookie})).status,401);
  assert.equal((await request(deleteUrl,{method:'DELETE',token:userToken})).status,403);
  assert.equal((await request('/admin/sessions/'+b.id+'/messages/'+history[1].id,{method:'DELETE',token:adminToken})).status,404);
  assert.equal((await request('/admin/sessions/'+a.id+'/messages/nope',{method:'DELETE',token:adminToken})).status,400);
  assert.equal((await request(deleteUrl,{method:'DELETE',token:adminToken})).status,204);
  assert.equal((await request(deleteUrl,{method:'DELETE',token:adminToken})).status,404);
  const afterDelete=await (await request('/guest/messages',{cookie})).json();assert.equal(afterDelete.length,1);assert.equal(afterDelete[0].text,visitorText);
  const adminAfter=await (await request('/admin/sessions/'+a.id,{token:adminToken})).json();assert.equal(adminAfter.messages.length,1);
  assert.equal((await request('/admin/sessions/'+a.id+'/messages/'+history[0].id,{method:'DELETE',token:adminToken})).status,204);
  assert.equal((await (await request('/admin/sessions/'+a.id,{token:adminToken})).json()).messages.length,0);
  assert.equal((await request('/guest/session',{method:'POST',headers:{Origin:'https://unrelated.example'}})).status,403);
  const forged='essen_guest_chat='+sessions[0].chatKey.replace('guest:','');
  assert.equal((await request('/guest/messages',{cookie:forged})).status,401);
  assert.equal((await request('/admin/sessions',{method:'DELETE',body:{ids:[b.id]}})).status,401);
  assert.equal((await request('/admin/sessions',{method:'DELETE',token:userToken,body:{ids:[b.id]}})).status,403);
  assert.equal((await request('/admin/sessions',{method:'DELETE',token:adminToken,body:{ids:[]}})).status,400);
  assert.equal((await request('/admin/sessions',{method:'DELETE',token:adminToken,body:{ids:['1']}})).status,400);
  const deleted=await request('/admin/sessions',{method:'DELETE',token:adminToken,body:{ids:[b.id,b.id]}});
  assert.equal((await deleted.json()).count,1);assert.equal(sessions.length,1);assert.equal(sessions[0].id,a.id);
  assert(!messages.some(message=>message.sessionId===b.id));
});

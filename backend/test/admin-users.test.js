const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
test('user directory includes legacy accounts, stable IDs, search, pagination and safe legacy chat linking',{skip:!process.env.AUTH_TEST_DATABASE_URL},async()=>{
 const url=new URL(process.env.AUTH_TEST_DATABASE_URL);assert(['localhost','127.0.0.1'].includes(url.hostname));
 const {PrismaClient}=require('../generated/client-v3'),{PrismaPg}=require('@prisma/adapter-pg');
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:false})});
 require.cache[require.resolve('../lib/prisma')]={exports:db};process.env.JWT_SECRET=crypto.randomUUID();
 const express=require('express'),jwt=require('jsonwebtoken'),app=express();app.use(express.json());app.use('/users',require('../routes/adminUsers'));app.use('/auth',require('../routes/auth'));app.use('/api/chats',require('../routes/chats'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const marker='directory-'+crypto.randomUUID(),users=[],chats=[];
 try{
  for(let i=0;i<27;i++)users.push(await db.user.create({data:{firstName:i?'Ad':null,lastName:i?'Soyad':null,name:marker+' '+i,email:marker+i+'@example.invalid',password:'must-not-leak',role:i===26?'admin':'user',createdAt:new Date('2020-01-01'),...(i===0?{phone:'+994501234586'}:{})}}));
  const user=users[0],member=jwt.sign({id:user.id,role:'user'},process.env.JWT_SECRET),admin=jwt.sign({id:users[26].id,role:'admin'},process.env.JWT_SECRET);
  const call=(route,token=admin,extra={})=>fetch(base+route,{...extra,headers:{...(token?{Authorization:'Bearer '+token}:{}),...extra.headers}});
  assert.equal((await call('/users',null)).status,401);assert.equal((await call('/users',member)).status,403);
  const list=await (await call('/users?q='+marker)).json();assert.equal(list.filtered,26);assert.equal(list.users.length,25);assert(list.total>=26);
  const next=await (await call('/users?q='+marker+'&page=2')).json();assert.equal(next.users.length,1);
  const code='EH-'+String(user.id).padStart(6,'0');
  const found=await (await call('/users?q='+code)).json();assert.equal(found.filtered,1);assert.equal(found.users[0].fullName,user.name);assert.equal(found.users[0].userCode,code);assert.equal(found.users[0].password,undefined);assert.equal(found.users[0].role,undefined);
  assert.equal((await (await call('/users?q='+user.email)).json()).filtered,1);
  assert.equal((await (await call('/users?q=501234586')).json()).filtered,1);
  assert.equal((await (await call('/auth/me',member)).json()).userCode,code);
  const legacy=await db.chatSession.create({data:{chatKey:crypto.randomUUID(),name:'Ziyarətçi',phone:'0501234586',userId:null}});chats.push(legacy.id);
  const shown=await (await call('/api/chats/admin/sessions/'+legacy.id)).json();assert.equal(shown.name,user.name);assert.equal(shown.userCode,code);assert.equal(shown.userId,null);
  assert.equal((await call('/api/chats/'+legacy.id+'/messages',member)).status,404);
  const guestResponse=await call('/api/chats/guest/session',null,{method:'POST'}),cookie=guestResponse.headers.get('set-cookie').split(';')[0];const guest=await guestResponse.json();chats.push(guest.id);
  assert.equal((await call('/api/chats/link-guest',null,{method:'POST',headers:{Cookie:cookie}})).status,401);
  await call('/api/chats/link-guest',member,{method:'POST',headers:{Cookie:'essen_guest_chat='+'a'.repeat(64)}});
  assert.equal((await db.chatSession.findUnique({where:{id:guest.id}})).userId,null);
  assert.equal((await call('/api/chats/link-guest',member,{method:'POST',headers:{Cookie:cookie}})).status,204);
  const linked=await db.chatSession.findUnique({where:{id:guest.id}});assert.equal(linked.userId,user.id);assert.equal(linked.name,user.name);
  const other=jwt.sign({id:users[1].id,role:'user'},process.env.JWT_SECRET);
  await call('/api/chats/link-guest',other,{method:'POST',headers:{Cookie:cookie}});
  assert.equal((await db.chatSession.findUnique({where:{id:guest.id}})).userId,user.id);
  assert.equal((await call('/api/chats/guest/messages',null,{headers:{Cookie:cookie}})).status,401);
  assert.equal((await call('/api/chats/'+guest.id+'/messages',other)).status,404);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));if(chats.length)await db.chatSession.deleteMany({where:{id:{in:chats}}});if(users.length)await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await db.$disconnect();}
});

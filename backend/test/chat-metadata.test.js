const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
test('registered chat names come from DB and all message timestamps survive admin reads',{skip:!process.env.AUTH_TEST_DATABASE_URL},async()=>{
 const url=new URL(process.env.AUTH_TEST_DATABASE_URL);assert(['localhost','127.0.0.1'].includes(url.hostname));
 const {PrismaClient}=require('../generated/client-v3'),{PrismaPg}=require('@prisma/adapter-pg');
 const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:false})});
 require.cache[require.resolve('../lib/prisma')]={exports:db};process.env.JWT_SECRET=crypto.randomUUID();
 const express=require('express'),jwt=require('jsonwebtoken'),app=express();app.use(express.json());app.use('/api/chats',require('../routes/chats'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 let user,session;
 try{
  user=await db.user.create({data:{firstName:'Ad',lastName:'Soyad',name:'Old display',email:crypto.randomUUID()+'@example.invalid',phone:'+994501234588',password:'test-only'}});
  const token=jwt.sign({id:user.id,role:'user'},process.env.JWT_SECRET),admin=jwt.sign({id:user.id,role:'admin'},process.env.JWT_SECRET);
  const call=(route,auth=admin,method='GET',body)=>fetch('http://127.0.0.1:'+server.address().port+'/api/chats'+route,{method,headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const created=await call('/session',token,'POST');assert.equal(created.status,200);session=await created.json();
  assert.equal(session.name,'Ad Soyad');
  await db.chatSession.update({where:{id:session.id},data:{name:'Stale session name'}});
  const dates=['2026-09-09T23:05:00.000Z','2026-09-10T08:10:00.000Z'];
  for(let i=0;i<2;i++)await db.chatMessage.create({data:{sessionId:session.id,sender:i?'admin':'user',text:'Test '+i,createdAt:new Date(dates[i])}});
  const list=await (await call('/admin/sessions/list')).json();assert.equal(list.find(s=>s.id===session.id).name,'Ad Soyad');
  const room=await (await call('/admin/sessions/'+session.id)).json();assert.equal(room.name,'Ad Soyad');assert.equal(room.user,undefined);
  assert.deepEqual(room.messages.map(m=>m.createdAt),dates);
  assert.equal((await call('/admin/sessions/'+session.id,token)).status,403);
  const other=jwt.sign({id:user.id+100000,role:'user'},process.env.JWT_SECRET);
  assert.equal((await call('/'+session.id+'/messages',other)).status,404);
  await db.user.update({where:{id:user.id},data:{firstName:'Yeni',lastName:'Ad'}});
  assert.equal((await (await call('/admin/sessions/'+session.id)).json()).name,'Yeni Ad');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));if(session)await db.chatSession.delete({where:{id:session.id}});if(user)await db.user.delete({where:{id:user.id}});await db.$disconnect();}
});

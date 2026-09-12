const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const jwt=require('jsonwebtoken');
const {createCreditOrdersRouter}=require('../routes/creditOrders');
test('credit submission validates, prices on server, deduplicates and restricts admin access',async t=>{
  process.env.JWT_SECRET='credit-local-test-only';const rows=[];
  const db={product:{findMany:async()=>[{id:1,name:'Test product',price:125.5,stock:5}]},creditApplication:{
    findUnique:async({where})=>rows.find(r=>r.requestKey===where.requestKey),
    create:async({data})=>{const row={...data,id:'application-1',number:rows.length+1,status:'new',createdAt:new Date()};rows.push(row);return row;},
    findMany:async()=>rows,count:async()=>rows.length,update:async({data})=>Object.assign(rows[0],data),
    delete:async({where})=>{const index=rows.findIndex(r=>r.id===where.id);if(index<0)throw Object.assign(Error('missing'),{code:'P2025'});return rows.splice(index,1)[0];}
  }};
  const app=express();app.use(express.json());app.use('/api/credit-orders',createCreditOrdersRouter(db));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections();}));const base='http://127.0.0.1:'+server.address().port+'/api/credit-orders';
  const body={firstName:'Test',lastName:'Testli',fatherName:'Test',phone:'050 123 45 67',fin:'TEST123',hasSima:false,requestKey:'11111111-1111-4111-8111-111111111111',items:[{productId:1,quantity:2,price:1}],total:2};
  const submit=payload=>fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  assert.equal((await submit({...body,hasSima:undefined})).status,400);
  assert.equal((await submit({...body,fin:'x'})).status,400);
  assert.equal((await submit({...body,items:[{productId:1,quantity:6}]})).status,409);
  assert.equal((await submit(body)).status,201);assert.equal(rows[0].total,251);assert.equal(rows[0].items[0].price,125.5);assert.equal(rows[0].phone,'994501234567');
  const repeated=await submit(body);assert.equal(repeated.status,200);assert.equal(rows.length,1);assert.deepEqual(await repeated.json(),{id:'application-1',code:'000001'});
  assert.equal((await submit({...body,fin:'TEST456'})).status,409);
  assert.equal((await fetch(base+'/admin')).status,401);
  const headers={Authorization:'Bearer '+jwt.sign({id:1,role:'user'},process.env.JWT_SECRET)};
  assert.equal((await fetch(base+'/admin',{headers})).status,403);
  assert.equal((await fetch(base+'/admin/application-1',{method:'DELETE'})).status,401);
  assert.equal((await fetch(base+'/admin/application-1',{method:'DELETE',headers})).status,403);assert.equal(rows.length,1);
  headers.Authorization='Bearer '+jwt.sign({id:2,role:'admin'},process.env.JWT_SECRET);
  const admin=await fetch(base+'/admin',{headers});assert.equal(admin.status,200);assert.equal(admin.headers.get('cache-control'),'no-store');assert.equal((await admin.json()).items[0].fin,'TEST123');
  const updated=await fetch(base+'/admin/application-1',{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({status:'contacted'})});assert.equal(updated.status,200);assert.equal(rows[0].status,'contacted');
  assert.equal((await fetch(base+'/admin/application-1',{method:'DELETE',headers})).status,200);assert.equal(rows.length,0);
  const afterDelete=await (await fetch(base+'/admin',{headers})).json();assert.equal(afterDelete.count,0);assert.deepEqual(afterDelete.items,[]);
  assert.equal((await fetch(base+'/admin/application-1',{method:'DELETE',headers})).status,404);
});

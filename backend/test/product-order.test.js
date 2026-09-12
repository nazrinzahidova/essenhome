const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),jwt=require('jsonwebtoken');
const {createProductOrderRouter}=require('../routes/productOrder');
test('ordering protects admin access, isolates sections and rejects stale or invalid lists',async t=>{
 process.env.JWT_SECRET='order-test';let catalog=[{id:1,name:'A'},{id:2,name:'B'},{id:3,name:'C'}],section=[{id:2,name:'B'},{id:1,name:'A'}];const updates=[];
 const db={product:{findMany:async()=>catalog},homeSection:{findUniqueOrThrow:async()=>({id:7})},homeSectionProduct:{findMany:async()=>section.map(product=>({product}))},$executeRawUnsafe:async(sql,json,sectionId)=>{if(sql.startsWith('SELECT'))return 0;const ids=JSON.parse(json).map(r=>r.id);updates.push({ids,sectionId});if(sectionId===undefined)catalog=ids.map(id=>catalog.find(p=>p.id===id));else section=ids.map(id=>section.find(p=>p.id===id));return ids.length;}};db.$transaction=fn=>fn(db);
 const app=express();app.use(express.json());app.use('/api/product-order',createProductOrderRouter(db));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections();}));const base='http://127.0.0.1:'+server.address().port+'/api/product-order';
 const headers={'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({id:1,role:'admin'},process.env.JWT_SECRET)};const send=(body,suffix='',h=headers)=>fetch(base+suffix,{method:'PUT',headers:h,body:JSON.stringify(body)});
 assert.equal((await fetch(base)).status,401);assert.equal((await send({ids:[3,1,2],originalIds:[1,2,3]},'',{...headers,Authorization:'Bearer '+jwt.sign({id:2,role:'user'},process.env.JWT_SECRET)})).status,403);
 assert.equal((await send({ids:[3,1,2],originalIds:[1,2,3]})).status,200);assert.deepEqual(catalog.map(p=>p.id),[3,1,2]);
 assert.equal((await send({ids:[1,2,3],originalIds:[1,2,3]})).status,409);
 assert.equal((await send({ids:[1,1],originalIds:[2,1]},'?section=7')).status,400);
 assert.equal((await send({ids:[1,3],originalIds:[2,1]},'?section=7')).status,409);
 assert.equal((await send({ids:[1,2],originalIds:[2,1]},'?section=7')).status,200);assert.deepEqual(section.map(p=>p.id),[1,2]);assert.deepEqual(catalog.map(p=>p.id),[3,1,2]);assert.equal(updates[1].sectionId,7);
 assert.equal((await fetch(base+'?section=bad',{headers})).status,400);
});

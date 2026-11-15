const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const express=require('express');
const jwt=require('jsonwebtoken');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {validateEvent,loadCommerceReport}=require('../lib/commerceAnalytics');
const {createAnalyticsRouter}=require('../routes/analytics');
const {createCommerceAnalyticsDb}=require('./helpers/commerceAnalyticsDb');

test('analytics accepts only bounded interaction events, never client sales or personal data',()=>{
  const event={id:crypto.randomUUID(),kind:'add_to_cart',productId:1,quantity:2,source:'product'};
  assert.ok(validateEvent(event));
  for(const body of [{...event,kind:'purchase'},{...event,quantity:0},{...event,quantity:21},{...event,productId:null},{...event,productId:'1'},{...event,source:'<script>'},{...event,phone:'private'},{...event,price:999},{...event,id:'bad'},null,[]])assert.equal(validateEvent(body),null);
  assert.ok(validateEvent({id:crypto.randomUUID(),kind:'whatsapp_click',source:'home'}));
});

test('commerce reports use PostgreSQL date boundaries, unique orders and delivered-only revenue',{skip:!process.env.ANALYTICS_TEST_PGLITE},async t=>{
  const {sql,db}=await createCommerceAnalyticsDb();t.after(()=>sql.close());
  await sql.exec(`INSERT INTO "Order" VALUES
    (1,'delivered',204.99,4.99,'2026-11-14 20:00:00','2026-11-15 19:59:59.999'),
    (2,'pending',100,0,'2026-11-15 08:00:00',NULL),
    (3,'cancelled',500,0,'2026-11-15 08:00:00',NULL),
    (4,'returned',900,0,'2026-11-15 08:00:00','2026-11-15 09:00:00'),
    (5,'delivered',300,0,'2026-11-14 19:59:59.999','2026-11-15 20:00:00'),
    (6,'delivered',50,0,'2026-11-10 08:00:00','2026-11-14 20:00:00');
    INSERT INTO "OrderItem" ("orderId","productId",quantity,price) VALUES
    (1,1,1,100),(1,1,1,100),(2,1,1,100),(3,2,1,500),(4,2,1,900),(5,2,1,300),(6,2,1,50);`);
  const events=[['add_to_cart',1,2,'2026-11-14T20:00:00Z'],['whatsapp_click',1,0,'2026-11-15T19:59:59.999Z'],['begin_checkout',null,0,'2026-11-15T10:00:00Z'],['whatsapp_click',null,0,'2026-11-15T12:00:00Z'],['add_to_cart',1,1,'2026-11-14T19:59:59.999Z'],['add_to_cart',1,1,'2026-11-15T20:00:00Z']];
  for(const [kind,id,quantity,date]of events)await sql.query('INSERT INTO "AnalyticsEvent" (id,kind,"visitorHash","sessionHash","productId",quantity,source,"createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[crypto.randomUUID(),kind,'a'.repeat(64),'b'.repeat(64),id,quantity,'product',date]);
  const data=await loadCommerceReport(db,'2026-11-15','2026-11-15');
  assert.deepEqual(data.summary,{cartAdds:1,cartQuantity:2,checkoutStarts:1,whatsappClicks:2,orders:4,sales:2,revenue:250,cancelled:1,returned:1});
  const product=data.products.find(row=>row.productId===1);
  assert.equal(product.orders,2,'two lines for one product count as one order');assert.equal(product.unitsSold,2);assert.equal(product.revenue,200);
  assert.equal(data.products.find(row=>row.productId===2).revenue,50,'returned and cancelled orders are not sales');
  assert.equal(data.daily.length,1);assert.equal(data.daily[0].date,'2026-11-15');
  await sql.exec(`UPDATE "Order" SET status='returned' WHERE id=1`);
  assert.equal((await loadCommerceReport(db,'2026-11-15','2026-11-15')).summary.revenue,50);
});

test('events HTTP: origin, admin/DNT exclusion, idempotency, renewal, auth and report filters',{skip:!process.env.ANALYTICS_TEST_PGLITE},async t=>{
  const {sql,db}=await createCommerceAnalyticsDb();t.after(()=>sql.close());
  process.env.JWT_SECRET='isolated-analytics-http-test';
  const app=express();app.use(express.json());app.use('/api/analytics',createAnalyticsRouter(db));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const base='http://127.0.0.1:'+server.address().port+'/api/analytics';
  const cookies='eh_av='+crypto.randomUUID()+'; eh_as='+crypto.randomUUID();
  const event={id:crypto.randomUUID(),kind:'add_to_cart',source:'product',productId:1,quantity:1};
  const post=(body=event,headers={})=>fetch(base+'/events',{method:'POST',headers:{Origin:'https://essenhome.az','Content-Type':'application/json','User-Agent':'Mozilla/5.0',Cookie:cookies,...headers},body:JSON.stringify(body)});
  assert.equal((await post(event,{Origin:'https://attacker.example'})).status,403);
  assert.equal((await post({...event,kind:'purchase'})).status,400);
  assert.equal((await post(event,{Cookie:cookies+'; eh_analytics_off=1'})).status,204);
  assert.equal((await post(event,{DNT:'1'})).status,204);
  assert.equal((await post(event,{'User-Agent':'Googlebot'})).status,204);
  assert.equal((await post({...event,productId:999})).status,400);
  assert.equal((await sql.query('SELECT COUNT(*)::int AS n FROM "AnalyticsEvent"')).rows[0].n,0);
  assert.equal((await post()).status,204);assert.equal((await post()).status,204);
  assert.equal((await sql.query('SELECT COUNT(*)::int AS n FROM "AnalyticsEvent"')).rows[0].n,1,'retries are not new actions');
  const renewed=await post({id:crypto.randomUUID(),kind:'whatsapp_click',source:'home'},{Cookie:cookies.split(';')[0]});assert.equal(renewed.status,204);assert.match(renewed.headers.get('set-cookie'),/eh_as=.*HttpOnly/);
  assert.equal((await fetch(base)).status,401);
  const user=jwt.sign({id:1,role:'user'},process.env.JWT_SECRET),admin=jwt.sign({id:2,role:'admin'},process.env.JWT_SECRET);
  assert.equal((await fetch(base,{headers:{Authorization:'Bearer '+user}})).status,403);
  const report=await fetch(base,{headers:{Authorization:'Bearer '+admin}});assert.equal(report.status,200);const data=await report.json();assert.equal(data.commerce.summary.cartAdds,1);assert.equal(data.commerce.summary.whatsappClicks,1);assert.equal(data.products.items.length,2);assert.ok(data.commerce.startedAt);
  assert.equal((await fetch(base+'?from=2026-02-30',{headers:{Authorization:'Bearer '+admin}})).status,400);
  const filtered=await (await fetch(base+'?q=Test%20TV',{headers:{Authorization:'Bearer '+admin}})).json();assert.equal(filtered.products.items.length,1);assert.equal(filtered.products.items[0].id,2);
});

function trackerHarness(options={}){
  const requests=[],stored=new Map(),listeners={},winListeners={};
  const document={cookie:options.admin?'eh_analytics_off=1':'',visibilityState:'visible',querySelector:()=>({content:'1'}),addEventListener:(key,fn)=>listeners[key]=fn};
  const window={addEventListener:(key,fn)=>winListeners[key]=fn};
  const context={window,document,navigator:{doNotTrack:options.dnt?'1':'0'},location:{pathname:'/product.html',search:'?id=1',href:'https://essenhome.az/product.html?id=1'},crypto,URL,URLSearchParams,Date,console,sessionStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)},fetch:async(url,request)=>{requests.push(JSON.parse(request.body));return {ok:true,status:204};}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../frontend/analytics-events.js'),'utf8'),context);
  return {requests,stored,listeners,window,context};
}
test('storefront tracker keeps checkout retries stable and captures WhatsApp without messages or navigation changes',async()=>{
  const h=trackerHarness();h.window.EssenAnalytics.beginCheckout([{id:1,qty:2}]);h.window.EssenAnalytics.beginCheckout([{id:1,qty:2}]);
  await new Promise(resolve=>setImmediate(resolve));h.window.EssenAnalytics.beginCheckout([{id:1,qty:2}]);
  const begins=h.requests.filter(e=>e.kind==='begin_checkout');assert.equal(new Set(begins.map(e=>e.id)).size,1);
  h.window.EssenAnalytics.checkoutComplete();h.window.EssenAnalytics.beginCheckout([{id:1,qty:2}]);assert.equal(new Set(h.requests.filter(e=>e.kind==='begin_checkout').map(e=>e.id)).size,2);
  h.listeners.click({button:0,target:{closest:()=>({href:'https://wa.me/994102414782?text=private-message'})}});
  const click=h.requests.find(e=>e.kind==='whatsapp_click');assert.ok(click);assert.equal(JSON.stringify(click).includes('private-message'),false);
  h.listeners.auxclick({button:2,target:{closest:()=>({href:'https://wa.me/994102414782'})}});assert.equal(h.requests.filter(e=>e.kind==='whatsapp_click').length,1);
  for(const options of [{admin:true},{dnt:true}]){const blocked=trackerHarness(options);blocked.window.EssenAnalytics.track('add_to_cart',{productId:1});assert.equal(blocked.requests.length,0);}
});

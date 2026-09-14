const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const policy = require('../../frontend/order-policy');
const { createOrdersRouter } = require('../routes/orders');
const { offerPolicies, organization } = require('../lib/merchantPolicies');
const { canReturn } = require('../lib/orderLifecycle');

test('Baku cutoff, midnight, month/year rollover and invalid dates', () => {
  for (const [instant, expected] of [
    ['2026-09-14T05:59:59.999Z','2026-09-14'], ['2026-09-14T06:00:00Z','2026-09-15'],
    ['2026-09-14T19:59:59Z','2026-09-15'], ['2026-09-14T20:00:00Z','2026-09-15'],
    ['2026-12-31T06:00:00Z','2027-01-01'], ['2028-02-28T06:00:00Z','2028-02-29']
  ]) assert.equal(policy.earliestDate(new Date(instant)), expected);
  assert.throws(() => policy.validateDate('2026-09-14', new Date('2026-09-14T06:00:00Z')));
  assert.throws(() => policy.validateDate('2026-02-30'));
  assert.equal(policy.shippingCost(199.98), 4.99);
  assert.equal(policy.shippingCost(199.99), 0);
  assert.equal(policy.shippingCost(200), 0);
});

test('merchant graph resolves shared policies and keeps AZ/AZN without invented return fees', () => {
  const seller = organization();
  for (const price of [49.99,199.98,199.99,549.99]) {
    const offer = offerPolicies(price);
    assert.equal(offer.hasMerchantReturnPolicy['@id'], seller.hasMerchantReturnPolicy['@id']);
    assert.equal(offer.shippingDetails.hasShippingService['@id'], seller.hasShippingService['@id']);
    assert.equal(offer.shippingDetails.shippingDestination.addressCountry,'AZ');
    assert.equal(offer.shippingDetails.shippingRate.currency,'AZN');
    assert.equal(offer.shippingDetails.shippingRate.value, price < 199.99 ? 4.99 : 0);
    assert.equal(offer.shippingDetails.deliveryTime.cutoffTime,'10:00:00+04:00');
  }
  assert.equal(seller.hasMerchantReturnPolicy.merchantReturnDays,14);
  assert.equal(seller.hasMerchantReturnPolicy.applicableCountry,'AZ');
  assert.equal(seller.hasMerchantReturnPolicy.returnFees,undefined);
  assert.equal(seller.hasMerchantReturnPolicy.returnMethod,undefined);
});

test('orders: ownership, trusted prices, idempotency, cancellation and return lifecycle', async t => {
  process.env.JWT_SECRET = 'local-order-tests-only';
  let clock = new Date('2026-09-14T05:00:00Z');
  const rows = [], credits = [];
  const matches = (row, where) => Object.entries(where).every(([key,value]) => row[key] instanceof Date ? +row[key] === +value : (row[key] ?? null) === value);
  const db = {
    product:{ findMany:async () => [{ id:1,name:'Test appliance',price:49.99,stock:5 }] },
    order:{
      findUnique:async ({where}) => rows.find(row => matches(row,where)),
      findFirst:async ({where}) => rows.find(row => matches(row,where)),
      findMany:async ({where}) => rows.filter(row => !where || matches(row,where)),
      create:async ({data}) => { const row = { id:rows.length+1,status:'pending',createdAt:clock,returnRequestedAt:null,...data,items:data.items.create }; rows.push(row); return row; },
      updateMany:async ({where,data}) => { const found = rows.filter(row => matches(row,where)); found.forEach(row => Object.assign(row,data)); return {count:found.length}; }
    },
    creditApplication:{ updateMany:async ({where,data}) => { credits.filter(row => matches(row,where)).forEach(row => Object.assign(row,data)); return {count:1}; } }
  };
  db.$transaction = async fn => fn(db);
  const app = express(); app.use(express.json()); app.use('/api/orders',createOrdersRouter(db,() => clock));
  const server = app.listen(0,'127.0.0.1'); await new Promise(r => server.once('listening',r));
  t.after(() => new Promise(r => {server.close(r);server.closeAllConnections();}));
  const base = 'http://127.0.0.1:'+server.address().port+'/api/orders';
  const request = (path, body, id=1, role='user', method=body?'POST':'GET') => fetch(base+path,{
    method,headers:{'Content-Type':'application/json',...(id ? {Authorization:'Bearer '+jwt.sign({id,role},process.env.JWT_SECRET)} : {})},...(body ? {body:JSON.stringify(body)} : {})
  });
  const payload = () => ({ requestKey:crypto.randomUUID(),paymentMethod:'cash',deliveryDate:'2026-09-14',address:'Bakı test ünvanı 42',items:[{productId:1,quantity:1,price:0.01}],userId:99,total:0.01 });
  assert.equal((await request('',payload(),null)).status,401);
  assert.equal((await request('/admin',undefined)).status,403);
  assert.equal((await request('',{...payload(),items:[{productId:1,quantity:4},{productId:1,quantity:4}]})).status,409);
  const body=payload(); const created=await request('',body); assert.equal(created.status,201);
  const order=await created.json(); assert.equal(order.userId,1); assert.equal(order.total,54.98); assert.equal(order.items[0].price,49.99); assert.equal(order.requestHash,undefined);
  assert.equal((await request('',body)).status,200); assert.equal(rows.length,1);
  assert.equal((await request('',{...body,address:'Digər ünvan 24'})).status,409);
  assert.equal((await request('',body,2)).status,409);
  assert.deepEqual(await (await request('/my',undefined,2)).json(),[]);
  assert.equal((await request('/1/cancel',{reason:'other',details:'Səhv sifariş'},2)).status,404);
  assert.equal((await request('/1/cancel',{reason:'unknown',details:'Səhv sifariş'})).status,400);
  assert.equal((await request('/1/cancel',{reason:'other'})).status,400);
  for (const reason of ['damaged','faulty','different']) assert.equal((await request('/1/cancel',{reason,details:'İzah'})).status,400);
  credits.push({orderId:1,status:'new'});
  assert.equal((await request('/1/cancel',{reason:'wrong_order'})).status,200);
  assert.equal(rows[0].status,'cancelled'); assert.equal(rows[0].cancellationReason,'Sifarişi səhv verdim'); assert.equal(credits[0].status,'cancelled');
  assert.equal((await request('/1/cancel',{reason:'other',details:'təkrar'})).status,409);
  assert.equal((await request('/admin/1',{status:'confirmed'},3,'admin','PATCH')).status,409);
  clock=new Date('2026-09-14T06:00:00Z');
  assert.equal((await request('',payload())).status,400);
  assert.equal((await request('',{...payload(),deliveryDate:'2026-09-15'})).status,201);
  for(const status of ['confirmed','shipped','delivered']) assert.equal((await request('/admin/2',{status},3,'admin','PATCH')).status,200);
  assert.equal(+rows[1].deliveredAt,+clock);
  assert.equal((await request('/2/cancel',{reason:'other',details:'gecdir'})).status,409);
  const deadline=new Date(+clock+14*86400000);
  assert.equal(canReturn(rows[1],new Date(+deadline+1)),false);
  clock=deadline;
  assert.equal((await request('/2/return',{reason:'other',details:'Məhsul işə düşmür'})).status,200);
  assert.equal((await request('/2/return',{reason:'other',details:'Məhsul işə düşmür'})).status,409);
  assert.equal(rows[1].status,'delivered'); assert.ok(rows[1].returnRequestedAt);
  assert.equal((await request('/admin/2',{status:'returned'},3,'admin','PATCH')).status,200);
});

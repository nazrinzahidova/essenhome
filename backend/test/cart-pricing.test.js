const { test } = require('node:test');
const assert = require('node:assert/strict');
const { priceProducts, priceCart, halfPrice } = require('../lib/cartPricing');

// Model the old trigger: an active QR entrant and products in section 2.
const campaignDb = {
  $queryRaw: async () => [{ eligible: true }],
  homeSectionProduct: { findMany: async () => [{ productId: 1 }] }
};
const products = [
  { id: 1, name: 'Sale product', price: '199.99', oldPrice: 399.98, discount: '50%' },
  { id: 2, name: 'Other discount', price: '79.90', oldPrice: 100, discount: '20%' },
  { id: 3, name: 'Regular product', price: 49.99 }
];

test('active QR entrants keep advertised prices, including section 2', async () => {
  const result = await priceProducts(campaignDb, products, 7);
  assert.deepEqual(result.map(p => p.price), [199.99, 79.9, 49.99]);
  assert.deepEqual(result.map(p => p.cartDiscountPercent), [0, 0, 0]);
  assert.deepEqual(result.map(p => p.basePrice), [199.99, 79.9, 49.99]);
  assert.equal(result[0].oldPrice, 399.98);
  assert.equal(result[0].discount, '50%');
  assert.equal(result[1].discount, '20%');
  assert.equal(products[0].price, '199.99', 'do not mutate catalog records');
});

test('guest, non-participant and participant quotes use the same catalog prices', async () => {
  const expected = await priceProducts(campaignDb, products, 7);
  for (const userId of [undefined, null, 0, 8]) {
    assert.deepEqual(await priceProducts({}, products, userId), expected);
  }
  assert.deepEqual(await priceProducts({}, [], 7), []);
});

test('cart updates preserve quantities, variants and catalog prices', async () => {
  const rows = products.map((product, i) => ({
    id: 10 + i, userId: 7, quantity: i + 2, color: 'black', product
  }));
  const result = await priceCart(campaignDb, rows, 7);
  assert.deepEqual(result.map(r => r.product.price), [199.99, 79.9, 49.99]);
  assert.deepEqual(result.map(r => r.quantity), [2, 3, 4]);
  assert.deepEqual(result.map(r => r.id), [10, 11, 12]);
  assert.ok(result.every(r => r.color === 'black' && r.userId === 7));
  assert.deepEqual(await priceCart({}, [], 7), []);
});

test('catalog quotes do not depend on campaign database availability', async () => {
  const unavailable = new Proxy({}, { get() { throw Error('Campaign DB unavailable'); } });
  assert.equal((await priceProducts(unavailable, products, 7))[0].price, 199.99);
});

test('existing half-price utility retains its rounding and validation behavior', () => {
  assert.equal(halfPrice(199.99), 99.99);
  assert.equal(halfPrice('100'), 50);
  assert.equal(halfPrice(0), 0);
  assert.throws(() => halfPrice(-1));
  assert.throws(() => halfPrice('invalid'));
});

test('cart HTTP quote, add, read and quantity update keep the advertised price', async t => {
  process.env.JWT_SECRET = 'cart-pricing-local-test-only';
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const product = products[0];
  let row;
  const db = {
    ...campaignDb,
    product: {
      findMany: async () => [product],
      findUnique: async () => product
    },
    cart: {
      findMany: async () => row ? [row] : [],
      findFirst: async () => row,
      create: async ({ data }) => (row = { id: 1, ...data, product }),
      update: async ({ data }) => (row = { ...row, ...data })
    }
  };
  const prismaPath = require.resolve('../lib/prisma');
  const previous = require.cache[prismaPath];
  require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: db };
  t.after(() => {
    if (previous) require.cache[prismaPath] = previous;
    else delete require.cache[prismaPath];
    delete require.cache[require.resolve('../routes/cart')];
  });
  const app = express();
  app.use(express.json());
  app.use('/api/cart', require('../routes/cart'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/cart';
  const request = (path, method, body, authenticated = true) => fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(authenticated ? {
      Authorization: 'Bearer ' + jwt.sign({ id: 7, role: 'user' }, process.env.JWT_SECRET)
    } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  for (const authenticated of [false, true]) {
    const quote = await request('/quote', 'POST', { productIds: [1] }, authenticated);
    assert.equal(quote.status, 200);
    assert.equal(quote.headers.get('cache-control'), 'no-store');
    assert.equal((await quote.json())[0].price, 199.99);
  }
  const added = await request('', 'POST', { productId: 1, quantity: 1, price: 0.01 });
  assert.equal(added.status, 201);
  assert.equal((await added.json()).product.price, 199.99);
  const repeated = await request('', 'POST', { productId: 1, quantity: 1 });
  assert.equal(repeated.status, 200);
  const item = await repeated.json();
  assert.equal(item.quantity, 2);
  assert.equal(item.product.price, 199.99);
  const updated = await request('/1', 'PUT', { quantity: 3 });
  assert.equal(updated.status, 200);
  const changed = await updated.json();
  assert.equal(changed.quantity, 3);
  assert.equal(changed.product.price, 199.99);
  assert.equal(changed.product.cartDiscountPercent, 0);
  const read = await request('', 'GET');
  assert.equal(read.status, 200);
  assert.equal((await read.json())[0].product.price, 199.99);
});

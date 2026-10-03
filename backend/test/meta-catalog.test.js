const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createSeoRouter } = require('../routes/seo');

test('Meta feed follows homepage additions and removals, updates prices and stock, and excludes invalid products', async t => {
  const products = [
    { id: 1, name: 'Washer & dryer <A>', category: 'Appliances', subcategory: 'Washers', brand: 'Brand', price: 123.45, stock: 2, image: '/img/test.jpg', placements: [], seoDescription: 'Buy "A" & B' },
    { id: 2, name: 'Featured phone', subcategory: 'Smartfonlar', price: 200, stock: 0, images: [{ id: 22, position: 0, isPrimary: true }] },
    { id: 3, name: 'Hidden phone', subcategory: 'Smartfonlar', price: 200, stock: 1, image: '/img/test.jpg' },
    { id: 4, name: 'Hidden laptop', subcategory: 'Notbuklar', price: 300, stock: 1, image: '/img/test.jpg' },
    { id: 5, name: 'Missing image', price: 100 },
    { id: 6, name: 'Bad image', price: 100, image: 'javascript:alert(1)' },
    { id: 7, name: 'Invalid price', price: 0, image: '/img/test.jpg' },
    { id: 8, name: 'Unfeatured washer', price: 100, image: '/img/test.jpg' }
  ];
  let failed = false;
  let featured = [1, 2, 5, 6, 7];
  const db = { product: { findMany: async () => { if (failed) throw Error('offline'); return products; } }, homeSection: { findMany: async ({where}) => { assert.equal(where.active, true); return [{ products: featured.map(productId => ({productId})) }]; } } };
  const app = express(); app.use(createSeoRouter(db));
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  t.after(() => new Promise(r => { server.close(r); server.closeAllConnections(); }));
  const get = () => fetch(`http://127.0.0.1:${server.address().port}/meta-catalog.xml`);
  let response = await get(); let xml = await response.text();
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /application\/xml/);
  assert.equal((xml.match(/<item>/g) || []).length, 2);
  assert.match(xml, /Washer &amp; dryer &lt;A&gt;/); assert.match(xml, /Buy &quot;A&quot; &amp; B/);
  assert.match(xml, /123.45 AZN/); assert.match(xml, /https:\/\/essenhome.az\/api\/product-images\/22/);
  assert.match(xml, /<g:availability>out of stock<\/g:availability>/);
  assert.doesNotMatch(xml, /Hidden phone|Hidden laptop|Missing image|Bad image|Invalid price|Unfeatured washer/);
  featured = [2, 8, 8];
  xml = await (await get()).text(); assert.equal((xml.match(/<item>/g) || []).length, 2);
  assert.match(xml, /Unfeatured washer/); assert.doesNotMatch(xml, /Washer &amp; dryer/);
  featured = [1, 2];
  products[0].price = 99; products[0].stock = 0;
  xml = await (await get()).text(); assert.match(xml, /99.00 AZN/); assert.doesNotMatch(xml, /123.45 AZN|<g:availability>in stock/);
  failed = true; response = await get(); assert.equal(response.status, 503); assert.equal(response.headers.get('retry-after'), '60');
});

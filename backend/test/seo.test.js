const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createSeoRouter } = require('../routes/seo');

test('SEO: crawler HTML, escaping, live product changes, sitemaps and error status', async t => {
  const rows = [{ id: 707, name: 'Beko WSRE 6512 PRS', description: '6 kq', brand: 'Beko', price: 650, stock: 2, updatedAt: new Date('2026-09-08'), images: [{ id: 42, position: 0, isPrimary: true }] }];
  let failed = false;
  const db = { product: {
    count: async () => { if (failed) throw Error('offline'); return rows.length; },
    findMany: async ({ skip, take }) => rows.slice(skip, skip + take),
    findUnique: async ({ where }) => { if (failed) throw Error('offline'); return rows.find(row => row.id === where.id); }
  } };
  const app = express();
  app.use(createSeoRouter(db));
  // This must precede static serving, as in the production server.
  app.use((_req, res) => res.send('static fallback'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const get = url => fetch(`http://127.0.0.1:${server.address().port}${url}`);
  let response = await get('/product.html?id=707');
  assert.equal(response.status, 200);
  let html = await response.text();
  assert.match(html, /<title>Beko WSRE 6512 PRS \| Essen Home<\/title>/);
  assert.match(html, /<h1>Beko WSRE 6512 PRS<\/h1>/);
  assert.match(html, /rel="canonical" href="https:\/\/essenhome.az\/product.html\?id=707"/);
  const schema = text => JSON.parse(text.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema(html).offers.price, 650);
  assert.equal(schema(html).image[0], 'https://essenhome.az/api/product-images/42');
  assert.match(html, /id="productFooter"/);
  assert.match(html, /name="twitter:title"/);
  assert.match(html, /max-image-preview:large/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const categoryHtml = await (await get('/catalog.html?category=Kondisioner')).text();
  assert.match(categoryHtml, /<title>Kondisioner \| Essen Home<\/title>/);
  assert.match(categoryHtml, /catalog.html\?category=Kondisioner/);
  assert.match(await (await get('/catalog.html?search=test')).text(), /noindex,follow/);
  assert.equal((await get('/cart.html')).headers.get('x-robots-tag'), 'noindex, follow');
  rows[0].name = 'Model </script><script>alert(1)</script> & "test"';
  rows[0].price = 599;
  rows[0].stock = 0;
  html = await (await get('/product.html?id=707&tracking=yes')).text();
  assert.equal(schema(html).name, rows[0].name);
  assert.equal(schema(html).offers.price, 599);
  assert.equal(schema(html).offers.availability, 'https://schema.org/OutOfStock');
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.match(await (await get('/robots.txt')).text(), /Sitemap: https:\/\/essenhome.az\/sitemap.xml/);
  assert.match(await (await get('/sitemap.xml')).text(), /sitemap-products-1.xml/);
  assert.match(await (await get('/sitemap-products-1.xml')).text(), /product.html\?id=707/);
  rows.push({ id: 708, updatedAt: new Date('2026-09-09') });
  assert.match(await (await get('/sitemap-products-1.xml')).text(), /product.html\?id=708/);
  rows.splice(0, 1);
  assert.doesNotMatch(await (await get('/sitemap-products-1.xml')).text(), /id=707/);
  for (const url of ['/product.html?id=707', '/product.html', '/product.html?id=abc', '/product.html?id=999999999999999999', '/sitemap-products-2.xml']) assert.equal((await get(url)).status, 404);
  failed = true;
  assert.equal((await get('/product.html?id=708')).status, 503);
  assert.equal((await get('/sitemap.xml')).status, 503);
});

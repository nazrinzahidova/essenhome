const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('home sections: real local database, permissions and complete membership lifecycle', { skip: !process.env.HOME_TEST_DATABASE_URL }, async t => {
  const url = new URL(process.env.HOME_TEST_DATABASE_URL);
  assert(['127.0.0.1', 'localhost'].includes(url.hostname), 'Only a dedicated local test database is allowed');
  const { PrismaClient } = require('../generated/client-v3');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString(), ssl: false }) });

  // Run the actual additive migration twice to verify restart safety.
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url.toString(), ssl: false });
  const sql = fs.readFileSync(path.join(__dirname, '../prisma/migrations/20260909160000_home_sections/migration.sql'), 'utf8');
  await pool.query(sql); await pool.query(sql); await pool.end();
  const express = require('express'), jwt = require('jsonwebtoken');
  process.env.JWT_SECRET = 'local-home-sections-test-only';
  const app = express(); app.use(express.json());
  app.use('/api/home-sections', require('../routes/homeSections').createHomeSectionsRouter(db));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/home-sections`;
  const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
  const request = async (route, method = 'GET', body, authorized = true) => {
    const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  assert.equal((await request('', 'POST', { name: 'Forbidden' }, false)).status, 401);
  const userResponse = await fetch(base + '/admin', { headers: { Authorization: `Bearer ${jwt.sign({ id: 2, role: 'user' }, process.env.JWT_SECRET)}` } });
  assert.equal(userResponse.status, 403);
  assert.equal((await request('', 'POST', { name: ' ' })).status, 400);
  const p = await db.product.create({ data: { name: 'Local section test', nameRu: '', description: '', descRu: '', price: 100, category: 'Test', stock: 1 } });
  const sectionIds = [];
  t.after(async () => { await db.homeSection.deleteMany({ where: { id: { in: sectionIds } } }); await db.product.delete({ where: { id: p.id } }); await db.$disconnect(); });
  const create = async name => { const r = await request('', 'POST', { name }); assert.equal(r.status, 201); sectionIds.push(r.data.id); return r.data.id; };
  const a = await create('Fürsətlər'), b = await create('Yeni məhsullar');
  const publicSections = async () => (await request('/', 'GET', undefined, false)).data.filter(s => sectionIds.includes(s.id));
  assert.equal((await publicSections()).length, 0, 'Empty sections hidden');
  const select = (sectionId, selected) => request(`/products/${p.id}/${sectionId}`, 'PUT', { selected });
  assert.equal((await select(a, true)).status, 200);
  assert.equal((await publicSections())[0].products[0].id, p.id);
  await select(b, true); await select(b, true);
  assert.equal((await publicSections()).length, 2);
  assert.equal(await db.homeSectionProduct.count({ where: { productId: p.id } }), 2, 'No duplicate membership');
  await select(a, false);
  assert.deepEqual((await publicSections()).map(s => s.id), [b]);
  assert(await db.product.findUnique({ where: { id: p.id } }), 'Product retained');
  await request(`/${b}`, 'PATCH', { active: false }); assert.equal((await publicSections()).length, 0);
  await request(`/${b}`, 'PATCH', { active: true, name: 'Populyar məhsullar' });
  assert.equal((await publicSections())[0].name, 'Populyar məhsullar');
  await db.$disconnect(); // New connections and fresh HTTP requests must preserve DB state.
  assert.deepEqual((await request(`/products/${p.id}`)).data, [b]);
  assert.equal((await publicSections())[0].products[0].id, p.id);
  await select(a, true);
  const all = (await request('/admin')).data.map(s => s.id);
  const order = [b, a, ...all.filter(id => id !== a && id !== b)];
  assert.equal((await request('/order', 'PUT', { ids: order })).status, 200);
  assert.deepEqual((await publicSections()).map(s => s.id), [b, a]);
  await request(`/${b}`, 'DELETE');
  assert(await db.product.findUnique({ where: { id: p.id } }));
  assert.deepEqual((await request(`/products/${p.id}`)).data, [a]);
});

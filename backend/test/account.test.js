const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const express = require('express');

test('profile uses authenticated identity, limits returned fields and handles failures', async () => {
  process.env.JWT_SECRET = 'isolated-profile-test-only';
  let query, mode = 'user';
  const record = { firstName: 'Test', lastName: 'Customer', birthDate: null, email: 'customer@example.test', phone: '+994501234567' };
  require.cache[require.resolve('../lib/prisma')] = { exports: { user: { findUnique: async options => {
    query = options;
    if (mode === 'error') throw new Error('isolated failure');
    return mode === 'missing' ? null : record;
  } } } };
  const app = express(); app.use('/api/auth', require('../routes/auth'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/auth/me?userId=999&id=999`;
  async function call(token) { return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); }
  try {
    for (const token of [null, 'invalid', jwt.sign({ id: 4, type: 'registration' }, process.env.JWT_SECRET), jwt.sign({ id: 4, role: 'user' }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
      assert.equal((await call(token)).status, 401);
      assert.equal(query, undefined);
    }
    const token = jwt.sign({ id: 42, role: 'user' }, process.env.JWT_SECRET);
    const response = await call(token);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { user: record });
    assert.deepEqual(query.where, { id: 42 });
    assert.deepEqual(Object.keys(query.select).sort(), Object.keys(record).sort());
    mode = 'missing'; assert.equal((await call(token)).status, 404);
    mode = 'error'; assert.equal((await call(token)).status, 500);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

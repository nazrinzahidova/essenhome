const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const otp = require('../lib/otp');

test('phone normalization and real birth dates', () => {
  for (const input of ['0501234567', '501234567', '+994 (50) 123-45-67', '994501234567']) assert.equal(otp.normalizeAzPhone(input), '+994501234567');
  for (const input of ['abc994501234567', '+99450', null]) assert.equal(otp.normalizeAzPhone(input), null);
  assert.equal(otp.parseBirthDate('31/02/2000'), null);
  assert.equal(otp.parseBirthDate('29/02/2001'), null);
  assert.equal(otp.parseBirthDate('01/01/3000'), null);
  assert.equal(otp.parseBirthDate('2000-01-01'), null);
  assert.equal(otp.parseBirthDate('29/02/2000').toISOString(), '2000-02-29T00:00:00.000Z');
});

test('real Postgres: atomic request, verify, register, replay, resend, and failures', { skip: !process.env.AUTH_TEST_DATABASE_URL }, async t => {
  process.env.DATABASE_URL = process.env.AUTH_TEST_DATABASE_URL;
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  process.env.OTP_HASH_SECRET = crypto.randomBytes(32).toString('hex');
  const { Pool } = require('pg');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../generated/client-v3');
  const config = require('../lib/dbConfig')();
  const admin = new Pool({ ...config, max: 1 });
  const schema = 'auth_test_' + crypto.randomBytes(8).toString('hex');
  let db, server;
  const sent = [];
  let sendFailure = false;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    for (const table of ['User', 'OtpChallenge']) {
      await admin.query(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
      await admin.query(`CREATE SEQUENCE "${schema}"."${table}_id_seq"`);
      await admin.query(`ALTER TABLE "${schema}"."${table}" ALTER COLUMN id SET DEFAULT nextval('"${schema}"."${table}_id_seq"')`);
    }
    db = new PrismaClient({ adapter: new PrismaPg(config, { schema }), errorFormat: 'minimal' });
    require.cache[require.resolve('../lib/prisma')] = { exports: db };
    require.cache[require.resolve('../lib/pg365')] = { exports: { sendOtpSms: async (phone, code) => {
      if (sendFailure) throw Object.assign(new Error('provider unavailable'), { code: 'PG365_TIMEOUT' });
      sent.push({ phone, code });
      await new Promise(resolve => setTimeout(resolve, 40));
      return { providerId: 'isolated-test-' + sent.length };
    } } };
    const express = require('express');
    const app = express(); app.use(express.json()); app.use('/auth', require('../routes/auth'));
    app.get('/private', require('../middleware/auth'), (_req, res) => res.json({ ok: true }));
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    async function call(path, body, method = 'POST') {
      const response = await fetch(base + '/auth' + path, { method, ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json() };
    }
    const phone = '+994501234567';
    const request = () => call('/otp/request', { phone });
    const verify = code => call('/verify-code', { phone, code });
    const age = async () => { const item = await db.otpChallenge.findFirst({ orderBy: { id: 'desc' } }); await db.otpChallenge.update({ where: { id: item.id }, data: { createdAt: new Date(Date.now() - (otp.resendSeconds + 1) * 1000) } }); };

    await t.test('double request reserves one SMS and status survives refresh', async () => {
      const results = await Promise.all([request(), request()]);
      assert.deepEqual(results.map(x => x.status).sort(), [200, 429]);
      assert.equal(sent.length, 1);
      const success = results.find(x => x.status === 200).body;
      assert.ok(success.resendAfterSeconds > 0 && success.resendAfterSeconds <= otp.resendSeconds);
      assert.equal(success.testCode, undefined); assert.equal(success.code, undefined);
      const status = await call('/otp/status?phone=' + encodeURIComponent(phone), null, 'GET');
      assert.equal(status.body.codeSent, true); assert.ok(status.body.resendAfterSeconds > 0);
      assert.equal((await call('/request-code/' + phone, null, 'GET')).status, 405);
      assert.equal(sent.length, 1);
    });
    let registrationToken;
    await t.test('wrong code, double verify, single-use OTP, restricted registration token', async () => {
      assert.equal((await verify('000000')).body.message, 'Kod yanlışdır.');
      const results = await Promise.all([verify(sent[0].code), verify(sent[0].code)]);
      assert.deepEqual(results.map(x => x.status).sort(), [200, 400]);
      registrationToken = results.find(x => x.status === 200).body.registrationToken;
      assert.ok(registrationToken);
      assert.equal((await fetch(base + '/private', { headers: { Authorization: 'Bearer ' + registrationToken } })).status, 401);
    });
    let user;
    await t.test('profile validation and double registration create one user', async () => {
      const profile = { firstName: 'Sınaq', lastName: 'İstifadəçisi', birthDate: '29/02/2000', email: 'auth-test@example.invalid', registrationToken };
      assert.equal((await call('/complete-registration', { ...profile, firstName: ' ' })).status, 400);
      assert.equal((await call('/complete-registration', { ...profile, lastName: '' })).status, 400);
      assert.equal((await call('/complete-registration', { ...profile, birthDate: '31/02/2000' })).status, 400);
      assert.equal((await call('/complete-registration', { ...profile, email: 'a@@b.com' })).status, 400);
      const results = await Promise.all([call('/complete-registration', profile), call('/complete-registration', profile)]);
      assert.deepEqual(results.map(x => x.status).sort(), [200, 401]);
      assert.equal(await db.user.count(), 1);
      user = await db.user.findFirst();
      assert.equal(user.phone, phone); assert.equal(user.name, 'Sınaq İstifadəçisi');
      const token = results.find(x => x.status === 200).body.token;
      assert.equal((await fetch(base + '/private', { headers: { Authorization: 'Bearer ' + token } })).status, 200);
      assert.equal((await call('/register', { email: 'b@example.invalid' })).status, 410);
    });
    await t.test('resend invalidates prior code and existing user logs in unchanged', async () => {
      await age(); assert.equal((await request()).status, 200);
      const oldCode = sent.at(-1).code;
      await age(); assert.equal((await request()).status, 200);
      if (oldCode !== sent.at(-1).code) assert.equal((await verify(oldCode)).body.message, 'Kod yanlışdır.');
      const result = await verify(sent.at(-1).code);
      assert.equal(result.status, 200); assert.equal(result.body.registrationRequired, false);
      assert.equal(result.body.user.id, user.id); assert.equal(result.body.registrationToken, undefined);
      assert.deepEqual(await db.user.findFirst(), user);
      assert.equal((await verify(sent.at(-1).code)).status, 400);
    });
    await t.test('expired codes and concurrent brute force attempts are rejected', async () => {
      await age(); assert.equal((await request()).status, 200);
      let challenge = await db.otpChallenge.findFirst({ orderBy: { id: 'desc' } });
      await db.otpChallenge.update({ where: { id: challenge.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      assert.equal((await verify(sent.at(-1).code)).body.message, 'Kodun istifadə müddəti bitib. Yeni kod göndərin.');
      await db.otpChallenge.update({ where: { id: challenge.id }, data: { expiresAt: new Date(Date.now() + 60000) } });
      const attempts = await Promise.all(Array.from({ length: 8 }, () => verify('000000')));
      assert.equal(attempts.filter(x => x.status === 400).length, 5);
      assert.equal(attempts.filter(x => x.status === 429).length, 3);
      assert.equal((await verify(sent.at(-1).code)).status, 429);
    });
    await t.test('provider failure never confirms delivery and does not permit duplicate retry', async () => {
      const otherPhone = '+994501234568'; sendFailure = true;
      assert.equal((await call('/otp/request', { phone: otherPhone })).status, 503);
      const status = await call('/otp/status?phone=' + encodeURIComponent(otherPhone), null, 'GET');
      assert.equal(status.body.codeSent, false); assert.ok(status.body.retryAfter > 0);
      assert.equal((await call('/otp/request', { phone: otherPhone })).status, 429);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (db) await db.$disconnect();
    // Only the random schema created by this test is removed; public is untouched.
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
});

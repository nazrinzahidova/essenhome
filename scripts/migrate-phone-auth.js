require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const pool = new Pool({ ...require('../backend/lib/dbConfig')(), max: 1 });
(async () => {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout = '5s'");
    await db.query("SET LOCAL statement_timeout = '20s'");
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended('essen:phone-auth-migration', 0))");
    // Older deployments created OtpChallenge without Prisma migration history.
    // Apply only this additive migration; never reset or baseline customer data.
    await db.query(fs.readFileSync(path.join(__dirname, '../backend/prisma/migrations/20260906090000_complete_phone_auth/migration.sql'), 'utf8'));
    await db.query('COMMIT');
    console.log('Phone authentication schema ready (additive migration).');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
})().catch(error => { console.error('Migration failed', { code: error.code, message: error.message }); process.exitCode = 1; }).finally(() => pool.end());

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
async function migrateProductSeo(config = require('../backend/lib/dbConfig')()) {
  const pool = new Pool({ ...config, max: 1 });
  try {
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query("SET LOCAL lock_timeout = '5s'");
      await db.query("SET LOCAL statement_timeout = '20s'");
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended('essen:product-seo-migration', 0))");
      await db.query(fs.readFileSync(path.join(__dirname, '../backend/prisma/migrations/20260909180000_product_seo/migration.sql'), 'utf8'));
      await db.query('COMMIT');
      console.log('Product SEO schema ready (additive migration).');
    } catch (error) {
      await db.query('ROLLBACK'); throw error;
    } finally { db.release(); }
  } finally { await pool.end(); }
}
module.exports = { migrateProductSeo };
if (require.main === module) migrateProductSeo().catch(error => { console.error('Migration failed', { code: error.code, message: error.message }); process.exitCode = 1; });

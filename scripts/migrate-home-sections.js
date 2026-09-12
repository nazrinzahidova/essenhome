require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
async function migrateHomeSections(config = require('../backend/lib/dbConfig')()) {
  const pool = new Pool({ ...config, max: 1 });
  try {
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query("SET LOCAL lock_timeout = '5s'");
      await db.query("SET LOCAL statement_timeout = '20s'");
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended('essen:home-sections-migration', 0))");
      await db.query(fs.readFileSync(path.join(__dirname, '../backend/prisma/migrations/20260909160000_home_sections/migration.sql'), 'utf8'));
      await db.query('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sortPosition" INTEGER NOT NULL DEFAULT 2147483647; ALTER TABLE "HomeSectionProduct" ADD COLUMN IF NOT EXISTS "sortPosition" INTEGER NOT NULL DEFAULT 2147483647');
      await db.query('COMMIT');
      console.log('Home sections schema ready (additive migration).');
    } catch (error) {
      await db.query('ROLLBACK'); throw error;
    } finally { db.release(); }
  } finally { await pool.end(); }
}
module.exports = { migrateHomeSections };
if (require.main === module) migrateHomeSections().catch(error => { console.error('Migration failed', { code: error.code, message: error.message }); process.exitCode = 1; });

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env'), quiet: true });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function migrateVacancies(config = require('../backend/lib/dbConfig')()) {
  const pool = new Pool({ ...config, max: 1 });
  try {
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query("SET LOCAL lock_timeout = '5s'");
      await db.query("SET LOCAL statement_timeout = '20s'");
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended('essen:vacancies', 0))");
      await db.query(fs.readFileSync(path.join(__dirname, '../backend/prisma/migrations/20261110190000_vacancies/migration.sql'), 'utf8'));
      await db.query(fs.readFileSync(path.join(__dirname, '../backend/prisma/migrations/20261110220000_vacancy_notes/migration.sql'), 'utf8'));
      await db.query('COMMIT');
      console.log('Vacancies schema ready (additive migration).');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    } finally { db.release(); }
  } finally { await pool.end(); }
}

module.exports = { migrateVacancies };
if (require.main === module) migrateVacancies().catch(error => {
  console.error('Vacancies migration failed:', error.code || error.name);
  process.exitCode = 1;
});

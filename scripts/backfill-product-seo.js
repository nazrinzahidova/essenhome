require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env'), quiet: true });

const { Pool } = require('pg');

// This is deliberately a one-time backfill. Products saved with blank SEO fields
// afterwards retain the automatic SEO fallback instead of being overwritten later.
async function backfillProductSeo(config = require('../backend/lib/dbConfig')()) {
  const pool = new Pool({ ...config, max: 1 });
  try {
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query("SET LOCAL lock_timeout = '5s'");
      await db.query("SET LOCAL statement_timeout = '20s'");
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended('essen:product-seo-backfill-v1', 0))");
      await db.query('CREATE TABLE IF NOT EXISTS "SeoBackfill" ("name" TEXT PRIMARY KEY, "completedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)');
      const completed = await db.query('SELECT 1 FROM "SeoBackfill" WHERE "name" = $1', ['product-seo-v1']);
      if (!completed.rowCount) {
        const result = await db.query(`
          UPDATE "Product"
          SET
            "seoTitle" = CASE
              WHEN COALESCE(BTRIM("seoTitle"), '') = ''
                THEN LEFT("name" || ' — qiyməti və kreditlə satış | Essen Home', 200)
              ELSE "seoTitle"
            END,
            "seoDescription" = CASE
              WHEN COALESCE(BTRIM("seoDescription"), '') = ''
                THEN LEFT(
                  "name" || ' — ' ||
                  COALESCE(NULLIF(BTRIM("subcategory"), ''), NULLIF(BTRIM("category"), ''), 'məişət texnikası') ||
                  '. Qiymət: ' || TO_CHAR("price", 'FM999999990.00') ||
                  ' AZN. Essen Home-dan nağd və kreditlə sifariş edin.',
                  500
                )
              ELSE "seoDescription"
            END
          WHERE COALESCE(BTRIM("seoTitle"), '') = ''
             OR COALESCE(BTRIM("seoDescription"), '') = ''
        `);
        await db.query('INSERT INTO "SeoBackfill" ("name") VALUES ($1)', ['product-seo-v1']);
        console.log(`Product SEO backfill completed for ${result.rowCount} products.`);
      }
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    } finally {
      db.release();
    }
  } finally {
    await pool.end();
  }
}

module.exports = { backfillProductSeo };

if (require.main === module) {
  backfillProductSeo().catch(error => {
    console.error('Product SEO backfill failed:', error.code || error.message);
    process.exitCode = 1;
  });
}

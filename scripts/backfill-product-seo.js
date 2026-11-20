require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env'), quiet: true });

const { Pool } = require('pg');

// It changes only blank fields, so hand-written SEO metadata always remains intact.
async function backfillProductSeo(config = require('../backend/lib/dbConfig')()) {
  const pool = new Pool({ ...config, max: 1 });
  try {
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query("SET LOCAL lock_timeout = '5s'");
      await db.query("SET LOCAL statement_timeout = '20s'");
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended('essen:product-seo-backfill-v2', 0))");
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
      console.log(`Product SEO backfill updated ${result.rowCount} blank field sets.`);
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

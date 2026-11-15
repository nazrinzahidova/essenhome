require('dotenv').config({path:require('path').join(__dirname,'../backend/.env'),quiet:true});
const {Pool}=require('pg');
async function migrateAnalytics(config=require('../backend/lib/dbConfig')()){
 const pool=new Pool({...config,max:1});try{const db=await pool.connect();try{
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s'");await db.query("SET LOCAL statement_timeout='20s'");await db.query("SELECT pg_advisory_xact_lock(hashtextextended('essen:analytics-v1',0))");
 await db.query(`CREATE TABLE IF NOT EXISTS "AnalyticsStart" (id INTEGER PRIMARY KEY CHECK(id=1),"createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
 await db.query(`INSERT INTO "AnalyticsStart" (id) VALUES(1) ON CONFLICT(id) DO NOTHING`);
 await db.query(`CREATE TABLE IF NOT EXISTS "AnalyticsVisit" (id BIGSERIAL PRIMARY KEY,"visitorHash" VARCHAR(64) NOT NULL,"sessionHash" VARCHAR(64) NOT NULL,"productId" INTEGER,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
 await db.query(`CREATE INDEX IF NOT EXISTS "AnalyticsVisit_createdAt_idx" ON "AnalyticsVisit" ("createdAt")`);
 await db.query(`CREATE INDEX IF NOT EXISTS "AnalyticsVisit_product_date_idx" ON "AnalyticsVisit" ("productId","createdAt")`);
 await db.query('COMMIT');console.log('Analytics storage ready.');
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}}finally{await pool.end();}}
module.exports={migrateAnalytics};if(require.main===module)migrateAnalytics().catch(error=>{console.error('Analytics migration failed:',error.code||error.name);process.exitCode=1;});

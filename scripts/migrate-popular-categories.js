require('dotenv').config({path:require('path').join(__dirname,'../backend/.env'),quiet:true});
const fs=require('node:fs'),path=require('node:path'),{Pool}=require('pg');
async function migratePopularCategories(config=require('../backend/lib/dbConfig')()) {
  const pool=new Pool({...config,max:1});
  try {
    const db=await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query("SET LOCAL lock_timeout='5s'");
      await db.query("SET LOCAL statement_timeout='20s'");
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended('essen:popular-categories',0))");
      const existed=(await db.query(`SELECT to_regclass('"PopularCategory"') AS name`)).rows[0].name;
      await db.query(fs.readFileSync(path.join(__dirname,'../backend/prisma/migrations/20261114233000_popular_categories/migration.sql'),'utf8'));
      if(!existed)for(const [position,card] of require('./popular-category-seeds.json').entries()) {
        await db.query('INSERT INTO "PopularCategory" (name,category,subcategory,image,position) VALUES ($1,$2,$3,$4,$5)',[card.name,card.category,card.subcategory,card.image,position]);
      }
      await db.query('COMMIT');console.log('Popular categories ready.');
    } catch(error) {await db.query('ROLLBACK');throw error;} finally {db.release();}
  } finally {await pool.end();}
}
module.exports={migratePopularCategories};
if(require.main===module)migratePopularCategories().catch(error=>{console.error(error.code||error.name);process.exitCode=1;});

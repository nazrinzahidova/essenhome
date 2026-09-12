require('dotenv').config({path:require('path').join(__dirname,'../backend/.env'),quiet:true});
const {Pool}=require('pg');
async function migrateBrands(config=require('../backend/lib/dbConfig')()){
 const pool=new Pool({...config,max:1});const db=await pool.connect();
 try{
  await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s'");await db.query("SELECT pg_advisory_xact_lock(hashtextextended('essen:brands',0))");
  const existing=await db.query(`SELECT to_regclass('"Brand"') AS table_name`);
  if(!existing.rows[0].table_name){
   await db.query(`CREATE TABLE "Brand" (id SERIAL PRIMARY KEY,name TEXT NOT NULL UNIQUE,image TEXT,"logoData" BYTEA,"logoMime" TEXT,active BOOLEAN NOT NULL DEFAULT false,position INTEGER NOT NULL DEFAULT 1000);
    CREATE UNIQUE INDEX "Brand_name_lower_key" ON "Brand"(lower(name));
    ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY; REVOKE ALL ON "Brand" FROM PUBLIC;
    DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON "Brand" FROM anon; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON "Brand" FROM authenticated; END IF; END $$;`);
   for(const b of require('./brand-seeds.json'))await db.query('INSERT INTO "Brand" (name,image,active,position) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',[b.name,b.image,b.active,b.position]);
   await db.query(`INSERT INTO "Brand"(name) SELECT DISTINCT trim(brand) FROM "Product" WHERE brand IS NOT NULL AND trim(brand)<>'' ON CONFLICT DO NOTHING`);
  }
  await db.query('COMMIT');console.log('Brands schema ready.');
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
}
module.exports={migrateBrands};
if(require.main===module)migrateBrands().catch(e=>{console.error(e.code||e.name);process.exitCode=1;});

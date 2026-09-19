// Additive deployment for existing installations originally provisioned with db push.
require('dotenv').config({path:require('path').join(__dirname,'../.env')});
const {Client}=require('pg');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
async function migrate(){
 const db=new Client(require('../lib/dbConfig')());await db.connect();
 try{
  await db.query('BEGIN');
  await db.query("SELECT pg_advisory_xact_lock(19740919,1)");
  await db.query('CREATE TABLE IF NOT EXISTS "QrCampaignMigration" ("name" TEXT PRIMARY KEY,"checksum" TEXT NOT NULL,"appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  const name='20260919120000_qr_campaign';
  const sql=fs.readFileSync(path.join(__dirname,'../prisma/migrations',name,'migration.sql'),'utf8');
  const checksum=crypto.createHash('sha256').update(sql).digest('hex');
  const applied=(await db.query('SELECT "checksum" FROM "QrCampaignMigration" WHERE "name"=$1',[name])).rows[0];
  if(applied && applied.checksum!==checksum)throw new Error('Applied campaign migration checksum changed');
  if(!applied){
   // If standard Prisma migrations installed it already, verify their checksum.
   const history=(await db.query("SELECT to_regclass('public._prisma_migrations') AS name")).rows[0].name;
   const prismaApplied=history?(await db.query('SELECT checksum FROM "_prisma_migrations" WHERE migration_name=$1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL',[name])).rows[0]:null;
   if(prismaApplied && prismaApplied.checksum!==checksum)throw new Error('Prisma migration checksum mismatch');
   if(!prismaApplied)await db.query(sql);
   await db.query('INSERT INTO "QrCampaignMigration" ("name","checksum") VALUES ($1,$2)',[name,checksum]);
  }
  await require('../lib/campaign').checkKey(db);
  await db.query('COMMIT');console.log('QR campaign migration ready.');
 }catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}
}
module.exports={migrateCampaigns:migrate};
if(require.main===module)migrate().catch(error=>{console.error('Campaign migration failed:',error.code || error.message);process.exitCode=1;});

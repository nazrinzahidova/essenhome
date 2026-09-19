const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const c = require('../lib/campaign');

function createRouter(pool = new Pool({ ...require('../lib/dbConfig')(), max: 2 })) {
  const router = express.Router();
  router.use((req,res,next) => { res.set('Cache-Control','no-store'); next(); });
  const run = fn => async (req,res,next) => { try { await fn(req,res); } catch (e) { next(e); } };
  // Re-read roles from the database, so revoked permissions take effect immediately.
  async function currentUser(req,res,next) {
    try {
      if (!Number.isSafeInteger(req.userId)) throw c.problem(401,'Yenidən daxil olun.');
      const result = await pool.query('SELECT "id","role" FROM "User" WHERE "id"=$1',[req.userId]);
      if (!result.rows[0]) throw c.problem(401,'Yenidən daxil olun.');
      req.campaignUser = result.rows[0]; next();
    } catch(e) { next(e); }
  }
  const signedIn = [auth,currentUser];
  const admin = [...signedIn,(req,res,next) => req.campaignUser.role === 'admin' ? next() : next(c.problem(403,'Admin icazəsi tələb olunur.'))];
  async function throttle(req,kind,max,withUser=false) {
    await c.rateLimit(pool,`${kind}:ip:${req.ip}`,max);
    if (withUser) await c.rateLimit(pool,`${kind}:user:${req.userId}`,10);
  }
  router.get('/sources/:id',run(async(req,res) => {
    const {rows} = await pool.query(`SELECT q."id",q."name",q."campaignId",c."name" AS "campaignName" FROM "QrSource" q JOIN "Campaign" c ON c."id"=q."campaignId" WHERE q."id"=$1 AND q."active" AND c."active"`,[req.params.id]);
    if (!rows[0]) throw c.problem(404,'QR mənbə tapılmadı və ya kampaniya aktiv deyil.');
    res.json(rows[0]);
  }));
  router.post('/sources/:id/scans',run(async(req,res) => {
    await throttle(req,'scan',120);
    await c.checkKey(pool);
    if (!/^[a-f0-9-]{36}$/i.test(req.body?.visitId || '')) throw c.problem(400,'QR sessiyası etibarsızdır.');
    const info = c.deviceInfo(req.get('user-agent'));
    const {rows} = await pool.query(`INSERT INTO "QrScan" ("id","sourceId","visitId","device","browser","os")
      SELECT $1,q."id",$3,$4,$5,$6 FROM "QrSource" q JOIN "Campaign" c ON c."id"=q."campaignId" WHERE q."id"=$2 AND q."active" AND c."active"
      ON CONFLICT ("sourceId","visitId") DO UPDATE SET "visitId"=EXCLUDED."visitId" RETURNING "id"`,[crypto.randomUUID(),req.params.id,req.body.visitId,info.device,info.browser,info.os]);
    if (!rows[0]) throw c.problem(404,'QR mənbə aktiv deyil.');
    res.status(201).json({scanToken:c.scanToken(rows[0].id)});
  }));
  router.post('/claim',...signedIn,run(async(req,res) => {
    const scanId = c.readScan(req.body?.scanToken);
    const {rows} = await pool.query(`UPDATE "QrScan" SET "userId"=$2,"status"=CASE WHEN "status"='scanned' THEN 'registered' ELSE "status" END WHERE "id"=$1 AND ("userId" IS NULL OR "userId"=$2) RETURNING "id"`,[scanId,req.userId]);
    if (!rows.length) throw c.problem(403,'Bu QR sessiyasına giriş icazəsi yoxdur.');
    res.json({success:true});
  }));
  router.get('/me',...signedIn,run(async(req,res) => {
    const {rows}=await pool.query(`SELECT e."id",e."campaignId",e."number",e."status",e."createdAt",c."name" AS "campaignName" FROM "CampaignEntry" e JOIN "Campaign" c ON c."id"=e."campaignId" WHERE e."userId"=$1 ORDER BY e."number" DESC`,[req.userId]);
    res.json(rows.map(row=>({...c.publicEntry(row),campaignName:row.campaignName})));
  }));
  router.post('/activate',...signedIn,run(async(req,res) => {
    await throttle(req,'activate',50,true);
    res.json(await c.activate(pool,req.userId,req.body || {}));
  }));
  router.use('/admin',...admin);
  router.get('/admin/campaigns',run(async(req,res) => {
    res.json((await pool.query('SELECT * FROM "Campaign" ORDER BY "id" DESC')).rows);
  }));
  function name(value) { if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 120) throw c.problem(400,'Ad 2–120 simvol olmalıdır.'); return value.trim(); }
  function id(value) { const n=Number(value); if (!Number.isSafeInteger(n)||n<1) throw c.problem(400,'Yanlış identifikator.'); return n; }
  router.post('/admin/campaigns',run(async(req,res) => {
    await c.checkKey(pool);
    res.status(201).json((await pool.query('INSERT INTO "Campaign" ("name") VALUES ($1) RETURNING *',[name(req.body.name)])).rows[0]);
  }));
  router.patch('/admin/campaigns/:id',run(async(req,res) => {
    if(typeof req.body.active!=='boolean') throw c.problem(400,'Status yanlışdır.');
    const {rows}=await pool.query('UPDATE "Campaign" SET "active"=$2 WHERE "id"=$1 RETURNING *',[id(req.params.id),req.body.active]);
    if(!rows[0]) throw c.problem(404,'Kampaniya tapılmadı.'); res.json(rows[0]);
  }));
  router.get('/admin/sources',run(async(req,res) => {
    res.json((await pool.query('SELECT * FROM "QrSource" WHERE "campaignId"=$1 ORDER BY "createdAt" DESC',[id(req.query.campaignId)])).rows);
  }));
  router.post('/admin/sources',run(async(req,res) => {
    res.status(201).json((await pool.query('INSERT INTO "QrSource" ("id","campaignId","name") VALUES ($1,$2,$3) RETURNING *',[crypto.randomUUID(),id(req.body.campaignId),name(req.body.name)])).rows[0]);
  }));
  router.patch('/admin/sources/:id',run(async(req,res) => {
    if(typeof req.body.active!=='boolean') throw c.problem(400,'Status yanlışdır.');
    const {rows}=await pool.query('UPDATE "QrSource" SET "active"=$2 WHERE "id"=$1 RETURNING *',[req.params.id,req.body.active]);
    if(!rows[0]) throw c.problem(404,'QR mənbə tapılmadı.'); res.json(rows[0]);
  }));
  router.get('/admin/sources/:id/qr',run(async(req,res) => {
    const {rows}=await pool.query('SELECT "id" FROM "QrSource" WHERE "id"=$1',[req.params.id]);
    if(!rows[0]) throw c.problem(404,'QR mənbə tapılmadı.');
    let origin;
    try { origin = new URL(process.env.PUBLIC_SITE_URL); if(!['https:','http:'].includes(origin.protocol)) throw new Error(); } catch { throw c.problem(503,'PUBLIC_SITE_URL təyin edilməlidir.'); }
    const url = new URL('/index.html',origin); url.searchParams.set('campaign',rows[0].id);
    const svg = await require('qrcode').toString(url.href,{type:'svg',errorCorrectionLevel:'M',margin:4,width:320});
    res.json({url:url.href,svg});
  }));
  function filters(req) {
    const values=[id(req.query.campaignId)]; let where='q."campaignId"=$1';
    const add=(sql,value)=>{values.push(value); where+=` AND ${sql.replace('?',`$${values.length}`)}`;};
    if(req.query.source) add('q."id"=?',String(req.query.source));
    for(const field of ['device','browser','os']) if(req.query[field]) add(`s."${field}"=?`,String(req.query[field]).slice(0,30));
    for(const [field,op] of [['from','>='],['to','<']]) if(req.query[field]) {
      if(!/^\d{4}-\d{2}-\d{2}$/.test(req.query[field]) || !Number.isFinite(Date.parse(req.query[field]))) throw c.problem(400,'Tarix yanlışdır.');
      add(`s."createdAt" ${op} ?${field==='to'?"::date + INTERVAL '1 day'":'::date'}`,req.query[field]);
    }
    return {values,where};
  }
  router.get('/admin/stats',run(async(req,res) => {
    const {values,where}=filters(req);
    const {rows}=await pool.query(`SELECT COUNT(*)::int AS scans,COUNT(DISTINCT s."userId")::int AS "registeredUsers",
      COUNT(e."id")::int AS participants,COUNT(e."id") FILTER (WHERE e."status"='active')::int AS active,
      COUNT(e."id") FILTER (WHERE e."status"='cancelled')::int AS cancelled
      FROM "QrScan" s JOIN "QrSource" q ON q."id"=s."sourceId" LEFT JOIN "CampaignEntry" e ON e."scanId"=s."id" WHERE ${where}`,values);
    const groups=await pool.query(`SELECT q."name",q."id",COUNT(*)::int AS scans,COUNT(e."id")::int AS participants FROM "QrScan" s JOIN "QrSource" q ON q."id"=s."sourceId" LEFT JOIN "CampaignEntry" e ON e."scanId"=s."id" WHERE ${where} GROUP BY q."id"`,values);
    res.json({...rows[0],sources:groups.rows});
  }));
  router.get('/admin/:kind',run(async(req,res) => {
    const entries=req.params.kind==='entries';
    if(!entries && req.params.kind!=='scans') throw c.problem(404,'Tapılmadı.');
    const f=filters(req); let where=f.where; const values=f.values;
    if(entries) where+=' AND e."id" IS NOT NULL';
    if(req.query.status) { values.push(String(req.query.status)); where+=` AND ${entries?'e':'s'}."status"=$${values.length}`; }
    if(req.query.q) {
      const search=String(req.query.q).trim().slice(0,120); values.push(`%${search}%`);
      where+=` AND (u."name" ILIKE $${values.length} OR u."email" ILIKE $${values.length} OR u."phone" ILIKE $${values.length} OR ('K-' || CASE WHEN LENGTH(e."number"::text)<7 THEN LPAD(e."number"::text,7,'0') ELSE e."number"::text END) ILIKE $${values.length})`;
    }
    const page=Math.max(1,Math.min(100000,Number.parseInt(req.query.page,10)||1));
    const joins=`FROM "QrScan" s JOIN "QrSource" q ON q."id"=s."sourceId" LEFT JOIN "CampaignEntry" e ON e."scanId"=s."id" LEFT JOIN "User" u ON u."id"=${entries?'e':'s'}."userId" WHERE ${where}`;
    const total=(await pool.query(`SELECT COUNT(*)::int AS total ${joins}`,values)).rows[0].total;
    const {rows}=await pool.query(`SELECT s."id" AS "scanId",s."device",s."browser",s."os",s."createdAt" AS "scannedAt",s."status" AS "scanStatus",q."name" AS source,u."name",u."email",u."phone",e."id",e."number",e."finMasked",e."status",e."createdAt" ${joins} ORDER BY ${entries?'e."number"':'s."createdAt"'} DESC LIMIT 50 OFFSET $${values.length+1}`,[...values,(page-1)*50]);
    res.json({total,page,items:rows.map(({number,...row})=>({...row,participantNumber:number?c.number(number):null}))});
  }));
  router.patch('/admin/entries/:id',run(async(req,res) => {
    if(!['active','cancelled'].includes(req.body.status)) throw c.problem(400,'Status yanlışdır.');
    const {rows}=await pool.query('UPDATE "CampaignEntry" SET "status"=$2 WHERE "id"=$1 RETURNING "id","number","status","campaignId","createdAt"',[id(req.params.id),req.body.status]);
    if(!rows[0]) throw c.problem(404,'İştirakçı tapılmadı.'); res.json(c.publicEntry(rows[0]));
  }));
  router.use((error,req,res,next) => {
    // Never log request bodies, SQL parameters, FINs or deduplication hashes.
    if(!error.status) console.error('Campaign request failed:',error.code || 'INTERNAL');
    if(error.status===429) res.set('Retry-After','900');
    res.status(error.status || 503).json({message:error.status ? error.message : 'Kampaniya xidməti hazır deyil. Bir qədər sonra yenidən cəhd edin.'});
  });
  return router;
}
module.exports=createRouter;

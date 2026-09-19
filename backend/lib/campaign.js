const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const DUPLICATE_FIN = 'Eyni FIN kod yalnız bir dəfə istifadə oluna bilər.';
function problem(status, message) { return Object.assign(new Error(message), { status }); }
function normalizeFin(value) {
  if (typeof value !== 'string' || value.length > 32) throw problem(400, 'FIN kod 7 hərf və rəqəmdən ibarət olmalıdır (I və O istisna).');
  const fin = value.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z0-9]{7}$/.test(fin)) throw problem(400, 'FIN kod 7 hərf və rəqəmdən ibarət olmalıdır (I və O istisna).');
  return fin;
}
function secret() {
  const value = process.env.CAMPAIGN_HMAC_SECRET;
  if (!value || Buffer.byteLength(value) < 32) throw problem(503, 'Kampaniya konfiqurasiyası tamamlanmayıb.');
  return value;
}
function hash(value) { return crypto.createHmac('sha256', secret()).update(value).digest('hex'); }
async function checkKey(db) {
  const fingerprint = hash('campaign-key-check-v1');
  await db.query('INSERT INTO "CampaignConfig" ("id", "keyFingerprint") VALUES (1,$1) ON CONFLICT DO NOTHING', [fingerprint]);
  const { rows } = await db.query('SELECT "keyFingerprint" FROM "CampaignConfig" WHERE "id"=1');
  if (rows[0].keyFingerprint !== fingerprint) throw problem(503, 'Kampaniya açarı dəyişib. Əvvəlki açarı bərpa edin.');
}
function number(value) { return `K-${String(value).padStart(7, '0')}`; }
function publicEntry(row) { return { id: row.id, campaignId: row.campaignId, participantNumber: number(row.number), status: row.status, createdAt: row.createdAt }; }
function scanToken(id) { return jwt.sign({ scanId: id, purpose: 'campaign-scan' }, secret(), { expiresIn: '30d', algorithm: 'HS256' }); }
function readScan(token) {
  try {
    const data = jwt.verify(token, secret(), { algorithms: ['HS256'] });
    if (data.purpose !== 'campaign-scan' || typeof data.scanId !== 'string') throw new Error();
    return data.scanId;
  } catch { throw problem(400, 'QR keçidini yenidən açın.'); }
}
function deviceInfo(ua = '') {
  ua = ua.slice(0, 1000);
  return {
    device: /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop',
    browser: /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Other',
    os: /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other'
  };
}
async function rateLimit(db, key, maximum, minutes = 15) {
  const result = await db.query(`INSERT INTO "CampaignRateLimit" ("key","count","expiresAt") VALUES ($1,1,NOW()+($2 * INTERVAL '1 minute'))
    ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "CampaignRateLimit"."expiresAt" <= NOW() THEN 1 ELSE "CampaignRateLimit"."count"+1 END,
    "expiresAt"=CASE WHEN "CampaignRateLimit"."expiresAt" <= NOW() THEN EXCLUDED."expiresAt" ELSE "CampaignRateLimit"."expiresAt" END RETURNING "count"`, [hash(`rate:${key}`), minutes]);
  if (result.rows[0].count > maximum) throw problem(429, 'Cəhd limiti dolub. Bir qədər sonra yenidən cəhd edin.');
}
async function activate(pool, userId, body) {
  const fin = normalizeFin(body.fin);
  const scanId = readScan(body.scanToken);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await checkKey(db);
    // Locks campaign activity, source activity and scan ownership during activation.
    const { rows } = await db.query(`SELECT s.*, q."campaignId", q."active" AS "sourceActive", c."active" AS "campaignActive"
      FROM "QrScan" s JOIN "QrSource" q ON q."id"=s."sourceId" JOIN "Campaign" c ON c."id"=q."campaignId"
      WHERE s."id"=$1 FOR UPDATE OF s FOR SHARE OF q,c`, [scanId]);
    const scan = rows[0];
    if (!scan || (scan.userId && scan.userId !== userId)) throw problem(403, 'Bu QR sessiyasına giriş icazəsi yoxdur.');
    const existing = await db.query('SELECT * FROM "CampaignEntry" WHERE "campaignId"=$1 AND "userId"=$2', [scan.campaignId, userId]);
    if (existing.rows[0]) { await db.query('COMMIT'); return publicEntry(existing.rows[0]); }
    if (!scan.sourceActive || !scan.campaignActive) throw problem(409, 'Kampaniya və ya QR mənbə aktiv deyil.');
    const finHash = hash(`fin:v1:${scan.campaignId}:${fin}`);
    // One durable counter serializes successful registrations. Rollbacks consume no number.
    await db.query('SELECT "value" FROM "CampaignCounter" WHERE "id"=1 FOR UPDATE');
    const duplicate = await db.query('SELECT "userId", "finHash" FROM "CampaignEntry" WHERE "campaignId"=$1 AND ("finHash"=$2 OR "userId"=$3)', [scan.campaignId, finHash, userId]);
    if (duplicate.rows.some(row => row.userId === userId)) {
      const own = await db.query('SELECT * FROM "CampaignEntry" WHERE "campaignId"=$1 AND "userId"=$2', [scan.campaignId,userId]);
      await db.query('COMMIT'); return publicEntry(own.rows[0]);
    }
    if (duplicate.rows.length) throw problem(409, DUPLICATE_FIN);
    const counter = await db.query('UPDATE "CampaignCounter" SET "value"="value"+1 WHERE "id"=1 RETURNING "value"');
    const entry = await db.query(`INSERT INTO "CampaignEntry" ("campaignId","userId","scanId","finHash","finMasked","number") VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [scan.campaignId,userId,scanId,finHash,`*****${fin.slice(-2)}`,counter.rows[0].value]);
    await db.query('UPDATE "QrScan" SET "userId"=$2,"status"=\'activated\' WHERE "id"=$1', [scanId,userId]);
    await db.query('COMMIT'); return publicEntry(entry.rows[0]);
  } catch (error) { await db.query('ROLLBACK'); if (error.code === '23505') throw problem(409, DUPLICATE_FIN); throw error; }
  finally { db.release(); }
}
module.exports = { normalizeFin, hash, checkKey, number, publicEntry, scanToken, readScan, deviceInfo, rateLimit, activate, problem };

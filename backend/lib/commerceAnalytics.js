const crypto = require('node:crypto');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const kinds = new Set(['add_to_cart', 'begin_checkout', 'whatsapp_click']);
const sources = new Set(['home', 'product', 'catalog', 'cart', 'favourites', 'vacancies', 'corporate', 'wholesale', 'other']);
const cookie = (req, name) => (req.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'))?.[1];
const hash = value => crypto.createHash('sha256').update('essen-analytics-v1:' + value).digest('hex');
function validateEvent(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['id','kind','productId','quantity','source'].includes(key))) return null;
  if (!UUID.test(body.id || '') || !kinds.has(body.kind) || !sources.has(body.source)) return null;
  const productId = body.productId ?? null;
  if (productId !== null && (!Number.isInteger(productId) || productId < 1 || productId > 2147483647)) return null;
  if (body.kind === 'add_to_cart' && (productId === null || !Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 20)) return null;
  if (body.kind !== 'add_to_cart' && body.quantity !== undefined) return null;
  return {id:body.id, kind:body.kind, source:body.source, productId, quantity:body.kind === 'add_to_cart' ? body.quantity : 0};
}
function createEventHandler(db) {
  const limits = new Map();
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!['https://essenhome.az','https://www.essenhome.az'].includes(req.get('origin')) || (req.get('sec-fetch-site') && req.get('sec-fetch-site') !== 'same-origin')) return res.sendStatus(403);
    if (cookie(req, 'eh_analytics_off') === '1' || req.get('dnt') === '1' || /bot|crawler|spider|headlesschrome|lighthouse/i.test(req.get('user-agent') || '')) return res.sendStatus(204);
    const visitor = cookie(req, 'eh_av');
    if (!UUID.test(visitor || '')) return res.sendStatus(204);
    const previousSession = cookie(req, 'eh_as'), session = UUID.test(previousSession || '') ? previousSession : crypto.randomUUID();
    const event = validateEvent(req.body);
    if (!event) return res.status(400).json({message:'Hadisə düzgün deyil.'});
    const visitorHash = hash(visitor), now = Date.now();
    for (const [key, limit] of limits) if (limit.until <= now) limits.delete(key);
    const limit = limits.get(visitorHash) || {count:0, until:now + 600000};
    if (limit.count >= 240 || (!limits.has(visitorHash) && limits.size >= 10000)) return res.sendStatus(429);
    limit.count++; limits.set(visitorHash, limit);
    try {
      if (event.productId && !await db.product.findUnique({where:{id:event.productId}, select:{id:true}})) return res.sendStatus(400);
      await db.$executeRaw`INSERT INTO "AnalyticsEvent" (id,kind,"visitorHash","sessionHash","productId",quantity,source) VALUES (${event.id}::uuid,${event.kind},${visitorHash},${hash(session)},${event.productId},${event.quantity},${event.source}) ON CONFLICT (id) DO NOTHING`;
      const secure=req.secure||req.get('x-forwarded-proto')==='https'||process.env.NODE_ENV==='production';
      res.append('Set-Cookie',`eh_as=${session}; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax${secure?'; Secure':''}`);
      return res.sendStatus(204);
    } catch (error) {
      console.warn('Commerce analytics event failed:', error.code || error.name);
      return res.sendStatus(503);
    }
  };
}

// Order timestamps are Prisma UTC TIMESTAMP(3); analytics timestamps are TIMESTAMPTZ.
const visitRange = `"createdAt" >= ($1::date::timestamp AT TIME ZONE 'Asia/Baku') AND "createdAt" < ((($2::date)+1)::timestamp AT TIME ZONE 'Asia/Baku')`;
const orderRange = column => `o."${column}" >= (($1::date::timestamp AT TIME ZONE 'Asia/Baku') AT TIME ZONE 'UTC') AND o."${column}" < (((($2::date)+1)::timestamp AT TIME ZONE 'Asia/Baku') AT TIME ZONE 'UTC')`;
const orderDay = column => `to_char((o."${column}" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baku','YYYY-MM-DD')`;
const empty = () => ({cartAdds:0,cartQuantity:0,checkoutStarts:0,whatsappClicks:0,orders:0,sales:0,revenue:0,cancelled:0,returned:0});
async function loadCommerceReport(db, from, to) {
  const query = sql => db.$queryRawUnsafe(sql, from, to);
  const [events, orders, sales, products, started] = await Promise.all([
    query(`SELECT to_char("createdAt" AT TIME ZONE 'Asia/Baku','YYYY-MM-DD') AS date, COUNT(*) FILTER(WHERE kind='add_to_cart')::int AS "cartAdds", COALESCE(SUM(quantity) FILTER(WHERE kind='add_to_cart'),0)::int AS "cartQuantity", COUNT(*) FILTER(WHERE kind='begin_checkout')::int AS "checkoutStarts", COUNT(*) FILTER(WHERE kind='whatsapp_click')::int AS "whatsappClicks" FROM "AnalyticsEvent" WHERE ${visitRange} GROUP BY 1`),
    query(`SELECT ${orderDay('createdAt')} AS date, COUNT(*)::int AS orders, COUNT(*) FILTER(WHERE o.status='cancelled')::int AS cancelled, COUNT(*) FILTER(WHERE o.status='returned')::int AS returned FROM "Order" o WHERE ${orderRange('createdAt')} GROUP BY 1`),
    query(`SELECT ${orderDay('deliveredAt')} AS date, COUNT(*)::int AS sales, COALESCE(SUM(ROUND((o.total-o."shippingFee")::numeric,2)),0)::float8 AS revenue FROM "Order" o WHERE o.status='delivered' AND ${orderRange('deliveredAt')} GROUP BY 1`),
    query(`WITH events AS (SELECT "productId", COUNT(*) FILTER(WHERE kind='add_to_cart')::int AS "cartAdds", COALESCE(SUM(quantity) FILTER(WHERE kind='add_to_cart'),0)::int AS "cartQuantity", COUNT(*) FILTER(WHERE kind='whatsapp_click')::int AS "whatsappClicks" FROM "AnalyticsEvent" WHERE "productId" IS NOT NULL AND ${visitRange} GROUP BY 1), orders AS (SELECT i."productId",COUNT(DISTINCT o.id)::int AS orders FROM "Order" o JOIN "OrderItem" i ON i."orderId"=o.id WHERE ${orderRange('createdAt')} GROUP BY 1), sales AS (SELECT i."productId",SUM(i.quantity)::int AS "unitsSold",SUM(ROUND(i.price::numeric,2)*i.quantity)::float8 AS revenue FROM "Order" o JOIN "OrderItem" i ON i."orderId"=o.id WHERE o.status='delivered' AND ${orderRange('deliveredAt')} GROUP BY 1), ids AS (SELECT "productId" FROM events UNION SELECT "productId" FROM orders UNION SELECT "productId" FROM sales) SELECT ids."productId",COALESCE(e."cartAdds",0)::int AS "cartAdds",COALESCE(e."cartQuantity",0)::int AS "cartQuantity",COALESCE(e."whatsappClicks",0)::int AS "whatsappClicks",COALESCE(o.orders,0)::int AS orders,COALESCE(s."unitsSold",0)::int AS "unitsSold",COALESCE(s.revenue,0)::float8 AS revenue FROM ids LEFT JOIN events e USING("productId") LEFT JOIN orders o USING("productId") LEFT JOIN sales s USING("productId")`),
    db.$queryRaw`SELECT "createdAt" FROM "AnalyticsCommerceStart" WHERE id=1`
  ]);
  const days = new Map();
  for (const rows of [events, orders, sales]) for (const row of rows) days.set(row.date, {...(days.get(row.date) || empty()), ...row});
  const summary = empty();
  for (const day of days.values()) for (const key of Object.keys(summary)) summary[key] += Number(day[key]) || 0;
  summary.revenue = Math.round(summary.revenue * 100) / 100;
  return {summary, daily:[...days].map(([date,values]) => ({date,...values})), products, startedAt:started[0]?.createdAt || null};
}
module.exports = {createEventHandler, validateEvent, loadCommerceReport};

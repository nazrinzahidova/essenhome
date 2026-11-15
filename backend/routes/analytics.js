const express=require('express');
const crypto=require('node:crypto');
const auth=require('../middleware/auth');
const admin=require('../middleware/adminCheck');
const {createEventHandler,loadCommerceReport}=require('../lib/commerceAnalytics');
const timezone='Asia/Baku';
function today(){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
function period(query){const end=today(),from=query.from||end,to=query.to||end;if(!validDate(from)||!validDate(to)||from>to||to>end||Date.parse(to)-Date.parse(from)>365*86400000)throw Error('Tarixləri düzgün seçin. Maksimum tarix aralığı 366 gündür.');return {from,to,today:end,timezone};}
function productId(req){const match=req.path.match(/^\/[a-z0-9-]+\/[a-z0-9-]+-([1-9]\d*)\/?$/);const value=match?.[1]||(/^\/(?:ru\/)?product\.html$/.test(req.path)?req.query.id:null);const id=Number(value);return Number.isSafeInteger(id)&&id>0&&id<=2147483647?id:null;}
function eligible(req){
  const ua=req.get('user-agent')||'',destination=req.get('sec-fetch-dest'),mode=req.get('sec-fetch-mode');
  const host=String(req.get('x-forwarded-host')||req.get('host')||'').split(',')[0].trim().split(':')[0].toLowerCase();if(!['essenhome.az','www.essenhome.az'].includes(host))return false;
  return req.method==='GET'&&/text\/html/i.test(req.get('accept')||'')&&(!destination||destination==='document')&&(!mode||mode==='navigate')&&!!ua&&!/bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headlesschrome|lighthouse|uptime|pingdom/i.test(ua)&&!req.get('purpose')?.includes('prefetch')&&!req.get('sec-purpose')?.includes('prefetch')&&req.get('dnt')!=='1'&&!/^\/(?:api|admin|uploads|img|src)(?:[/.]|$)/.test(req.path)&&!/^\/(?:orders|profile)\.html$/.test(req.path+'')&& !/\.(?!html(?:$|\/))[a-z0-9]{1,8}$/i.test(req.path)&&req.query.admin!=='1'&&!/(?:^|;\s*)eh_analytics_off=1(?:;|$)/.test(req.get('cookie')||'');
}
function createAnalyticsMiddleware(db){return (req,res,next)=>{
  if(!eligible(req))return next();
  const cookies=req.get('cookie')||'',uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const read=name=>cookies.match(new RegExp('(?:^|;\\s*)'+name+'=([^;]+)'))?.[1];
  const visitor=uuid.test(read('eh_av')||'')?read('eh_av'):crypto.randomUUID(),session=uuid.test(read('eh_as')||'')?read('eh_as'):crypto.randomUUID();
  const secure=req.secure||req.get('x-forwarded-proto')==='https'||process.env.NODE_ENV==='production';
  const cookie=(name,value,age)=>`${name}=${value}; Path=/; Max-Age=${age}; HttpOnly; SameSite=Lax${secure?'; Secure':''}`;
  res.set('Cache-Control','private, no-cache');res.append('Set-Cookie',[cookie('eh_av',visitor,31536000),cookie('eh_as',session,1800)]);
  const hash=value=>crypto.createHash('sha256').update('essen-analytics-v1:'+value).digest('hex');
  const visitorHash=hash(visitor),sessionHash=hash(session),id=productId(req);
  res.once('finish',()=>{
    if(!((res.statusCode>=200&&res.statusCode<300)||res.statusCode===304))return;
    if(res.statusCode!==304&&!/^text\/html/i.test(String(res.getHeader('Content-Type')||'')))return;
    (async()=>{if(id&&!await db.product.findUnique({where:{id},select:{id:true}}))return;await db.$executeRaw`INSERT INTO "AnalyticsVisit" ("visitorHash","sessionHash","productId") VALUES (${visitorHash},${sessionHash},${id})`;})().catch(error=>console.warn('Analytics recording failed:',error.code||error.name));
  });
  next();
};}
function createAnalyticsRouter(db){
  const router=express.Router();router.post('/events',createEventHandler(db));router.use(auth,admin);
  router.get('/',async(req,res)=>{
    res.set('Cache-Control','no-store');let range;
    try{range=period(req.query);}catch(error){return res.status(400).json({message:error.message});}
    const {from,to}=range,q=String(req.query.q||'').trim().slice(0,100),pattern='%'+q+'%',page=Math.min(100000,Math.max(1,parseInt(req.query.page,10)||1)),pageSize=20,offset=(page-1)*pageSize;
    try{
      const [summary,daily,items,total,started,commerce]=await Promise.all([
        db.$queryRaw`SELECT COUNT(DISTINCT "visitorHash")::int AS visitors,COUNT(DISTINCT "sessionHash")::int AS sessions,COUNT(*)::int AS "pageViews",COUNT("productId")::int AS "productViews" FROM "AnalyticsVisit" WHERE "createdAt">=(${from}::date::timestamp AT TIME ZONE 'Asia/Baku') AND "createdAt"<(((${to}::date)+1)::timestamp AT TIME ZONE 'Asia/Baku')`,
        db.$queryRaw`WITH days AS (SELECT generate_series(${from}::date,${to}::date,'1 day'::interval) AS day), stats AS (SELECT ("createdAt" AT TIME ZONE 'Asia/Baku')::date AS day,COUNT(DISTINCT "visitorHash")::int AS visitors,COUNT(*)::int AS "pageViews",COUNT("productId")::int AS "productViews" FROM "AnalyticsVisit" WHERE "createdAt">=(${from}::date::timestamp AT TIME ZONE 'Asia/Baku') AND "createdAt"<(((${to}::date)+1)::timestamp AT TIME ZONE 'Asia/Baku') GROUP BY 1) SELECT to_char(days.day,'YYYY-MM-DD') AS date,COALESCE(stats.visitors,0)::int AS visitors,COALESCE(stats."pageViews",0)::int AS "pageViews",COALESCE(stats."productViews",0)::int AS "productViews" FROM days LEFT JOIN stats ON stats.day=days.day::date ORDER BY days.day`,
        db.$queryRaw`WITH stats AS (SELECT "productId",COUNT(*)::int AS views,COUNT(DISTINCT "visitorHash")::int AS visitors FROM "AnalyticsVisit" WHERE "productId" IS NOT NULL AND "createdAt">=(${from}::date::timestamp AT TIME ZONE 'Asia/Baku') AND "createdAt"<(((${to}::date)+1)::timestamp AT TIME ZONE 'Asia/Baku') GROUP BY "productId") SELECT p.id,p.name,p.image,COALESCE(s.views,0)::int AS views,COALESCE(s.visitors,0)::int AS visitors FROM "Product" p LEFT JOIN stats s ON s."productId"=p.id WHERE (${q}='' OR p.name ILIKE ${pattern} OR p.brand ILIKE ${pattern}) ORDER BY COALESCE(s.views,0) DESC,COALESCE(s.visitors,0) DESC,p.id DESC LIMIT ${pageSize} OFFSET ${offset}`,
        db.product.count({where:q?{OR:[{name:{contains:q,mode:'insensitive'}},{brand:{contains:q,mode:'insensitive'}}]}:{}}),
        db.$queryRaw`SELECT "createdAt" FROM "AnalyticsStart" WHERE id=1`,
        loadCommerceReport(db,from,to)
      ]);
      const productMetrics=new Map(commerce.products.map(item=>[item.productId,item]));
      res.json({period:range,summary:summary[0]||{visitors:0,sessions:0,pageViews:0,productViews:0},daily,products:{items:items.map(item=>({...item,commerce:productMetrics.get(item.id)||{cartAdds:0,cartQuantity:0,whatsappClicks:0,orders:0,unitsSold:0,revenue:0}})),total,page,pageSize},startedAt:started[0]?.createdAt||null,commerce:{summary:commerce.summary,daily:commerce.daily,startedAt:commerce.startedAt}});
    }catch(error){console.error('Analytics report failed:',error.code||error.name);res.status(503).json({message:'Analitika yüklənmədi. Yenidən cəhd edin.'});}
  });return router;
}
module.exports={createAnalyticsMiddleware,createAnalyticsRouter,eligible,productId,period,validDate};

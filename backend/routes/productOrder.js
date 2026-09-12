const express=require('express'),auth=require('../middleware/auth'),admin=require('../middleware/adminCheck');
function createProductOrderRouter(db){
 const router=express.Router();router.use(auth,admin);router.use((req,res,next)=>{res.set('Cache-Control','no-store');const scope=req.query.section;req.sectionId=scope===undefined?null:Number(scope);if(scope!==undefined&&(!Number.isSafeInteger(req.sectionId)||req.sectionId<1))return res.status(400).json({message:'Bölmə düzgün deyil.'});next();});
 async function rows(tx,sectionId){
  if(sectionId===null)return tx.product.findMany({orderBy:[{sortPosition:'asc'},{createdAt:'desc'},{id:'desc'}],select:{id:true,name:true}});
  await tx.homeSection.findUniqueOrThrow({where:{id:sectionId},select:{id:true}});
  const links=await tx.homeSectionProduct.findMany({where:{sectionId},orderBy:[{sortPosition:'asc'},{productId:'asc'}],include:{product:{select:{id:true,name:true}}}});return links.map(l=>l.product);
 }
 const run=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.code==='P2025'?404:503).json({message:e.code==='P2025'?'Bölmə tapılmadı.':'Sıralama saxlanmadı. Yenidən cəhd edin.'});}};
 router.get('/',run(async(req,res)=>res.json({items:await rows(db,req.sectionId)})));
 router.put('/',run(async(req,res)=>{
  const {ids,originalIds}=req.body||{};
  const valid=a=>Array.isArray(a)&&a.length<=20000&&a.every(n=>Number.isSafeInteger(n)&&n>0)&&new Set(a).size===a.length;
  if(!valid(ids)||!valid(originalIds))return res.status(400).json({message:'Məhsul siyahısı düzgün deyil.'});
  const saved=await db.$transaction(async tx=>{
   await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(846231, $1::integer)',req.sectionId||0);
   const current=(await rows(tx,req.sectionId)).map(p=>p.id);
   if(current.length!==ids.length||current.some((id,i)=>originalIds[i]!==id)||originalIds.length!==current.length||ids.some(id=>!current.includes(id)))return false;
   const ranks=JSON.stringify(ids.map((id,position)=>({id,position})));
   if(req.sectionId===null)await tx.$executeRawUnsafe('UPDATE "Product" p SET "sortPosition"=r.position FROM jsonb_to_recordset($1::jsonb) AS r(id integer,position integer) WHERE p.id=r.id',ranks);
   else await tx.$executeRawUnsafe('UPDATE "HomeSectionProduct" p SET "sortPosition"=r.position FROM jsonb_to_recordset($1::jsonb) AS r(id integer,position integer) WHERE p."productId"=r.id AND p."sectionId"=$2',ranks,req.sectionId);
   return true;
  },{timeout:20000});
  res.status(saved?200:409).json(saved?{ok:true}:{message:'Siyahı dəyişib. Pəncərəni yenidən açıb cəhd edin.'});
 }));return router;
}
module.exports={createProductOrderRouter};
